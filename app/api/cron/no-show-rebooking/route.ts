import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";
import { sendEmail, buildNoShowEmailHtml, buildUnsubscribeUrl } from "@/lib/email";
import { decryptPhone } from "@/lib/phone";
import { withCronMonitoring } from "@/lib/telegram";
import { shouldRouteToEmail, shouldSendSMS } from "@/lib/messaging";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// GET /api/cron/no-show-rebooking
// Runs daily at 10am. Finds no-show bookings that haven't had a rebook SMS sent yet.
// Free-tier workaround: looks back 24h. When upgraded to Vercel Pro (hourly crons), narrow to 2h window.
async function handler(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: noShows, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_phone_encrypted, customer_email, business_id, service_name, appointment_at, sms_status")
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
      .select("name, booking_slug, whatsapp_enabled, booking_currency, locale, owner_email, notification_email")
      .eq("id", booking.business_id)
      .single();

    const firstName = booking.customer_name?.split(" ")[0] ?? "there";
    const rebookUrl = biz?.booking_slug ? `${APP_URL}/book/${biz.booking_slug}` : null;

    const body = rebookUrl
      ? `Hi ${firstName}, we missed you today at ${biz?.name ?? "us"}! 😊 We'd love to see you — book your next ${booking.service_name ?? "appointment"} here: ${rebookUrl}`
      : `Hi ${firstName}, we missed you today at ${biz?.name ?? "us"}! We'd love to see you soon — please contact us to rebook your ${booking.service_name ?? "appointment"}.`;

    // Decrypt phone — customer_phone stores masked display value
    const enc = (booking as typeof booking & { customer_phone_encrypted?: string }).customer_phone_encrypted;
    const sendPhone: string = enc
      ? (() => { try { return decryptPhone(enc); } catch { return booking.customer_phone ?? ""; } })()
      : (booking.customer_phone ?? "");

    const bizCurrency = (biz as typeof biz & { booking_currency?: string })?.booking_currency ?? null;
    const bizLocale   = (biz as typeof biz & { locale?: string })?.locale ?? null;
    const useEmail    = shouldRouteToEmail(sendPhone, bizCurrency);
    const customerEmail = (booking as typeof booking & { customer_email?: string }).customer_email;

    let result: { success: boolean };
    if (useEmail && customerEmail) {
      const unsubUrl = buildUnsubscribeUrl(customerEmail, booking.business_id);
      result = await sendEmail({
        to:             customerEmail,
        subject:        `${firstName}, we missed you at ${biz?.name ?? "us"} today 😊`,
        type:           "no_show_follow_up",
        bookingId:      booking.id,
        unsubscribeUrl: unsubUrl,
        html: buildNoShowEmailHtml({
          firstName,
          businessName:   biz?.name ?? "",
          serviceName:    booking.service_name ?? "appointment",
          rebookUrl,
          locale:         bizLocale,
          unsubscribeUrl: unsubUrl,
        }),
      });
    } else if (!useEmail && shouldSendSMS(sendPhone, bizCurrency)) {
      result = await sendBookingMessage(
        sendPhone,
        body,
        biz?.whatsapp_enabled ?? false,
        { businessId: booking.business_id, bookingId: booking.id, messageType: "no_show" }
      );
    } else {
      // UK SMS not enabled, or ILS with no email — skip but still mark sent
      result = { success: true };
    }

    if (result.success || true) { // Always update to avoid re-sending
      await supabaseAdmin
        .from("bookings")
        .update({ sms_status: "noshow_sms_sent" })
        .eq("id", booking.id);

      // Email business owner — non-blocking
      const ownerEmail = (biz as typeof biz & { notification_email?: string; owner_email?: string })?.notification_email
        ?? (biz as typeof biz & { owner_email?: string })?.owner_email;
      if (ownerEmail) {
        const apptDate = booking.appointment_at?.substring(0, 10) ?? "";
        const apptTime = booking.appointment_at?.substring(11, 16) ?? "";
        sendEmail({
          to: ownerEmail,
          subject: `No-show: ${booking.customer_name} — ${booking.service_name} on ${apptDate} at ${apptTime}`,
          type: "booking_owner_notify",
          bookingId: booking.id,
          html: `<div style="font-family:Inter,sans-serif;background:#F9FAFB;padding:24px;"><div style="max-width:520px;margin:0 auto;"><div style="background:#0A0F1E;border-radius:16px 16px 0 0;padding:20px 32px;"><span style="font-weight:700;font-size:20px;color:#fff;">vomni</span></div><div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;"><div style="background:#6B7280;border-radius:12px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">No-Show</div><div style="font-size:14px;color:rgba(255,255,255,0.85);">${apptDate} at ${apptTime}</div></div><table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Customer</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${booking.customer_name ?? ""}</td></tr><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Service</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${booking.service_name ?? ""}</td></tr></table><p style="font-size:13px;color:#6B7280;margin-top:16px;">A re-engagement SMS has been sent to the customer.</p></div></div></div>`,
        }).catch(err => console.error("[cron/no-show] owner email failed:", err));
      }

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

export const GET = withCronMonitoring("no-show-rebooking", handler);
