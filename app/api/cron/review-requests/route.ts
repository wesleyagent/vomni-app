import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendReviewRequest } from "@/lib/whatsapp";
import { sendBookingMessage } from "@/lib/twilio";
import { sendEmail, buildReviewRequestEmailHtml, buildUnsubscribeUrl } from "@/lib/email";
import { canSendReviewRequest } from "@/lib/review-rules";
import { fingerprintPhone, decryptPhone } from "@/lib/phone";
import { withCronMonitoring } from "@/lib/telegram";
import { shouldRouteToEmail, shouldSendSMS } from "@/lib/messaging";

// GET /api/cron/review-requests
// Target schedule: "0 * * * *" (hourly) — set in vercel.json.
// NOTE: Vercel Hobby plan only supports daily crons. This hourly schedule will only
// activate once upgraded to Vercel Pro. On Hobby the cron fires once daily and the
// 1.5–2.5h window will only catch appointments that completed shortly before that
// single daily run. Upgrade to Pro to get correct real-time review timing.
// Requires Authorization: Bearer ${CRON_SECRET}

async function handler(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Window: appointments completed 1.5–2.5 hours ago.
  // Sends review request ~2 hours after the appointment — enough time for the
  // customer to leave but still fresh in mind.
  const twoAndHalfHoursAgo = new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString();
  const oneAndHalfHoursAgo = new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString();

  // Find completed bookings in the 1.5–2.5h window that haven't had a review request sent
  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select(`
      id,
      business_id,
      customer_name,
      customer_phone,
      customer_phone_encrypted,
      customer_email,
      appointment_at,
      service_name,
      cancellation_token,
      whatsapp_opt_in
    `)
    .eq("status", "completed")
    .eq("review_request_sent", false)
    .gte("appointment_at", twoAndHalfHoursAgo)
    .lte("appointment_at", oneAndHalfHoursAgo);

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
    .select("id, name, booking_slug, booking_currency, locale")
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

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";
    const reviewUrl = `${appUrl}/r/${booking.id}`;
    const firstName = booking.customer_name?.split(" ")[0] ?? "there";
    const bizCurrency = (business as typeof business & { booking_currency?: string }).booking_currency ?? null;
    const bizLocale   = (business as typeof business & { locale?: string }).locale ?? null;
    const useEmail    = shouldRouteToEmail(twilioPhone, bizCurrency);

    try {
      if (useEmail) {
        // Israeli customer — send review request via Resend email
        const customerEmail = (booking as typeof booking & { customer_email?: string }).customer_email;
        if (!customerEmail) {
          console.warn(`[review-requests] no email for ILS booking ${booking.id} — skipping`);
          failed++;
        } else {
          const unsubUrl = buildUnsubscribeUrl(customerEmail, booking.business_id);
          const result = await sendEmail({
            to:             customerEmail,
            subject:        `${firstName}, how was your visit at ${business.name}? ⭐`,
            type:           "review_request",
            bookingId:      booking.id,
            unsubscribeUrl: unsubUrl,
            html: buildReviewRequestEmailHtml({
              firstName,
              businessName:    business.name,
              reviewUrl,
              locale:          bizLocale,
              unsubscribeUrl:  unsubUrl,
            }),
          });
          if (result.success) {
            sent++;
            await supabaseAdmin
              .from("customer_profiles")
              .update({ last_review_request_at: new Date().toISOString() })
              .eq("business_id", booking.business_id)
              .eq("phone", booking.customer_phone ?? twilioPhone);
          } else {
            failed++;
          }
        }
      } else {
        const smsFallbackBody = `Hi ${firstName}! Hope your visit at ${business.name} was great 😊 We'd really appreciate a quick review: ${reviewUrl}`;

        if (booking.whatsapp_opt_in !== false) {
          // WhatsApp path (with SMS fallback if disabled/failed)
          const result = await sendReviewRequest(
            { ...booking, customer_phone: twilioPhone },
            business
          );

          if (result.success) {
            sent++;
            await supabaseAdmin
              .from("customer_profiles")
              .update({ last_review_request_at: new Date().toISOString() })
              .eq("business_id", booking.business_id)
              .eq("phone", booking.customer_phone ?? twilioPhone);
          } else if (result.reason === "opted_out") {
            skipped++;
          } else if (shouldSendSMS(twilioPhone, bizCurrency)) {
            const smsResult = await sendBookingMessage(twilioPhone, smsFallbackBody, false, { businessId: booking.business_id, bookingId: booking.id, messageType: "review_request" });
            if (smsResult.success) { sent++; } else { failed++; }
          }
        } else if (shouldSendSMS(twilioPhone, bizCurrency)) {
          const smsResult = await sendBookingMessage(twilioPhone, smsFallbackBody, false, { businessId: booking.business_id, bookingId: booking.id, messageType: "review_request" });
          if (smsResult.success) {
            sent++;
          } else {
            failed++;
            console.warn(`[review-requests] SMS failed for booking ${booking.id}: ${smsResult.error}`);
          }
        } else {
          skipped++; // UK SMS not yet enabled
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
