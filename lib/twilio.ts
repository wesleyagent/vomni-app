// ============================================================================
// Twilio SMS — uses REST API directly (no SDK dependency)
// Number routing: Israeli (+972) → TWILIO_IL_PHONE_NUMBER
//                 UK (+44)       → TWILIO_UK_PHONE_NUMBER
//                 Default        → TWILIO_PHONE_NUMBER
// ============================================================================

import { supabaseAdmin } from "@/lib/supabase-admin";

const ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID   ?? "";
const AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN     ?? "";
const FROM_NUMBER   = process.env.TWILIO_PHONE_NUMBER   ?? "";
const IL_NUMBER     = process.env.TWILIO_IL_PHONE_NUMBER  ?? FROM_NUMBER;
const UK_NUMBER     = process.env.TWILIO_UK_PHONE_NUMBER  ?? FROM_NUMBER;
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM  ?? "whatsapp:+14155238886";

export interface SMSMeta {
  businessId?: string;
  bookingId?: string;
  messageType?: string; // e.g. "confirmation" | "cancellation" | "reminder" | "nudge"
}

export type SMSResult = { success: true; sid: string } | { success: false; error: string };

/** Pick the Twilio FROM number based on the destination number prefix */
function routeFromNumber(normalisedTo: string): string {
  if (normalisedTo.startsWith("+972")) return IL_NUMBER || FROM_NUMBER;
  if (normalisedTo.startsWith("+44"))  return UK_NUMBER || FROM_NUMBER;
  return FROM_NUMBER;
}

/** Send an SMS via Twilio REST API */
export async function sendSMS(to: string, body: string, meta?: SMSMeta): Promise<SMSResult> {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.warn("[twilio] Missing credentials — SMS not sent");
    return { success: false, error: "Missing Twilio credentials" };
  }

  const normalised = normalisePhone(to);
  const fromNumber = routeFromNumber(normalised);
  if (!fromNumber) {
    return { success: false, error: "No Twilio FROM number configured for this region" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const creds = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: fromNumber, To: normalised, Body: body }).toString(),
    });

    const data = await res.json() as { sid?: string; message?: string; code?: number };

    const success = res.ok;
    // Log every attempt (fire-and-forget, never log raw phone)
    supabaseAdmin.from("sms_log").insert({
      business_id:   meta?.businessId ?? null,
      booking_id:    meta?.bookingId  ?? null,
      message_sid:   data.sid ?? null,
      message_type:  meta?.messageType ?? "sms",
      status:        success ? "sent" : "failed",
      error_message: success ? null : (data.message ?? `HTTP ${res.status}`),
    }).then(() => {}, (err) => console.error("[twilio] sms_log insert error:", err));

    if (!success) {
      console.error("[twilio] SMS failed:", data.message ?? res.status);
      return { success: false, error: data.message ?? "Twilio error" };
    }

    return { success: true, sid: data.sid! };
  } catch (err) {
    console.error("[twilio] fetch error:", err);
    supabaseAdmin.from("sms_log").insert({
      business_id:   meta?.businessId ?? null,
      booking_id:    meta?.bookingId  ?? null,
      message_sid:   null,
      message_type:  meta?.messageType ?? "sms",
      status:        "failed",
      error_message: String(err).slice(0, 500),
    }).then(() => {}, () => {});
    return { success: false, error: "Network error" };
  }
}

/** Send a WhatsApp message via Twilio */
export async function sendWhatsApp(to: string, body: string): Promise<SMSResult> {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    return { success: false, error: "Missing Twilio credentials" };
  }

  const normalised = `whatsapp:${normalisePhone(to)}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const creds = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: WHATSAPP_FROM, To: normalised, Body: body }).toString(),
    });

    const data = await res.json() as { sid?: string; message?: string };
    if (!res.ok) return { success: false, error: data.message ?? "WhatsApp error" };
    return { success: true, sid: data.sid! };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Send via preferred channel (WhatsApp if enabled, otherwise SMS) */
export async function sendBookingMessage(
  to: string,
  body: string,
  useWhatsApp = false,
  meta?: SMSMeta
): Promise<SMSResult> {
  if (useWhatsApp) return sendWhatsApp(to, body);
  return sendSMS(to, body, meta);
}

/** Normalise a phone number to E.164 format.
 *  Handles Israeli (IL) and UK numbers.
 *  Disambiguation for 0-prefix: IL numbers are 10 digits (05xxxxxxxx),
 *  UK numbers are 11 digits (07xxxxxxxxx / 01xxxxxxxxx). */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;          // IL with country code
  if (digits.startsWith("44"))  return `+${digits}`;          // UK with country code
  if (digits.startsWith("0") && digits.length === 10) return `+972${digits.slice(1)}`; // IL local
  if (digits.startsWith("0") && digits.length === 11) return `+44${digits.slice(1)}`;  // UK local
  if (!phone.startsWith("+")) return `+${digits}`;
  return phone;
}
