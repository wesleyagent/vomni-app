import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { normaliseToE164, maskPhone, fingerprintPhone } from "@/lib/phone";
import { randomBytes } from "crypto";

// POST /api/booking/[slug]/waitlist — Join the waitlist for a specific date+time slot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const ip = getClientIP(req);
  if (!checkRateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: {
    date: string;
    time: string;
    service_id?: string;
    staff_id?: string;
    customer_name: string;
    customer_phone: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { date, time, service_id, staff_id, customer_name, customer_phone } = body;

  if (!date || !time || !customer_name || !customer_phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, booking_enabled")
    .eq("booking_slug", slug)
    .single();

  if (!business || !business.booking_enabled) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Normalise phone — fall back to basic sanitise if normalisation fails
  let phoneE164: string;
  let phoneDisplay: string;
  let phoneFingerprint: string;

  try {
    phoneE164 = normaliseToE164(customer_phone);
    phoneDisplay = maskPhone(phoneE164);
    phoneFingerprint = fingerprintPhone(phoneE164, business.id);
  } catch {
    // If normalisation fails, store as-is but still mask
    const sanitised = customer_phone.replace(/[^\d+\-() ]/g, "").trim().slice(0, 20);
    phoneDisplay = sanitised;
    phoneFingerprint = `raw:${sanitised}:${business.id}`;
  }

  // Deduplicate check (belt-and-suspenders before the unique index fires)
  const { data: existing } = await supabaseAdmin
    .from("waitlist")
    .select("id")
    .eq("phone_fingerprint", phoneFingerprint)
    .eq("business_id", business.id)
    .eq("requested_date", date)
    .eq("requested_time", time)
    .not("status", "in", '("cancelled","confirmed","expired")')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You are already on the waitlist for this slot" },
      { status: 409 }
    );
  }

  // Compute next position for this slot
  const { data: posRow } = await supabaseAdmin
    .from("waitlist")
    .select("position")
    .eq("business_id", business.id)
    .eq("requested_date", date)
    .eq("requested_time", time)
    .not("status", "in", '("cancelled","confirmed","expired")')
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (posRow?.position ?? 0) + 1;

  // Generate tokens
  const confirmationToken = randomBytes(24).toString("hex");
  const cancellationToken = randomBytes(24).toString("hex");

  const { error: insertErr } = await supabaseAdmin.from("waitlist").insert({
    business_id:       business.id,
    service_id:        service_id ?? null,
    staff_id:          staff_id && staff_id !== "any" ? staff_id : null,
    requested_date:    date,
    requested_time:    time,
    customer_name:     customer_name.trim().slice(0, 100),
    customer_phone:    phoneDisplay,
    phone_fingerprint: phoneFingerprint,
    position:          nextPosition,
    status:            "waiting",
    confirmation_token: confirmationToken,
    cancellation_token: cancellationToken,
  });

  if (insertErr) {
    // Unique constraint violation means race-condition duplicate
    if ((insertErr as any).code === "23505") {
      return NextResponse.json(
        { error: "You are already on the waitlist for this slot" },
        { status: 409 }
      );
    }
    console.error("[waitlist/join] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

  return NextResponse.json({
    success: true,
    position: nextPosition,
    cancel_url: `${APP_URL}/waitlist/cancel/${cancellationToken}`,
  });
}
