/**
 * POST /api/webhooks/twilio-whatsapp
 * Called by Twilio when a customer sends any message (including STOP).
 * Validates Twilio signature. Handles opt-out by setting opted_out = true.
 * Twilio also blocks future delivery at their end automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normaliseToE164 } from "@/lib/phone";

const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN ?? "";
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// ── Twilio signature validation ───────────────────────────────────────────────

function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  // Sort params, concatenate key+value pairs to the URL, HMAC-SHA1
  const sortedKeys = Object.keys(params).sort();
  let s = url;
  for (const k of sortedKeys) s += k + (params[k] ?? "");
  const expected = createHmac("sha1", authToken).update(s).digest("base64");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-twilio-signature") ?? "";

    // Parse URL-encoded body (Twilio sends form data)
    const bodyText = await req.text();
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(bodyText)) {
      params[k] = v;
    }

    // Validate Twilio signature
    const webhookUrl = `${APP_URL}/api/webhooks/twilio-whatsapp`;
    if (AUTH_TOKEN && !validateTwilioSignature(AUTH_TOKEN, webhookUrl, params, signature)) {
      console.warn("[twilio-whatsapp] Invalid signature");
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fromRaw = params["From"] ?? "";
    const body    = (params["Body"] ?? "").trim().toUpperCase();

    // Only act on STOP messages
    if (body !== "STOP") {
      return new NextResponse("OK", { status: 200 });
    }

    // Strip "whatsapp:" prefix if present
    const rawPhone = fromRaw.replace(/^whatsapp:/, "");

    // Normalise to E.164 — if we can't, we can't look up the customer
    let e164: string;
    try {
      e164 = normaliseToE164(rawPhone);
    } catch {
      // Unknown format — return 200 (Twilio handles the block at their end)
      return new NextResponse("OK", { status: 200 });
    }

    // Find all customer_profiles with this phone and mark opted_out
    // customer_profiles stores phone as E.164 in the `phone` column
    const { error } = await supabaseAdmin
      .from("customer_profiles")
      .update({
        opted_out: true,
        opted_out_at: new Date().toISOString(),
      })
      .eq("phone", e164);

    if (error) {
      console.error("[twilio-whatsapp] opt-out update error:", error.message);
      // Still return 200 — Twilio already blocks at their end
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[twilio-whatsapp] unexpected error:", err instanceof Error ? err.message : String(err));
    return new NextResponse("OK", { status: 200 }); // Always 200 to Twilio
  }
}
