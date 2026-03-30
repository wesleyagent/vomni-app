import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ business_id: string }> }) {
  const { business_id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  // Validate calendar token
  const { data: biz } = await supabaseAdmin.from("businesses")
    .select("id, name, calendar_token").eq("id", business_id).single();

  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (biz.calendar_token && token !== biz.calendar_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: bookings } = await supabaseAdmin.from("bookings")
    .select("id, customer_name, service_name, appointment_at, service_duration_minutes, notes, cancellation_token")
    .eq("business_id", business_id)
    .eq("status", "confirmed")
    .gte("appointment_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("appointment_at");

  const events = (bookings ?? []).map(b => ({
    id: b.id,
    summary: `${b.customer_name} — ${b.service_name ?? "Appointment"}`,
    start: b.appointment_at,
    duration: b.service_duration_minutes ?? 30,
    description: b.notes ?? "",
  }));

  // Build ICS manually (simple, no library needed)
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vomni//Booking Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${biz.name} Bookings`,
    "X-WR-TIMEZONE:UTC",
    ...events.flatMap(e => {
      const start = new Date(e.start);
      const end = new Date(start.getTime() + e.duration * 60000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      return [
        "BEGIN:VEVENT",
        `UID:${e.id}@vomni.io`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${e.summary}`,
        e.description ? `DESCRIPTION:${e.description.replace(/\n/g, "\\n")}` : "",
        "END:VEVENT",
      ].filter(Boolean);
    }),
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=bookings.ics",
      "Cache-Control": "no-cache",
    },
  });
}
