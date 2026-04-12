import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptPhone } from "@/lib/phone";
import { logCalendarDisconnect } from "@/lib/telegram";

// ─── Token management ────────────────────────────────────────────────────────

export async function getValidMicrosoftAccessToken(
  conn: { access_token: string; refresh_token: string | null; token_expires_at: string | null },
  businessId: string
): Promise<string | null> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 60_000;

  if (!isExpired) return conn.access_token;
  if (!conn.refresh_token) return null;

  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: conn.refresh_token,
        grant_type:    "refresh_token",
        scope:         "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
      }),
    }
  );

  if (!res.ok) {
    await supabaseAdmin
      .from("calendar_connections")
      .update({ is_active: false })
      .eq("business_id", businessId)
      .eq("provider", "microsoft");
    void logCalendarDisconnect("microsoft", businessId, null, `Token refresh failed: HTTP ${res.status}`);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();

  await supabaseAdmin
    .from("calendar_connections")
    .update({ access_token: data.access_token, token_expires_at: newExpiry })
    .eq("business_id", businessId)
    .eq("provider", "microsoft");

  return data.access_token;
}

// ─── Sync a booking to Microsoft Calendar ────────────────────────────────────

export async function syncBookingToMicrosoft(
  businessId: string,
  bookingId: string
): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string; microsoft_event_id?: string }> {
  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("business_id", businessId)
    .eq("provider", "microsoft")
    .eq("is_active", true)
    .single();

  if (!conn) return { success: false, skipped: true, reason: "no_connection" };

  const accessToken = await getValidMicrosoftAccessToken(conn, businessId);
  if (!accessToken) return { success: false, error: "Token refresh failed" };

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_phone_encrypted, service_name, service_duration_minutes, appointment_at, notes, microsoft_event_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return { success: false, error: "Booking not found" };

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("booking_timezone")
    .eq("id", businessId)
    .single();

  const timezone = business?.booking_timezone ?? "UTC";
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vomni.io";

  const startLocal = booking.appointment_at.slice(0, 19);
  const endLocal   = new Date(
    new Date(booking.appointment_at).getTime() + (booking.service_duration_minutes ?? 60) * 60_000
  ).toISOString().slice(0, 19);

  const realPhone = booking.customer_phone_encrypted
    ? (() => { try { return decryptPhone(booking.customer_phone_encrypted); } catch { return booking.customer_phone ?? ""; } })()
    : (booking.customer_phone ?? "");

  const eventBody = {
    subject: `${booking.customer_name} — ${booking.service_name}`,
    body: {
      contentType: "text",
      content: [
        `Customer: ${booking.customer_name}`,
        `Phone: ${realPhone}`,
        booking.notes ? `Notes: ${booking.notes}` : null,
        ``,
        `Manage: ${appUrl}/dashboard/calendar`,
        `vomni-booking:${booking.id}`,
      ].filter(Boolean).join("\n"),
    },
    start:        { dateTime: startLocal, timeZone: timezone },
    end:          { dateTime: endLocal,   timeZone: timezone },
    isReminderOn: true,
  };

  let microsoftEventId: string | null = booking.microsoft_event_id ?? null;

  if (microsoftEventId) {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${microsoftEventId}`,
      {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify(eventBody),
      }
    );
    if (!res.ok) microsoftEventId = null; // deleted on Microsoft side — create fresh
  }

  if (!microsoftEventId) {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method:  "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[microsoft-calendar-sync] create event failed:", err);
      return { success: false, error: `Microsoft Graph API error: ${res.status}` };
    }

    const created = await res.json() as { id: string };
    microsoftEventId = created.id;

    await supabaseAdmin
      .from("bookings")
      .update({ microsoft_event_id: microsoftEventId })
      .eq("id", bookingId);
  }

  return { success: true, microsoft_event_id: microsoftEventId! };
}

// ─── Remove a booking from Microsoft Calendar ────────────────────────────────

export async function removeBookingFromMicrosoft(
  businessId: string,
  bookingId: string
): Promise<{ success: boolean; skipped?: boolean }> {
  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("business_id", businessId)
    .eq("provider", "microsoft")
    .eq("is_active", true)
    .single();

  if (!conn) return { success: false, skipped: true };

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("microsoft_event_id")
    .eq("id", bookingId)
    .single();

  if (!booking?.microsoft_event_id) return { success: false, skipped: true };

  const accessToken = await getValidMicrosoftAccessToken(conn, businessId);
  if (!accessToken) return { success: false };

  await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${booking.microsoft_event_id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );

  await supabaseAdmin
    .from("bookings")
    .update({ microsoft_event_id: null })
    .eq("id", bookingId);

  return { success: true };
}
