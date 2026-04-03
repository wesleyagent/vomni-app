import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// GET /api/cron/waitlist-check
// Runs daily at 9am. Finds upcoming waitlist entries whose date is today or tomorrow
// and checks if a slot opened. Sends SMS to only the FIRST customer on the waitlist
// per slot (grouped by business_id + date + staff_id) to avoid notifying everyone at once.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().substring(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().substring(0, 10);

  // Get pending waitlist entries for today and tomorrow, ordered by creation time
  // so that position 1 is always the earliest registrant.
  const { data: entries, error } = await supabaseAdmin
    .from("booking_waitlist")
    .select("id, business_id, staff_id, service_id, date, customer_name, customer_phone, created_at")
    .in("date", [today, tomorrow])
    .eq("notified", false)
    .eq("booked", false)
    .order("created_at", { ascending: true });

  if (error || !entries || entries.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  // De-duplicate: for each unique slot key (business_id + date + staff_id),
  // keep only the FIRST (earliest) waitlist entry. This ensures we notify at
  // most one customer per slot opening per cron run.
  const seenSlots = new Set<string>();
  const firstPerSlot = entries.filter(entry => {
    const slotKey = `${entry.business_id}::${entry.date}::${entry.staff_id ?? "any"}`;
    if (seenSlots.has(slotKey)) return false;
    seenSlots.add(slotKey);
    return true;
  });

  let notified = 0;

  for (const entry of firstPerSlot) {
    // Get business booking slug
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("name, booking_slug, whatsapp_enabled")
      .eq("id", entry.business_id)
      .single();

    if (!biz?.booking_slug) continue;

    // Check if any confirmed bookings exist for this date/staff/service to determine availability
    // Simple heuristic: if there's space (fewer than 20 bookings), notify.
    let query = supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact" })
      .eq("business_id", entry.business_id)
      .eq("status", "confirmed")
      .gte("appointment_at", `${entry.date}T00:00:00`)
      .lte("appointment_at", `${entry.date}T23:59:59`);

    if (entry.staff_id) query = query.eq("staff_id", entry.staff_id);

    const { count } = await query;

    // Only notify if a slot appears to be available
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
