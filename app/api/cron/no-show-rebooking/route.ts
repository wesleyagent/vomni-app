import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// GET /api/cron/no-show-rebooking
// Runs daily at 10am. Finds no-show bookings that haven't had a rebook SMS sent yet.
// Free-tier workaround: looks back 24h. When upgraded to Vercel Pro (hourly crons), narrow to 2h window.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: noShows, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, business_id, service_name, appointment_at, sms_status")
    .eq("status", "no_show")
    .neq("sms_status", "noshow_sms_sent")
    .gte("appointment_at", oneDayAgo.toISOString())
    .lte("appointment_at", oneHourAgo.toISOString());

  if (error) {
    console.error("[cron/no-show-rebooking] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!noShows || noShows.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const booking of noShows) {
    // Skip if rebooking SMS already sent
    if (booking.sms_status === "noshow_sms_sent") continue;

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("name, booking_slug, whatsapp_enabled")
      .eq("id", booking.business_id)
      .single();

    const firstName = booking.customer_name?.split(" ")[0] ?? "there";
    const rebookUrl = biz?.booking_slug ? `${APP_URL}/book/${biz.booking_slug}` : null;

    const body = rebookUrl
      ? `Hi ${firstName}, we missed you today at ${biz?.name ?? "us"}! 😊 We'd love to see you — book your next ${booking.service_name ?? "appointment"} here: ${rebookUrl}`
      : `Hi ${firstName}, we missed you today at ${biz?.name ?? "us"}! We'd love to see you soon — please contact us to rebook your ${booking.service_name ?? "appointment"}.`;

    const result = await sendBookingMessage(
      booking.customer_phone,
      body,
      biz?.whatsapp_enabled ?? false
    );

    if (result.success || true) { // Always update to avoid re-sending
      await supabaseAdmin
        .from("bookings")
        .update({ sms_status: "noshow_sms_sent" })
        .eq("id", booking.id);

      await supabaseAdmin.from("booking_audit_log").insert({
        booking_id: booking.id,
        action: "no_show_sms",
        actor: "system",
        details: { sms_sent: result.success },
      });

      processed++;
    }
  }

  console.log(`[cron/no-show-rebooking] processed=${processed}`);
  return NextResponse.json({ processed });
}
