import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireBusinessOwnership, requirePlan } from "@/lib/require-auth";
import { sendManualReviewRequest } from "@/lib/whatsapp";

// POST /api/crm/send-review-request
// Body: { business_id, name, phone }
// Sends a review request WhatsApp message and logs to whatsapp_log
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { business_id: string; name: string; phone: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, name, phone } = body;
  if (!business_id || !name || !phone) {
    return NextResponse.json({ error: "Missing required fields: business_id, name, phone" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, business_id, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  const planCheck = await requirePlan(business_id, "growth", supabaseAdmin);
  if (planCheck instanceof NextResponse) return planCheck;

  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("id, name")
    .eq("id", business_id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const result = await sendManualReviewRequest({ name, phone }, biz);

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true, messageSid: result.messageSid });
}
