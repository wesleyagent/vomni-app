import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptPhone } from "@/lib/phone";

// POST /api/calendar/microsoft/sync
// Push a Vomni booking to Microsoft Calendar
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
    .select("access_token, refresh_token, token_expires_at")
    .eq("business_id", business_id)
    .eq("provider", "microsoft")
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
    .select("id, customer_name, customer_phone, customer_phone_encrypted, service_name, service_duration_minutes, appointment_at, notes, microsoft_event_id")
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
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

  // appointment_at is stored as local datetime in UTC clothing — slice off offset
  // so Graph API receives a plain local datetime string, then apply timeZone.
  const startLocal = booking.appointment_at.slice(0, 19); // "2024-01-15T09:30:00"
  const endLocal   = new Date(
    new Date(booking.appointment_at).getTime() +
      (booking.service_duration_minutes ?? 60) * 60_000
  )
    .toISOString()
    .slice(0, 19); // "2024-01-15T10:30:00"

  const eventBody = {
    subject: `${booking.customer_name} — ${booking.service_name}`,
    body: {
      contentType: "text",
      content: [
        `Customer: ${booking.customer_name}`,
        `Phone: ${booking.customer_phone_encrypted ? (() => { try { return decryptPhone(booking.customer_phone_encrypted); } catch { return booking.customer_phone ?? ""; } })() : (booking.customer_phone ?? "")}`,
        booking.notes ? `Notes: ${booking.notes}` : null,
        ``,
        `Manage: ${appUrl}/dashboard/calendar`,
        `vomni-booking:${booking.id}`, // marker to avoid circular sync
      ]
        .filter(Boolean)
        .join("\n"),
    },
    start: { dateTime: startLocal, timeZone: timezone },
    end:   { dateTime: endLocal,   timeZone: timezone },
    isReminderOn: true,
  };

  let microsoftEventId: string | null = booking.microsoft_event_id ?? null;

  if (microsoftEventId) {
    // Update existing event
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${microsoftEventId}`,
      {
        method:  "PATCH",
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );
    if (!res.ok) {
      // Event may have been deleted on Microsoft side — create a new one
      microsoftEventId = null;
    }
  }

  if (!microsoftEventId) {
    // Create new event
    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[microsoft/sync] create event failed:", err);
      return NextResponse.json(
        { error: "Failed to create Microsoft Calendar event" },
        { status: 500 }
      );
    }

    const created = await res.json() as { id: string };
    microsoftEventId = created.id;

    // Save Microsoft event ID back to booking
    await supabaseAdmin
      .from("bookings")
      .update({ microsoft_event_id: microsoftEventId })
      .eq("id", booking_id);
  }

  return NextResponse.json({ success: true, microsoft_event_id: microsoftEventId });
}

// DELETE /api/calendar/microsoft/sync — remove event when booking is cancelled
export async function DELETE(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  const bookingId  = req.nextUrl.searchParams.get("booking_id");

  if (!businessId || !bookingId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("business_id", businessId)
    .eq("provider", "microsoft")
    .eq("is_active", true)
    .single();

  if (!conn) return NextResponse.json({ skipped: true });

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("microsoft_event_id")
    .eq("id", bookingId)
    .single();

  if (!booking?.microsoft_event_id) return NextResponse.json({ skipped: true });

  const accessToken = await getValidAccessToken(conn, businessId);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }

  await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${booking.microsoft_event_id}`,
    {
      method:  "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  await supabaseAdmin
    .from("bookings")
    .update({ microsoft_event_id: null })
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

  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; expires_in: number };
  const newExpiry = new Date(
    Date.now() + (data.expires_in ?? 3600) * 1000
  ).toISOString();

  await supabaseAdmin
    .from("calendar_connections")
    .update({ access_token: data.access_token, token_expires_at: newExpiry })
    .eq("business_id", businessId)
    .eq("provider", "microsoft");

  return data.access_token;
}
