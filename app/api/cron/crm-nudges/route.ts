import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendRebookingNudge } from "@/lib/whatsapp";
import { sendBookingMessage } from "@/lib/twilio";
import { sendEmail, buildNudgeEmailHtml, buildUnsubscribeUrl } from "@/lib/email";
import { decryptPhone } from "@/lib/phone";
import { withCronMonitoring } from "@/lib/telegram";
import { shouldRouteToEmail, shouldSendSMS } from "@/lib/messaging";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// GET /api/cron/crm-nudges
// Runs daily at 10am. Two passes: pattern-based + lapsed nudges.
async function handler(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let patternSent = 0;
  let lapsedSent = 0;
  const errors: string[] = [];

  // ── Pass 1: Pattern-based nudge ──────────────────────────────────────────
  // Customers whose predicted_next_visit_at has passed (within last 7 days),
  // haven't been nudged recently, and are not lapsed.
  const { data: patternCustomers } = await supabaseAdmin
    .from("customer_profiles")
    .select("id, business_id, phone, phone_encrypted, email, name, predicted_next_visit_at, last_visit_at, nudge_count, nudge_sent_at, marketing_consent")
    .lt("predicted_next_visit_at", new Date().toISOString())
    .gt("predicted_next_visit_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .eq("marketing_consent", true)
    .eq("opted_out", false)
    .eq("is_lapsed", false)
    .lt("nudge_count", 3)
    .or(`nudge_sent_at.is.null,nudge_sent_at.lt.${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()}`);

  if (patternCustomers && patternCustomers.length > 0) {
    for (const cp of patternCustomers) {
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id, name, booking_slug, booking_currency, locale")
        .eq("id", cp.business_id)
        .single();

      if (!biz) continue;

      const lastVisit = cp.last_visit_at ? new Date(cp.last_visit_at as string) : null;
      const weeksSince = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 0;

      try {
        const bookingUrl  = biz.booking_slug ? `${APP_URL}/book/${biz.booking_slug}` : APP_URL;
        const firstName   = (cp.name as string | null)?.split(" ")[0] ?? "there";
        const cpWa        = cp as typeof cp & { whatsapp_opt_in?: boolean };
        let messageSid: string | null = null;

        const cpEnc = (cp as typeof cp & { phone_encrypted?: string }).phone_encrypted;
        const sendPhone: string = cpEnc
          ? (() => { try { return decryptPhone(cpEnc); } catch { return cp.phone as string; } })()
          : (cp.phone as string);

        const bizCurrency = (biz as typeof biz & { booking_currency?: string }).booking_currency ?? null;
        const bizLocale   = (biz as typeof biz & { locale?: string }).locale ?? null;
        const useEmail    = shouldRouteToEmail(sendPhone, bizCurrency);
        const cpEmail     = (cp as typeof cp & { email?: string }).email;

        const patternSmsBody = `Hi ${firstName}! It's been a while since your last visit at ${biz.name}. Ready to book again? ${bookingUrl}`;

        if (useEmail && cpEmail) {
          // Israeli customer — send nudge email via Resend
          const unsubUrl = buildUnsubscribeUrl(cpEmail, cp.business_id);
          const r = await sendEmail({
            to:             cpEmail,
            subject:        `${firstName}, it's been a while — come back to ${biz.name}!`,
            type:           "crm_nudge",
            unsubscribeUrl: unsubUrl,
            html: buildNudgeEmailHtml({ firstName, businessName: biz.name, weeksSince, bookingUrl, nudgeType: "pattern", locale: bizLocale, unsubscribeUrl: unsubUrl }),
          });
          messageSid = r.success ? "email" : null;
        } else if (!useEmail) {
          if (cpWa.whatsapp_opt_in !== false) {
            const result = await sendRebookingNudge(
              { phone: sendPhone, name: cp.name as string | null },
              { id: biz.id, name: biz.name, booking_slug: biz.booking_slug },
              "pattern",
              weeksSince
            );
            if (result.success) {
              messageSid = result.messageSid ?? null;
            } else if (shouldSendSMS(sendPhone, bizCurrency)) {
              const r = await sendBookingMessage(sendPhone, patternSmsBody, false, { businessId: cp.business_id, messageType: "nudge_pattern" });
              messageSid = r.success ? r.sid : null;
            }
          } else if (shouldSendSMS(sendPhone, bizCurrency)) {
            const r = await sendBookingMessage(sendPhone, patternSmsBody, false, { businessId: cp.business_id, messageType: "nudge_pattern" });
            messageSid = r.success ? r.sid : null;
          }
        }

        // Log to crm_nudges
        await supabaseAdmin.from("crm_nudges").insert({
          business_id: cp.business_id,
          customer_phone: cp.phone,
          nudge_type: "pattern",
          message_sid: messageSid,
          weeks_since_last_visit: weeksSince,
        });

        // Update customer profile
        await supabaseAdmin.from("customer_profiles").update({
          nudge_sent_at: new Date().toISOString(),
          nudge_count: ((cp.nudge_count as number) ?? 0) + 1,
        }).eq("id", cp.id);

        patternSent++;
      } catch (e) {
        errors.push(`pattern:${cp.phone}:${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Pass 2: Lapsed nudge (single-visit customers only) ──────────────────
  // Customers who are lapsed, have no avg_days_between_visits (single visit),
  // and have never been nudged.
  const { data: lapsedCustomers } = await supabaseAdmin
    .from("customer_profiles")
    .select("id, business_id, phone, phone_encrypted, email, name, last_visit_at, marketing_consent")
    .eq("is_lapsed", true)
    .is("avg_days_between_visits", null)
    .is("nudge_sent_at", null)
    .eq("marketing_consent", true)
    .eq("opted_out", false);

  if (lapsedCustomers && lapsedCustomers.length > 0) {
    for (const cp of lapsedCustomers) {
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id, name, booking_slug, booking_currency, locale")
        .eq("id", cp.business_id)
        .single();

      if (!biz) continue;

      const lastVisit = cp.last_visit_at ? new Date(cp.last_visit_at as string) : null;
      const weeksSince = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 0;

      try {
        const bookingUrl  = biz.booking_slug ? `${APP_URL}/book/${biz.booking_slug}` : APP_URL;
        const firstName   = (cp.name as string | null)?.split(" ")[0] ?? "there";
        const cpWa        = cp as typeof cp & { whatsapp_opt_in?: boolean };
        let messageSid: string | null = null;

        const cpEnc2 = (cp as typeof cp & { phone_encrypted?: string }).phone_encrypted;
        const sendPhone2: string = cpEnc2
          ? (() => { try { return decryptPhone(cpEnc2); } catch { return cp.phone as string; } })()
          : (cp.phone as string);

        const bizCurrency2 = (biz as typeof biz & { booking_currency?: string }).booking_currency ?? null;
        const bizLocale2   = (biz as typeof biz & { locale?: string }).locale ?? null;
        const useEmail2    = shouldRouteToEmail(sendPhone2, bizCurrency2);
        const cpEmail2     = (cp as typeof cp & { email?: string }).email;

        const lapsedSmsBody = `Hi ${firstName}! It's been ${weeksSince} week${weeksSince !== 1 ? "s" : ""} since you visited ${biz.name}. We'd love to see you again! ${bookingUrl}`;

        if (useEmail2 && cpEmail2) {
          // Israeli customer — send lapsed nudge email via Resend
          const unsubUrl2 = buildUnsubscribeUrl(cpEmail2, cp.business_id);
          const r = await sendEmail({
            to:             cpEmail2,
            subject:        `${firstName}, we miss you at ${biz.name}!`,
            type:           "crm_nudge",
            unsubscribeUrl: unsubUrl2,
            html: buildNudgeEmailHtml({ firstName, businessName: biz.name, weeksSince, bookingUrl, nudgeType: "lapsed", locale: bizLocale2, unsubscribeUrl: unsubUrl2 }),
          });
          messageSid = r.success ? "email" : null;
        } else if (!useEmail2) {
          if (cpWa.whatsapp_opt_in !== false) {
            const result = await sendRebookingNudge(
              { phone: sendPhone2, name: cp.name as string | null },
              { id: biz.id, name: biz.name, booking_slug: biz.booking_slug },
              "lapsed",
              weeksSince
            );
            if (result.success) {
              messageSid = result.messageSid ?? null;
            } else if (shouldSendSMS(sendPhone2, bizCurrency2)) {
              const r = await sendBookingMessage(sendPhone2, lapsedSmsBody, false, { businessId: cp.business_id, messageType: "nudge_lapsed" });
              messageSid = r.success ? r.sid : null;
            }
          } else if (shouldSendSMS(sendPhone2, bizCurrency2)) {
            const r = await sendBookingMessage(sendPhone2, lapsedSmsBody, false, { businessId: cp.business_id, messageType: "nudge_lapsed" });
            messageSid = r.success ? r.sid : null;
          }
        }

        // Log to crm_nudges
        await supabaseAdmin.from("crm_nudges").insert({
          business_id: cp.business_id,
          customer_phone: cp.phone,
          nudge_type: "lapsed",
          message_sid: messageSid,
          weeks_since_last_visit: weeksSince,
        });

        // Update customer profile
        await supabaseAdmin.from("customer_profiles").update({
          nudge_sent_at: new Date().toISOString(),
        }).eq("id", cp.id);

        lapsedSent++;
      } catch (e) {
        errors.push(`lapsed:${cp.phone}:${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log(`[cron/crm-nudges] pattern=${patternSent} lapsed=${lapsedSent} errors=${errors.length}`);
  return NextResponse.json({
    patternSent,
    lapsedSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export const GET = withCronMonitoring("crm-nudges", handler);
