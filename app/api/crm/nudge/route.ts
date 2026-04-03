import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";
import { sendRebookingNudge } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/crm/nudge — Manual nudge from CRM dashboard
// Rate limited: max 10 per hour per business
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { business_id: string; customer_phone: string; nudge_type: "pattern" | "lapsed" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, customer_phone, nudge_type } = body;
  if (!business_id || !customer_phone || !nudge_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, business_id, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  // Rate limit: 10 nudges per hour per business
  if (!checkRateLimit(`crm-nudge:${business_id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Nudge rate limit exceeded (10/hour)" }, { status: 429 });
  }

  // Check 7-day cooldown per customer
  const { data: recentNudge } = await supabaseAdmin
    .from("crm_nudges")
    .select("id")
    .eq("business_id", business_id)
    .eq("customer_phone", customer_phone)
    .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (recentNudge) {
    return NextResponse.json({ error: "Customer was nudged within the last 7 days" }, { status: 429 });
  }

  // Get customer profile
  const { data: cp } = await supabaseAdmin
    .from("customer_profiles")
    .select("phone, name, last_visit_at, nudge_count")
    .eq("business_id", business_id)
    .eq("phone", customer_phone)
    .single();

  if (!cp) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Get business
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("id, name, booking_slug")
    .eq("id", business_id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const lastVisit = cp.last_visit_at ? new Date(cp.last_visit_at as string) : null;
  const weeksSince = lastVisit
    ? Math.floor((Date.now() - lastVisit.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;

  const result = await sendRebookingNudge(
    { phone: cp.phone, name: cp.name as string | null },
    { id: biz.id, name: biz.name, booking_slug: biz.booking_slug },
    nudge_type,
    weeksSince
  );

  // Log to crm_nudges
  await supabaseAdmin.from("crm_nudges").insert({
    business_id,
    customer_phone,
    nudge_type,
    message_sid: result.messageSid ?? null,
    weeks_since_last_visit: weeksSince,
  });

  // Update customer profile
  await supabaseAdmin.from("customer_profiles").update({
    nudge_sent_at: new Date().toISOString(),
    nudge_count: ((cp.nudge_count as number) ?? 0) + 1,
  }).eq("business_id", business_id).eq("phone", customer_phone);

  return NextResponse.json({ success: result.success, messageSid: result.messageSid });
}
