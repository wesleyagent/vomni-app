import * as Sentry from "@sentry/nextjs";
import { sendTelegramAlert, logSentryAlert } from "./lib/telegram";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,

  beforeSend(event, hint) {
    // ── Filter Next.js internal control-flow throws ──────────────────────────
    // notFound(), redirect(), etc. throw plain objects like { digest: "NEXT_NOT_FOUND" }.
    // These are not real errors — they're normal App Router control flow.
    // Without this filter, Sentry tries to access .stack on a non-Error object
    // → "Cannot read properties of undefined (reading 'stack')" (VONMI-2/3/4).
    const original = hint?.originalException;
    if (
      original != null &&
      typeof original === "object" &&
      "digest" in original &&
      typeof (original as { digest: unknown }).digest === "string" &&
      /^NEXT_/.test((original as { digest: string }).digest)
    ) {
      return null; // silently drop — not a real error
    }

    // Forward every captured error to Nicky's Telegram
    const err = event.exception?.values?.[0];
    const errorType = err?.type ?? "Error";
    const errorMsg = err?.value ?? "No message";
    const txn = event.transaction ?? event.request?.url ?? "unknown route";
    const env = event.environment ?? process.env.NODE_ENV ?? "production";
    const timestamp = new Date().toISOString();

    const text =
      `🚨 <b>Sentry Error — Vomni</b>\n` +
      `<b>Type:</b> ${errorType}\n` +
      `<b>Message:</b> ${errorMsg}\n` +
      `<b>Route:</b> ${txn}\n` +
      `<b>Env:</b> ${env}\n` +
      `<b>Time:</b> ${timestamp}`;

    // Fire-and-forget — never delay the response
    sendTelegramAlert(text).catch(() => {});
    logSentryAlert(errorType, errorMsg, txn).catch(() => {});

    return event; // Always return so Sentry still records it
  },
});
