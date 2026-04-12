import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptPhone } from "@/lib/phone";
import { logCalendarDisconnect } from "@/lib/telegram";

// POST /api/calendar/google/sync
// Push a Vomni booking to Google Calendar
export async function POST(req: NextRequest) {
  let body: { business_id: string; booking_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, booking_id } = body;
  if (!business_id || !booking_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get calendar connection
  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", business_id)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (!conn) {
    return NextResponse.json({ skipped: true, reason: "no_connection" });
  }

  const accessToken = await getValidAccessToken(conn, business_id);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }

  // Get booking details
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_phone_encrypted, service_name, service_duration_minutes, appointment_at, notes, staff_id, google_event_id")
    .eq("id", booking_id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Get business timezone
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("booking_timezone")
    .eq("id", business_id)
    .single();

  const timezone = business?.booking_timezone ?? "UTC";

  // appointment_at is stored as a local datetime in UTC clothing (e.g. "2024-01-15T09:30:00+00:00"
  // where 09:30 is the actual local appointment time). Slice off the offset so Google Calendar
  // receives a plain local datetime string, then apply timeZone so it displays correctly.
  const startLocal = booking.appointment_at.slice(0, 19); // "2024-01-15T09:30:00"
  const endLocal = new Date(
    new Date(booking.appointment_at).getTime() + (booking.service_duration_minutes ?? 60) * 60_000
  ).toISOString().slice(0, 19);                           // "2024-01-15T10:30:00"

  const calendarId = conn.calendar_id ?? "primary";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

  const eventBody = {
    summary: `${booking.customer_name} — ${booking.service_name}`,
    description: [
      `Customer: ${booking.customer_name}`,
      `Phone: ${booking.customer_phone_encrypted ? (() => { try { return decryptPhone(booking.customer_phone_encrypted); } catch { return booking.customer_phone ?? ""; } })() : (booking.customer_phone ?? "")}`,
      booking.notes ? `Notes: ${booking.notes}` : null,
      ``,
      `Manage: ${appUrl}/dashboard/calendar`,
      `vomni-booking:${booking.id}`, // marker to avoid circular sync
    ].filter(Boolean).join("\n"),
    start: { dateTime: startLocal, timeZone: timezone },
    end:   { dateTime: endLocal,   timeZone: timezone },
    reminders: { useDefault: true },
  };

  let googleEventId = booking.google_event_id;

  if (googleEventId) {
    // Update existing event
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );
    if (!res.ok) {
      // Event may have been deleted on Google side — create new one
      googleEventId = null;
    }
  }

  if (!googleEventId) {
    // Create new event
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[google/sync] create event failed:", err);
      return NextResponse.json({ error: "Failed to create Google Calendar event" }, { status: 500 });
    }

    const created = await res.json();
    googleEventId = created.id;

    // Save Google event ID back to booking
    await supabaseAdmin.from("bookings")
      .update({ google_event_id: googleEventId })
      .eq("id", booking_id);
  }

  return NextResponse.json({ success: true, google_event_id: googleEventId });
}

// DELETE /api/calendar/google/sync — remove event when booking is cancelled
export async function DELETE(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  const bookingId = req.nextUrl.searchParams.get("booking_id");

  if (!businessId || !bookingId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", businessId)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (!conn) return NextResponse.json({ skipped: true });

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("google_event_id")
    .eq("id", bookingId)
    .single();

  if (!booking?.google_event_id) return NextResponse.json({ skipped: true });

  const accessToken = await getValidAccessToken(conn, businessId);
  if (!accessToken) return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });

  const calendarId = conn.calendar_id ?? "primary";
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${booking.google_event_id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  await supabaseAdmin.from("bookings")
    .update({ google_event_id: null })
    .eq("id", bookingId);

  return NextResponse.json({ success: true });
}

async function getValidAccessToken(
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
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    // Refresh failed — mark connection inactive + alert via Telegram
    await supabaseAdmin.from("calendar_connections")
      .update({ is_active: false })
      .eq("business_id", businessId)
      .eq("provider", "google");
    void logCalendarDisconnect("google", businessId, null, `Token refresh failed: HTTP ${res.status}`);
    return null;
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();

  await supabaseAdmin.from("calendar_connections")
    .update({ access_token: data.access_token, token_expires_at: newExpiry })
    .eq("business_id", businessId)
    .eq("provider", "google");

  return data.access_token;
}
