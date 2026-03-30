import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// GET /api/cron/waitlist-check
// Runs every 15 minutes. Finds upcoming waitlist entries whose date is today or tomorrow
// and checks if a slot opened. Sends SMS if a slot is available.
export async function GET() {
  const today = new Date().toISOString().substring(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().substring(0, 10);

  // Get pending waitlist entries for today and tomorrow
  const { data: entries, error } = await supabaseAdmin
    .from("booking_waitlist")
    .select("id, business_id, staff_id, service_id, date, customer_name, customer_phone")
    .in("date", [today, tomorrow])
    .eq("notified", false)
    .eq("booked", false);

  if (error || !entries || entries.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  let notified = 0;

  for (const entry of entries) {
    // Get business booking slug
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("name, booking_slug, whatsapp_enabled")
      .eq("id", entry.business_id)
      .single();

    if (!biz?.booking_slug) continue;

    // Check if any confirmed bookings exist for this date/staff/service to determine availability
    // Simple heuristic: if there's space, notify
    let query = supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact" })
      .eq("business_id", entry.business_id)
      .eq("status", "confirmed")
      .gte("appointment_at", `${entry.date}T00:00:00`)
      .lte("appointment_at", `${entry.date}T23:59:59`);

    if (entry.staff_id) query = query.eq("staff_id", entry.staff_id);

    const { count } = await query;

    // Notify if there are fewer than 20 bookings that day (slot likely available)
    if ((count ?? 0) < 20) {
      const firstName = entry.customer_name?.split(" ")[0] ?? "there";
      const rebookUrl = `${APP_URL}/book/${biz.booking_slug}`;

      const body = `Hi ${firstName}! 🎉 A slot opened up at ${biz.name} on ${entry.date}. Book now before it's gone: ${rebookUrl}`;

      await sendBookingMessage(entry.customer_phone, body, biz.whatsapp_enabled ?? false);

      await supabaseAdmin
        .from("booking_waitlist")
        .update({ notified: true, notified_at: new Date().toISOString() })
        .eq("id", entry.id);

      notified++;
    }
  }

  return NextResponse.json({ checked: entries.length, notified });
}
