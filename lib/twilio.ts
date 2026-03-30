// ============================================================================
// Twilio SMS — uses REST API directly (no SDK dependency)
// ============================================================================

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

export type SMSResult = { success: true; sid: string } | { success: false; error: string };

/** Send an SMS via Twilio REST API */
export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    console.warn("[twilio] Missing credentials — SMS not sent");
    return { success: false, error: "Missing Twilio credentials" };
  }

  const normalised = normalisePhone(to);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const creds = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: FROM_NUMBER, To: normalised, Body: body }).toString(),
    });

    const data = await res.json() as { sid?: string; message?: string; code?: number };

    if (!res.ok) {
      console.error("[twilio] SMS failed:", data.message ?? res.status);
      return { success: false, error: data.message ?? "Twilio error" };
    }

    return { success: true, sid: data.sid! };
  } catch (err) {
    console.error("[twilio] fetch error:", err);
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
  useWhatsApp = false
): Promise<SMSResult> {
  if (useWhatsApp) return sendWhatsApp(to, body);
  return sendSMS(to, body);
}

/** Normalise an Israeli phone number to E.164 format */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  if (!phone.startsWith("+")) return `+${digits}`;
  return phone;
}
