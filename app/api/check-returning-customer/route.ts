import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Accept customer_name (single field from Make) or legacy first_name/last_name
  const {
    business_id,
    customer_name,
    customer_phone,
    action,
    // legacy field support
    first_name: legacyFirst,
    last_name:  legacyLast,
    phone:      legacyPhone,
  } = body;

  const phone = customer_phone || legacyPhone;

  if (!business_id || !phone) {
    return NextResponse.json(
      { error: "Missing required fields: business_id, customer_phone" },
      { status: 400 }
    );
  }

  // Split customer_name into first and last
  const nameParts = (customer_name || `${legacyFirst || ""} ${legacyLast || ""}`).trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName  = nameParts[nameParts.length - 1] || "";

  // Build fingerprint
  const raw         = `${firstName.toLowerCase()}_${lastName[0]?.toLowerCase() || "x"}_${String(phone).slice(-3)}`;
  const fingerprint = createHash("sha256").update(raw).digest("hex");

  // ── action: "check" — look up only, do not write ─────────────────────────
  if (action === "check") {
    const { data: existing, error: fetchError } = await supabase
      .from("customer_fingerprints")
      .select("id, last_sms_sent_at, sms_count")
      .eq("business_id", business_id)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ returning: false, fingerprint });
    }

    const lastSent     = new Date(existing.last_sms_sent_at);
    const withinWindow = Date.now() - lastSent.getTime() < NINETY_DAYS_MS;

    return NextResponse.json({
      returning:        withinWindow,
      last_sms_sent_at: existing.last_sms_sent_at,
      sms_count:        existing.sms_count,
      fingerprint,
    });
  }

  // ── action: "record_send" (or default) — look up and write ───────────────
  const { data: existing, error: fetchError } = await supabase
    .from("customer_fingerprints")
    .select("id, last_sms_sent_at, sms_count")
    .eq("business_id", business_id)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const now = new Date();

  // ── Case 1: No existing record — insert and return returning: false ──────
  if (!existing) {
    const { error: insertError } = await supabase
      .from("customer_fingerprints")
      .insert({
        business_id,
        fingerprint,
        last_sms_sent_at: now.toISOString(),
        sms_count: 1,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ returning: false, fingerprint });
  }

  const lastSent     = new Date(existing.last_sms_sent_at);
  const withinWindow = now.getTime() - lastSent.getTime() < NINETY_DAYS_MS;

  // ── Case 2: Found within 90 days — returning customer, skip SMS ──────────
  if (withinWindow) {
    return NextResponse.json({
      returning:        true,
      last_sms_sent_at: existing.last_sms_sent_at,
      sms_count:        existing.sms_count,
      fingerprint,
    });
  }

  // ── Case 3: Found but older than 90 days — reset window, allow SMS ───────
  const { error: updateError } = await supabase
    .from("customer_fingerprints")
    .update({
      last_sms_sent_at: now.toISOString(),
      sms_count:        (existing.sms_count ?? 0) + 1,
    })
    .eq("id", existing.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ returning: false, fingerprint });
}
