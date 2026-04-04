/**
 * WhatsApp messaging via Twilio Content API (template SIDs).
 * All customer-facing messages go through WhatsApp templates.
 * Every send is logged to the whatsapp_log table.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

const ACCOUNT_SID    = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN     = process.env.TWILIO_AUTH_TOKEN ?? "";
const WHATSAPP_FROM  = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// Template SIDs from env
const TEMPLATE_CONFIRMATION = process.env.TWILIO_TEMPLATE_CONFIRMATION_SID ?? "";
const TEMPLATE_REMINDER     = process.env.TWILIO_TEMPLATE_REMINDER_SID ?? "";
const TEMPLATE_REVIEW       = process.env.TWILIO_TEMPLATE_REVIEW_SID ?? "";
const TEMPLATE_NUDGE_PATTERN = process.env.TWILIO_TEMPLATE_NUDGE_PATTERN_SID ?? "";
const TEMPLATE_NUDGE_LAPSED  = process.env.TWILIO_TEMPLATE_NUDGE_LAPSED_SID ?? "";

// ── Types ───────────────────────────────────────────────────────────────────

export interface WhatsAppResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  reason?: string;
}

interface BookingLike {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  appointment_at: string;
  service_name?: string;
  cancellation_token?: string;
  whatsapp_opt_in?: boolean;
}

interface BusinessLike {
  id: string;
  name: string;
  booking_slug?: string;
}

interface CustomerProfileLike {
  phone: string;
  name?: string | null;
  last_visit_at?: string | null;
}

// ── Phone utilities ──────────────────────────────────────────────────────────

/** Best-effort E.164 normalisation for opt-out lookup (never logged). */
function toE164(phone: string): string | null {
  try {
    const cleaned = phone.replace(/[\s\-().\u00A0]/g, "");
    if (cleaned.startsWith("+")) return /^\+\d{7,15}$/.test(cleaned) ? cleaned : null;
    const digits = cleaned.replace(/\D/g, "");
    if (/^0\d{9}$/.test(digits))   return `+972${digits.slice(1)}`;
    if (/^972\d{9}$/.test(digits)) return `+${digits}`;
    if (/^\d{9}$/.test(digits))    return `+972${digits}`;
    if (/^07\d{9}$/.test(digits))  return `+44${digits.slice(1)}`;
    if (/^44\d{10}$/.test(digits)) return `+${digits}`;
    return null;
  } catch {
    return null;
  }
}

function toWhatsAppNumber(phone: string): string {
  // Ensure E.164, prefix with "whatsapp:"
  let e164 = phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) e164 = `+${digits}`;
  else if (digits.startsWith("0")) e164 = `+972${digits.slice(1)}`;
  else if (!phone.startsWith("+")) e164 = `+${digits}`;
  return `whatsapp:${e164}`;
}

// ── Core sender ─────────────────────────────────────────────────────────────

async function sendTemplate(
  to: string,
  templateSid: string,
  variables: Record<string, string>,
  meta: { businessId?: string; bookingId?: string; templateName: string }
): Promise<WhatsAppResult> {
  // ── Opt-out check — must run before any Twilio call ─────────────────────
  if (meta.businessId) {
    try {
      const e164 = toE164(to);
      const lookupPhone = e164 ?? to;
      const { data: profile } = await supabaseAdmin
        .from("customer_profiles")
        .select("opted_out")
        .eq("business_id", meta.businessId)
        .eq("phone", lookupPhone)
        .maybeSingle();

      if (profile?.opted_out === true) {
        await supabaseAdmin.from("whatsapp_log").insert({
          business_id: meta.businessId,
          booking_id: meta.bookingId ?? null,
          customer_phone: "[opted_out]",
          template_name: meta.templateName,
          message_sid: null,
          status: "skipped_opted_out",
          error_message: "Customer opted out",
        }).then(() => {}, () => {});
        return { success: false, reason: "opted_out", error: "Customer opted out" };
      }
    } catch {
      // Lookup failure — do not block the send
    }
  }

  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.warn("[whatsapp] Missing Twilio credentials — message not sent");
    return { success: false, error: "Missing Twilio credentials" };
  }

  if (!templateSid) {
    console.warn(`[whatsapp] Template SID not configured for ${meta.templateName}`);
    return { success: false, error: `Template ${meta.templateName} not configured` };
  }

  const whatsappTo = toWhatsAppNumber(to);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const creds = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  try {
    const params = new URLSearchParams({
      From: WHATSAPP_FROM,
      To: whatsappTo,
      ContentSid: templateSid,
      ContentVariables: JSON.stringify(variables),
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json() as { sid?: string; message?: string; code?: number };

    // Log to whatsapp_log regardless of success — never log raw phone
    const displayPhone = toE164(to) ? `[e164:${toE164(to)!.slice(-3)}]` : "[phone]";
    await supabaseAdmin.from("whatsapp_log").insert({
      business_id: meta.businessId ?? null,
      booking_id: meta.bookingId ?? null,
      customer_phone: displayPhone,
      template_name: meta.templateName,
      message_sid: data.sid ?? null,
      status: res.ok ? "sent" : "failed",
      error_message: res.ok ? null : (data.message ?? `HTTP ${res.status}`),
    }).then(() => {}, (err) => console.error("[whatsapp] log insert error:", err));

    if (!res.ok) {
      console.error("[whatsapp] send failed:", data.message ?? res.status);
      return { success: false, error: data.message ?? "Twilio error" };
    }

    return { success: true, messageSid: data.sid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] fetch error:", msg);

    // Still log the failure — never log raw phone
    await supabaseAdmin.from("whatsapp_log").insert({
      business_id: meta.businessId ?? null,
      booking_id: meta.bookingId ?? null,
      customer_phone: "[phone]",
      template_name: meta.templateName,
      message_sid: null,
      status: "failed",
      error_message: msg.slice(0, 500),
    }).then(() => {}, () => {});

    return { success: false, error: msg };
  }
}

// ── Date formatting helpers ────────────────────────────────────────────────

function formatDate(isoDate: string, timezone?: string): string {
  const tz = timezone ?? "Asia/Jerusalem";
  try {
    return new Date(isoDate).toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", timeZone: tz,
    });
  } catch {
    return new Date(isoDate).toLocaleDateString("en-GB");
  }
}

function formatTime(isoDate: string, timezone?: string): string {
  const tz = timezone ?? "Asia/Jerusalem";
  try {
    return new Date(isoDate).toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
    });
  } catch {
    return isoDate.substring(11, 16);
  }
}

// ── Public functions ────────────────────────────────────────────────────────
//
// All customer-facing templates must be bilingual (English + Hebrew).
// Template content lives in the Twilio console under the Content API.
// Variable mappings are documented per function below.
//
// TEMPLATE: appointment_confirmation (TWILIO_TEMPLATE_CONFIRMATION_SID)
//   EN: "Hi {{1}}! ✅ Your appointment at {{2}} is confirmed for {{3}} at {{4}}. Cancel: {{5}}"
//   HE: "היי {{1}}! ✅ הפגישה שלך ב-{{2}} אושרה ל-{{3}} בשעה {{4}}. לביטול: {{5}}"
//
// ⚠️  TWILIO TEMPLATE UPDATE REQUIRED: variable {{6}} = manage link.
//     Submit the following updated template body to Twilio Content API:
//       Hi {{1}}! ✅ Your appointment at {{2}} is confirmed for {{3}} at {{4}}.
//       שלום {{1}}, התור שלך ב-{{2}} מאושר ל-{{3}} בשעה {{4}}.
//       To manage your appointment: {{6}}
//       לניהול התור שלך: {{6}}
//       Reply STOP to unsubscribe | להסרה השב STOP
//     Until the template is updated in Twilio, {{6}} is silently ignored.
//
// TEMPLATE: appointment_reminder (TWILIO_TEMPLATE_REMINDER_SID)
//   EN: "Hi {{1}}! 📅 Reminder: you have an appointment at {{2}} today at {{3}}."
//   HE: "היי {{1}}! 📅 תזכורת: יש לך פגישה ב-{{2}} היום בשעה {{3}}."
//
// TEMPLATE: review_request (TWILIO_TEMPLATE_REVIEW_SID)
//   EN: "Hi {{1}}! Hope your visit at {{2}} was great 😊 Would you mind leaving a quick review? {{3}}"
//   HE: "היי {{1}}! מקווים שנהנית מהביקור ב-{{2}} 😊 תוכל/י להשאיר חוות דעת קצרה? {{3}}"
//
// TEMPLATE: nudge_pattern (TWILIO_TEMPLATE_NUDGE_PATTERN_SID)
//   EN: "Hi {{1}}! It's been a while since your last visit at {{2}}. Ready to book again? {{3}}"
//   HE: "היי {{1}}! עבר זמן מאז הביקור האחרון שלך ב-{{2}}. מוכן/ה לקבוע תור? {{3}}"
//
// TEMPLATE: nudge_lapsed (TWILIO_TEMPLATE_NUDGE_LAPSED_SID)
//   EN: "Hi {{1}}! It's been {{3}} weeks since you visited {{2}}. We'd love to see you again! {{4}}"
//   HE: "היי {{1}}! עברו {{3}} שבועות מאז שביקרת ב-{{2}}. נשמח לראות אותך שוב! {{4}}"

export async function sendAppointmentConfirmation(
  booking: BookingLike,
  business: BusinessLike
): Promise<WhatsAppResult> {
  if (booking.whatsapp_opt_in === false) {
    return { success: false, error: "Customer opted out of WhatsApp" };
  }

  const cancelUrl = booking.cancellation_token
    ? `${APP_URL}/cancel/${booking.cancellation_token}`
    : "";

  // Variable {{6}}: manage link (view, reschedule or cancel).
  // Requires the Twilio template to be updated — see note above.
  const manageUrl = booking.cancellation_token
    ? `${APP_URL}/manage/${booking.cancellation_token}`
    : "";

  return sendTemplate(booking.customer_phone, TEMPLATE_CONFIRMATION, {
    "1": booking.customer_name?.split(" ")[0] ?? "there",
    "2": business.name,
    "3": formatDate(booking.appointment_at),
    "4": formatTime(booking.appointment_at),
    "5": cancelUrl,
    "6": manageUrl,
  }, {
    businessId: booking.business_id,
    bookingId: booking.id,
    templateName: "appointment_confirmation",
  });
}

export async function sendAppointmentReminder(
  booking: BookingLike,
  business: BusinessLike
): Promise<WhatsAppResult> {
  if (booking.whatsapp_opt_in === false) {
    return { success: false, error: "Customer opted out of WhatsApp" };
  }

  return sendTemplate(booking.customer_phone, TEMPLATE_REMINDER, {
    "1": booking.customer_name?.split(" ")[0] ?? "there",
    "2": business.name,
    "3": formatTime(booking.appointment_at),
  }, {
    businessId: booking.business_id,
    bookingId: booking.id,
    templateName: "appointment_reminder",
  });
}

export async function sendReviewRequest(
  booking: BookingLike,
  business: BusinessLike
): Promise<WhatsAppResult> {
  if (booking.whatsapp_opt_in === false) {
    return { success: false, error: "Customer opted out of WhatsApp" };
  }

  const reviewUrl = `${APP_URL}/r/${booking.id}`;

  return sendTemplate(booking.customer_phone, TEMPLATE_REVIEW, {
    "1": booking.customer_name?.split(" ")[0] ?? "there",
    "2": business.name,
    "3": reviewUrl,
  }, {
    businessId: booking.business_id,
    bookingId: booking.id,
    templateName: "review_request",
  });
}

export async function sendManualReviewRequest(
  customer: { name: string; phone: string },
  business: { id: string; name: string }
): Promise<WhatsAppResult> {
  const reviewUrl = `${APP_URL}/review-invite/${business.id}`;
  return sendTemplate(customer.phone, TEMPLATE_REVIEW, {
    "1": customer.name.trim().split(/\s+/)[0] ?? "there",
    "2": business.name,
    "3": reviewUrl,
  }, {
    businessId: business.id,
    templateName: "review_request_manual",
  });
}

export async function sendRebookingNudge(
  customer: CustomerProfileLike,
  business: BusinessLike,
  type: "pattern" | "lapsed",
  weeksSince: number
): Promise<WhatsAppResult> {
  const bookingUrl = business.booking_slug
    ? `${APP_URL}/book/${business.booking_slug}`
    : APP_URL;

  const templateSid = type === "pattern" ? TEMPLATE_NUDGE_PATTERN : TEMPLATE_NUDGE_LAPSED;
  const templateName = type === "pattern" ? "nudge_pattern" : "nudge_lapsed";

  const variables: Record<string, string> = type === "pattern"
    ? {
        "1": customer.name?.split(" ")[0] ?? "there",
        "2": business.name,
        "3": bookingUrl,
      }
    : {
        "1": customer.name?.split(" ")[0] ?? "there",
        "2": business.name,
        "3": String(weeksSince),
        "4": bookingUrl,
      };

  return sendTemplate(customer.phone, templateSid, variables, {
    businessId: business.id,
    templateName,
  });
}
