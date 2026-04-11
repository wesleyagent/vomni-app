/**
 * POST /api/webhooks/twilio-stop
 * Called by Twilio when a customer sends an inbound SMS to any of our numbers.
 * Validates Twilio signature. Handles opt-out / opt-in keywords by updating
 * the customer_profiles table.
 *
 * Twilio also handles STOP/START at the carrier level for US numbers, but for
 * IL (+972) and UK (+44) numbers we must manage opt-outs ourselves.
 *
 * STOP keywords  → opted_out = true,  opted_out_type = 'all'
 * START keywords → opted_out = false, opted_out_type = null  (opt back in)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import { supabaseAdmin }             from "@/lib/supabase-admin";
import { normaliseToE164, maskPhone, fingerprintPhone } from "@/lib/phone";

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// STOP variants per CTIA guidelines + common extras
const STOP_KEYWORDS  = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
// Opt back-in keywords
const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);

// ── Twilio signature validation ────────────────────────────────────────────────

function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let s = url;
  for (const k of sortedKeys) s += k + (params[k] ?? "");
  const expected = createHmac("sha1", authToken).update(s).digest("base64");
  return expected === signature;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-twilio-signature") ?? "";

    // Parse URL-encoded form body (Twilio format)
    const bodyText = await req.text();
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(bodyText)) {
      params[k] = v;
    }

    // Validate Twilio signature (skip if AUTH_TOKEN not set — local dev only)
    const webhookUrl = `${APP_URL}/api/webhooks/twilio-stop`;
    if (AUTH_TOKEN && !validateTwilioSignature(AUTH_TOKEN, webhookUrl, params, signature)) {
      console.warn("[twilio-stop] Invalid signature — possible spoofed request");
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fromRaw = params["From"] ?? "";
    const keyword = (params["Body"] ?? "").trim().toUpperCase();

    const isStop  = STOP_KEYWORDS.has(keyword);
    const isStart = START_KEYWORDS.has(keyword);

    // Ignore irrelevant messages — return 200 immediately
    if (!isStop && !isStart) {
      return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Normalise to E.164
    let e164: string;
    try {
      e164 = normaliseToE164(fromRaw);
    } catch {
      console.warn("[twilio-stop] Could not normalise phone:", fromRaw);
      return twimlResponse();
    }

    // customer_profiles.phone stores masked display values — raw E.164 never matches.
    // Fix: use maskPhone() to find candidate rows, then verify each row's
    // business-scoped phone_fingerprint before updating. This correctly opts
    // the customer out across ALL businesses they have a profile in.
    const maskedPhone = maskPhone(e164);

    // Step 1: find all customer_profile rows with a matching masked phone
    const { data: candidates, error: fetchErr } = await supabaseAdmin
      .from("customer_profiles")
      .select("id, business_id, phone_fingerprint")
      .eq("phone", maskedPhone);

    if (fetchErr) {
      console.error("[twilio-stop] candidate lookup error:", fetchErr.message);
      return twimlResponse();
    }

    if (!candidates || candidates.length === 0) {
      console.log(`[twilio-stop] No customer_profiles found for masked phone`);
      return twimlResponse();
    }

    // Step 2: verify fingerprint for each candidate (business-scoped SHA-256)
    // and collect IDs that truly belong to this E.164 number.
    const verifiedIds: string[] = [];
    for (const row of candidates) {
      const expected = fingerprintPhone(e164, row.business_id);
      if (expected === row.phone_fingerprint) {
        verifiedIds.push(row.id);
      }
    }

    if (verifiedIds.length === 0) {
      console.warn("[twilio-stop] No fingerprint-verified rows found — possible mask collision");
      return twimlResponse();
    }

    // Step 3: update all verified rows
    if (isStop) {
      const { error } = await supabaseAdmin
        .from("customer_profiles")
        .update({
          opted_out:      true,
          opted_out_at:   new Date().toISOString(),
          opted_out_type: "all",
        })
        .in("id", verifiedIds);

      if (error) {
        console.error("[twilio-stop] opt-out update error:", error.message);
      } else {
        console.log(`[twilio-stop] Opted out ${verifiedIds.length} profile(s)`);
      }
    } else {
      // isStart — customer opted back in
      const { error } = await supabaseAdmin
        .from("customer_profiles")
        .update({
          opted_out:      false,
          opted_out_at:   null,
          opted_out_type: null,
        })
        .in("id", verifiedIds);

      if (error) {
        console.error("[twilio-stop] opt-in update error:", error.message);
      } else {
        console.log(`[twilio-stop] Opted back in ${verifiedIds.length} profile(s)`);
      }
    }

    // Return empty TwiML — no reply SMS sent from our side
    return twimlResponse();
  } catch (err) {
    console.error("[twilio-stop] unexpected error:", err instanceof Error ? err.message : String(err));
    // Always 200 to Twilio — never leave the webhook failing
    return twimlResponse();
  }
}

function twimlResponse() {
  return new NextResponse(
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>",
    { status: 200, headers: { "Content-Type": "text/xml" } },
  );
}
