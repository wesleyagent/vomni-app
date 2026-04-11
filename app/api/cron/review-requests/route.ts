import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendReviewRequest } from "@/lib/whatsapp";
import { sendBookingMessage } from "@/lib/twilio";
import { canSendReviewRequest } from "@/lib/review-rules";
import { fingerprintPhone, decryptPhone } from "@/lib/phone";
import { withCronMonitoring } from "@/lib/telegram";

// GET /api/cron/review-requests
// Runs hourly (schedule: "0 * * * *" in vercel.json)
// Sends WhatsApp review requests for completed appointments 1-3 hours ago
// Requires Authorization: Bearer ${CRON_SECRET}

async function handler(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now           = new Date();
  // Free-tier workaround: cron runs once daily so look back 24h to catch all of yesterday's appointments
  // When upgraded to Vercel Pro (hourly crons), narrow this back to 1–3h
  const oneDayAgo     = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo    = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

  // Find completed bookings in the past 24h that haven't had a review request sent
  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select(`
      id,
      business_id,
      customer_name,
      customer_phone,
      customer_phone_encrypted,
      appointment_at,
      service_name,
      cancellation_token,
      whatsapp_opt_in
    `)
    .eq("status", "completed")
    .eq("review_request_sent", false)
    .gte("appointment_at", oneDayAgo)
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
    // Resolve real E.164 phone — customer_phone stores masked display value
    const enc = (booking as typeof booking & { customer_phone_encrypted?: string }).customer_phone_encrypted;
    const twilioPhone: string | null = enc
      ? (() => { try { return decryptPhone(enc); } catch { return booking.customer_phone ?? null; } })()
      : (booking.customer_phone ?? null);

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

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";
    const reviewUrl = `${appUrl}/r/${booking.id}`;
    const firstName = booking.customer_name?.split(" ")[0] ?? "there";

    try {
      const smsFallbackBody = `Hi ${firstName}! Hope your visit at ${business.name} was great 😊 We'd really appreciate a quick review: ${reviewUrl}`;

      if (booking.whatsapp_opt_in !== false) {
        // WhatsApp path (with SMS fallback if disabled/failed)
        const result = await sendReviewRequest(
          { ...booking, customer_phone: twilioPhone },
          business
        );

        if (result.success) {
          sent++;
          // Match profiles by masked display phone (customer_profiles.phone stores the display value)
          await supabaseAdmin
            .from("customer_profiles")
            .update({ last_review_request_at: new Date().toISOString() })
            .eq("business_id", booking.business_id)
            .eq("phone", booking.customer_phone ?? twilioPhone);
        } else if (result.reason === "opted_out") {
          skipped++;
        } else {
          // WhatsApp disabled or failed — try SMS
          const smsResult = await sendBookingMessage(twilioPhone, smsFallbackBody, false, { businessId: booking.business_id, bookingId: booking.id, messageType: "review_request" });
          if (smsResult.success) { sent++; } else { failed++; }
        }
      } else {
        // Opted out of WhatsApp — send SMS directly
        const smsResult = await sendBookingMessage(twilioPhone, smsFallbackBody, false, { businessId: booking.business_id, bookingId: booking.id, messageType: "review_request" });
        if (smsResult.success) {
          sent++;
        } else {
          failed++;
          console.warn(`[review-requests] SMS failed for booking ${booking.id}: ${smsResult.error}`);
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

export const GET = withCronMonitoring("review-requests", handler);
