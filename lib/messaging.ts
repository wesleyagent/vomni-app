/**
 * Central message routing for Vomni.
 *
 * Routing rules:
 *   Israeli (ILS / +972)  → Resend email (WhatsApp Business number pending approval)
 *   UK      (GBP / +44)   → SMS via Twilio, gated by SMS_UK_ENABLED env var
 *
 * Usage:
 *   shouldRouteToEmail(phone, currency) → true if we should send email via Resend
 *   shouldSendSMS(phone, currency)      → true if we should send SMS via Twilio
 */

export function isIsraeliPhone(phone?: string | null): boolean {
  return !!phone && phone.startsWith("+972");
}

export function isUKPhone(phone?: string | null): boolean {
  return !!phone && phone.startsWith("+44");
}

export function smsUKEnabled(): boolean {
  return process.env.SMS_UK_ENABLED === "true";
}

/** Returns true if this customer should receive email via Resend instead of SMS/WhatsApp */
export function shouldRouteToEmail(phone?: string | null, currency?: string | null): boolean {
  if (currency === "ILS") return true;
  if (isIsraeliPhone(phone)) return true;
  return false;
}

/**
 * Returns true if SMS should be sent via Twilio.
 * Israeli customers → always false (use email).
 * UK customers     → only if SMS_UK_ENABLED=true.
 */
export function shouldSendSMS(phone?: string | null, currency?: string | null): boolean {
  if (shouldRouteToEmail(phone, currency)) return false;
  if (currency === "GBP" || isUKPhone(phone)) return smsUKEnabled();
  return true;
}
