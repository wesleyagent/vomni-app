import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendReviewRequest } from "@/lib/whatsapp";
import { canSendReviewRequest } from "@/lib/review-rules";
import { fingerprintPhone } from "@/lib/phone";

// GET /api/cron/review-requests
// Runs hourly (schedule: "0 * * * *" in vercel.json)
// Sends WhatsApp review requests for completed appointments 1-3 hours ago
// Requires Authorization: Bearer ${CRON_SECRET}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now           = new Date();
  const oneHourAgo    = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

  // Find completed bookings in the 1-3h window that haven't had a review request sent
  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select(`
      id,
      business_id,
      customer_name,
      customer_phone,
      appointment_at,
      service_name,
      cancellation_token,
      whatsapp_opt_in
    `)
    .eq("status", "completed")
    .eq("review_request_sent", false)
    .eq("whatsapp_opt_in", true)
    .gte("appointment_at", threeHoursAgo)
    .lte("appointment_at", oneHourAgo);

  if (error) {
    console.error("[review-requests] DB query error:", error.message);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, failed: 0, skipped: 0 });
  }

  // Fetch all distinct business IDs needed
  const businessIds = [...new Set(bookings.map((b) => b.business_id))];
  const { data: businesses } = await supabaseAdmin
    .from("businesses")
    .select("id, name, booking_slug")
    .in("id", businessIds);

  const businessMap = new Map((businesses ?? []).map((b) => [b.id, b]));

  let sent    = 0;
  let failed  = 0;
  let skipped = 0;

  for (const booking of bookings) {
    const twilioPhone: string | null = booking.customer_phone ?? null;

    if (!twilioPhone) {
      console.warn(`[review-requests] no phone for booking ${booking.id} — skipping`);
      failed++;
      await supabaseAdmin.from("bookings").update({ review_request_sent: true }).eq("id", booking.id);
      continue;
    }

    // Compute fingerprint for eligibility check
    const fingerprint = twilioPhone.startsWith("+")
      ? fingerprintPhone(twilioPhone, booking.business_id)
      : "";

    // Check eligibility before sending
    const eligibility = await canSendReviewRequest(booking.id, booking.business_id, fingerprint);

    if (!eligibility.eligible) {
      console.log(`[review-requests] booking ${booking.id} ineligible: ${eligibility.reason}`);
      skipped++;
      // Still mark sent to prevent re-queuing
      await supabaseAdmin.from("bookings").update({ review_request_sent: true }).eq("id", booking.id);
      continue;
    }

    const business = businessMap.get(booking.business_id);
    if (!business) {
      failed++;
      await supabaseAdmin.from("bookings").update({ review_request_sent: true }).eq("id", booking.id);
      continue;
    }

    try {
      const result = await sendReviewRequest(
        { ...booking, customer_phone: twilioPhone },
        business
      );

      if (result.success) {
        sent++;
        // Update last_review_request_at on customer profile
        await supabaseAdmin
          .from("customer_profiles")
          .update({ last_review_request_at: new Date().toISOString() })
          .eq("business_id", booking.business_id)
          .eq("phone", twilioPhone);
      } else {
        if (result.reason === "opted_out") {
          skipped++;
        } else {
          failed++;
          console.warn(`[review-requests] send failed for booking ${booking.id}: ${result.error}`);
        }
      }
    } catch (err) {
      failed++;
      console.error(`[review-requests] unexpected error for booking ${booking.id}:`, err instanceof Error ? err.message : String(err));
    }

    // Always mark as sent to prevent re-queuing on next hourly run
    await supabaseAdmin
      .from("bookings")
      .update({ review_request_sent: true })
      .eq("id", booking.id);
  }

  console.log(`[review-requests] processed=${bookings.length} sent=${sent} failed=${failed} skipped=${skipped}`);
  return NextResponse.json({ processed: bookings.length, sent, failed, skipped });
}
