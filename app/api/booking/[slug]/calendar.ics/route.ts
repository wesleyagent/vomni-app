import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptPhone } from "@/lib/phone";

// GET /api/booking/[slug]/calendar.ics?token=[calendar_token]
// Returns an iCalendar feed of all confirmed bookings for a business.
// Protected by a secret calendar_token stored on the business row.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, calendar_token, booking_timezone")
    .eq("booking_slug", slug)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if (!business.calendar_token || business.calendar_token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Fetch upcoming confirmed bookings
  const now = new Date().toISOString();
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_phone_encrypted, service_name, service_duration_minutes, appointment_at, notes, staff_id")
    .eq("business_id", business.id)
    .eq("status", "confirmed")
    .gte("appointment_at", now)
    .order("appointment_at", { ascending: true })
    .limit(500);

  const events = (bookings ?? []).map(b => {
    const start = new Date(b.appointment_at);
    const end = new Date(start.getTime() + (b.service_duration_minutes ?? 30) * 60000);

    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const escape = (s: string) => s.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");

    let phone = b.customer_phone ?? "";
    if (b.customer_phone_encrypted) {
      try { phone = decryptPhone(b.customer_phone_encrypted); } catch { /* keep masked */ }
    }

    const descParts = [
      `Phone: ${phone}`,
      b.notes ? `Notes: ${b.notes}` : null,
    ].filter(Boolean).join("\\n");

    return [
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${escape(`${b.service_name ?? "Appointment"} — ${b.customer_name ?? "Customer"}`)}`,
      `DESCRIPTION:${escape(descParts)}`,
      `UID:${b.id}@vomni.io`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vomni//Business Calendar//EN",
    `X-WR-CALNAME:${business.name} — Appointments`,
    `X-WR-TIMEZONE:${business.booking_timezone ?? "Asia/Jerusalem"}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-bookings.ics"`,
      "Cache-Control": "no-cache, no-store",
    },
  });
}
