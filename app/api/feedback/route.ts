import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/feedback — Save a customer review/feedback
// Called from the review-invite page after star selection
export async function POST(req: NextRequest) {
  let body: {
    business_id: string;
    booking_id?: string | null;
    rating: number;
    feedback_text?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, booking_id, rating, feedback_text, customer_name, customer_phone } = body;

  if (!business_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("feedback").insert({
    business_id,
    booking_id:     booking_id    ?? null,
    rating,
    feedback_text:  feedback_text ?? null,
    customer_name:  customer_name ?? null,
    customer_phone: customer_phone ?? null,
    created_at:     new Date().toISOString(),
  });

  if (error) {
    console.error("[api/feedback] insert error:", error.message);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/feedback — Track Google redirect from review-invite (no booking_id)
// Increments weekly_google_redirects and creates dashboard notification
export async function PATCH(req: NextRequest) {
  let body: { business_id: string; customer_name?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, customer_name } = body;
  if (!business_id) return NextResponse.json({ error: "Missing business_id" }, { status: 400 });

  // Increment weekly_google_redirects
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("weekly_google_redirects")
    .eq("id", business_id)
    .single();

  if (biz) {
    await supabaseAdmin
      .from("businesses")
      .update({ weekly_google_redirects: (biz.weekly_google_redirects ?? 0) + 1 })
      .eq("id", business_id);
  }

  // Dashboard notification — deduplicate within 24h
  try {
    const customerLabel = customer_name ?? "A customer";
    const notifBody = `${customerLabel} was directed to leave a Google review.`;
    const { data: existing } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("business_id", business_id)
      .eq("type", "google_redirect")
      .ilike("body", `${customerLabel}%`)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("notifications").insert({
        business_id,
        type:  "google_redirect",
        title: "Customer sent to Google review",
        body:  notifBody,
        read:  false,
      });
    }
  } catch (e) {
    console.error("[api/feedback PATCH] notification failed:", e);
  }

  return NextResponse.json({ ok: true });
}
