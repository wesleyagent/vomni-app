import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";

// GET /api/cron/appointment-reminders
// Runs hourly via Vercel cron. Finds bookings 23-25h away and sends reminder SMS.
export async function GET() {
  const now = new Date();

  // Window: appointments between 23 and 25 hours from now
  const min = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const max = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, appointment_at, service_name, staff_id, business_id, cancellation_token")
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("appointment_at", min.toISOString())
    .lte("appointment_at", max.toISOString());

  if (error) {
    console.error("[cron/appointment-reminders] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    // Get business info
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("name, booking_slug, whatsapp_enabled")
      .eq("id", booking.business_id)
      .single();

    // Get staff name
    let staffName = "";
    if (booking.staff_id) {
      const { data: staff } = await supabaseAdmin
        .from("staff").select("name").eq("id", booking.staff_id).single();
      staffName = staff?.name ?? "";
    }

    const time = booking.appointment_at?.substring(11, 16) ?? "";
    const date = booking.appointment_at?.substring(0, 10) ?? "";
    const bizName = biz?.name ?? "your appointment";
    const firstName = booking.customer_name?.split(" ")[0] ?? booking.customer_name ?? "there";
    const cancelUrl = booking.cancellation_token
      ? `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${booking.cancellation_token}`
      : null;

    const body = [
      `Hi ${firstName}! 📅 Reminder: you have a ${booking.service_name ?? "appointment"} at ${bizName} tomorrow at ${time}`,
      staffName ? `with ${staffName}` : null,
      cancelUrl ? `\nNeed to cancel? ${cancelUrl}` : null,
    ].filter(Boolean).join(" ");

    const result = await sendBookingMessage(
      booking.customer_phone,
      body,
      biz?.whatsapp_enabled ?? false
    );

    if (result.success) {
      await supabaseAdmin
        .from("bookings")
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
      processed++;
    } else {
      errors.push(`${booking.id}: ${result.error}`);
      // Still mark as sent to avoid retry loops (SMS failures are usually permanent)
      await supabaseAdmin
        .from("bookings")
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
    }
  }

  console.log(`[cron/appointment-reminders] processed=${processed} errors=${errors.length}`);
  return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined });
}
