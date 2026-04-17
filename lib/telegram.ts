// ============================================================================
// Telegram — send alert messages to Nicky's Telegram via Bot API
// Env vars required:
//   TELEGRAM_BOT_TOKEN  — from BotFather (e.g. 123456:ABC-DEF...)
//   TELEGRAM_CHAT_ID    — Nicky's personal chat ID (get via /getUpdates)
// ============================================================================

import type { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

export async function sendTelegramAlert(_message: string): Promise<void> {
  // Telegram notifications disabled — alerts are logged to DB (admin panel) only
  return;
}

/** Log an alert to the system_alerts table for the admin dashboard */
async function logAlert(
  type: "cron" | "sentry" | "warning",
  name: string,
  status: "success" | "failure",
  detail: string,
  duration_ms?: number,
  path?: string
): Promise<void> {
  try {
    await supabaseAdmin.from("system_alerts").insert({
      type,
      name,
      status,
      detail,
      duration_ms: duration_ms ?? null,
      path: path ?? null,
    });
  } catch (err) {
    console.error("[telegram] Failed to log alert to DB:", err);
  }
}

/**
 * Log a calendar disconnect event to system_alerts + Telegram.
 * Called when a token refresh fails and the connection is deactivated.
 */
export async function logCalendarDisconnect(
  provider: string,
  businessId: string,
  email: string | null,
  reason: string,
): Promise<void> {
  const detail = `${provider} token refresh failed for business ${businessId}${email ? ` (${email})` : ""}: ${reason}`;
  await Promise.all([
    logAlert("warning", `calendar-disconnect-${provider}`, "failure", detail),
    sendTelegramAlert(
      `🔌 <b>Calendar Disconnected — ${provider}</b>\n` +
      `<b>Business:</b> ${businessId}\n` +
      `<b>Email:</b> ${email ?? "unknown"}\n` +
      `<b>Reason:</b> ${reason}\n` +
      `<b>Time:</b> ${new Date().toISOString()}\n` +
      `ℹ️ Business owner needs to reconnect their calendar.`
    ),
  ]);
}

/** Log a Sentry error to system_alerts (called from sentry.server.config.ts) */
export async function logSentryAlert(
  errorType: string,
  errorMsg: string,
  route: string
): Promise<void> {
  await logAlert("sentry", errorType, "failure", `${errorMsg} @ ${route}`);
}

/**
 * Wraps a cron GET handler with Telegram health alerts + DB logging.
 * Sends ✅ on success (2xx) and ❌ on failure (5xx or thrown error).
 * Auth failures (401) are silently ignored — not a health issue.
 */
export function withCronMonitoring(
  name: string,
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = Date.now();
    try {
      const response = await handler(req);
      const ms = Date.now() - start;

      // Auth failures are not cron health issues — skip them
      if (response.status === 401) return response;

      let body = "";
      try {
        body = JSON.stringify(await response.clone().json());
      } catch { /* ignore */ }

      if (response.status >= 500) {
        await Promise.all([
          sendTelegramAlert(
            `❌ <b>Cron FAILED — ${name}</b>\n` +
            `<b>Status:</b> ${response.status}\n` +
            `<b>Detail:</b> ${body}\n` +
            `<b>Duration:</b> ${ms}ms\n` +
            `<b>Time:</b> ${new Date().toISOString()}`
          ),
          logAlert("cron", name, "failure", body, ms),
        ]);
      } else {
        await Promise.all([
          sendTelegramAlert(
            `✅ <b>Cron OK — ${name}</b>\n` +
            `<b>Result:</b> ${body}\n` +
            `<b>Duration:</b> ${ms}ms\n` +
            `<b>Time:</b> ${new Date().toISOString()}`
          ),
          logAlert("cron", name, "success", body, ms),
        ]);
      }

      return response;
    } catch (err) {
      const ms = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      await Promise.all([
        sendTelegramAlert(
          `❌ <b>Cron CRASHED — ${name}</b>\n` +
          `<b>Error:</b> ${msg}\n` +
          `<b>Duration:</b> ${ms}ms\n` +
          `<b>Time:</b> ${new Date().toISOString()}`
        ),
        logAlert("cron", name, "failure", msg, ms),
      ]);
      throw err;
    }
  };
}
