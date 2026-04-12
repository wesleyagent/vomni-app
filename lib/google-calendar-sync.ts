import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptPhone } from "@/lib/phone";
import { logCalendarDisconnect } from "@/lib/telegram";

// ─── Token management ────────────────────────────────────────────────────────

export async function getValidGoogleAccessToken(
  conn: { access_token: string; refresh_token: string | null; token_expires_at: string | null },
  businessId: string
): Promise<string | null> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 60_000;

  if (!isExpired) return conn.access_token;
  if (!conn.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    await supabaseAdmin
      .from("calendar_connections")
      .update({ is_active: false })
      .eq("business_id", businessId)
      .eq("provider", "google");
    void logCalendarDisconnect("google", businessId, null, `Token refresh failed: HTTP ${res.status}`);
    return null;
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();

  await supabaseAdmin
    .from("calendar_connections")
    .update({ access_token: data.access_token, token_expires_at: newExpiry })
    .eq("business_id", businessId)
    .eq("provider", "google");

  return data.access_token;
}

// ─── Sync a booking to Google Calendar ───────────────────────────────────────

export async function syncBookingToGoogle(
  businessId: string,
  bookingId: string
): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string; google_event_id?: string }> {
  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", businessId)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (!conn) return { success: false, skipped: true, reason: "no_connection" };

  const accessToken = await getValidGoogleAccessToken(conn, businessId);
  if (!accessToken) return { success: false, error: "Token refresh failed" };

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_phone_encrypted, service_name, service_duration_minutes, appointment_at, notes, staff_id, google_event_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return { success: false, error: "Booking not found" };

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("booking_timezone")
    .eq("id", businessId)
    .single();

  const timezone   = business?.booking_timezone ?? "UTC";
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vomni.io";
  const calendarId = conn.calendar_id ?? "primary";

  const startLocal = booking.appointment_at.slice(0, 19);
  const endLocal   = new Date(
    new Date(booking.appointment_at).getTime() + (booking.service_duration_minutes ?? 60) * 60_000
  ).toISOString().slice(0, 19);

  const realPhone = booking.customer_phone_encrypted
    ? (() => { try { return decryptPhone(booking.customer_phone_encrypted); } catch { return booking.customer_phone ?? ""; } })()
    : (booking.customer_phone ?? "");

  const eventBody = {
    summary:     `${booking.customer_name} — ${booking.service_name}`,
    description: [
      `Customer: ${booking.customer_name}`,
      `Phone: ${realPhone}`,
      booking.notes ? `Notes: ${booking.notes}` : null,
      ``,
      `Manage: ${appUrl}/dashboard/calendar`,
      `vomni-booking:${booking.id}`,
    ].filter(Boolean).join("\n"),
    start:     { dateTime: startLocal, timeZone: timezone },
    end:       { dateTime: endLocal,   timeZone: timezone },
    reminders: { useDefault: true },
  };

  let googleEventId: string | null = booking.google_event_id ?? null;

  if (googleEventId) {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
      {
        method:  "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify(eventBody),
      }
    );
    if (!res.ok) googleEventId = null; // deleted on Google side — create fresh
  }

  if (!googleEventId) {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify(eventBody),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[google-calendar-sync] create event failed:", err);
      return { success: false, error: `Google API error: ${res.status}` };
    }

    const created = await res.json();
    googleEventId = created.id as string;

    await supabaseAdmin
      .from("bookings")
      .update({ google_event_id: googleEventId })
      .eq("id", bookingId);
  }

  return { success: true, google_event_id: googleEventId! };
}

// ─── Remove a booking from Google Calendar ───────────────────────────────────

export async function removeBookingFromGoogle(
  businessId: string,
  bookingId: string
): Promise<{ success: boolean; skipped?: boolean }> {
  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", businessId)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (!conn) return { success: false, skipped: true };

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("google_event_id")
    .eq("id", bookingId)
    .single();

  if (!booking?.google_event_id) return { success: false, skipped: true };

  const accessToken = await getValidGoogleAccessToken(conn, businessId);
  if (!accessToken) return { success: false };

  const calendarId = conn.calendar_id ?? "primary";
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${booking.google_event_id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );

  await supabaseAdmin
    .from("bookings")
    .update({ google_event_id: null })
    .eq("id", bookingId);

  return { success: true };
}
