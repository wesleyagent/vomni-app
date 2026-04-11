/**
 * Central message routing for Vomni.
 *
 * Routing rules:
 *   Israeli (ILS / +972)  → SMS via Twilio IL number (TWILIO_IL_PHONE_NUMBER)
 *   UK      (GBP / +44)   → SMS via Twilio UK number, gated by SMS_UK_ENABLED env var
 *
 * Usage:
 *   shouldSendSMS(phone, currency) → true if SMS should be sent via Twilio
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

/**
 * @deprecated All customer communications now use SMS/WhatsApp. Always returns false.
 * Kept to avoid breaking callers — remove in a future cleanup.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldRouteToEmail(_phone?: string | null, _currency?: string | null): boolean {
  return false;
}

/**
 * Returns true if SMS should be sent via Twilio.
 * Israeli customers → true (via TWILIO_IL_PHONE_NUMBER).
 * UK customers     → only if SMS_UK_ENABLED=true.
 */
export function shouldSendSMS(phone?: string | null, currency?: string | null): boolean {
  if (currency === "GBP" || isUKPhone(phone)) return smsUKEnabled();
  return true;
}
