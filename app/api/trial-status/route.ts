import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TRIAL_DAYS = 14;

// Ensure the trial_start_date column exists (idempotent)
let _migrated = false;
async function ensureColumn() {
  if (_migrated) return;
  await supabaseAdmin.rpc("exec_sql", {
    query: "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NULL",
  }).catch(() => {
    // If rpc doesn't exist, the column may already be there — not fatal
  });
  _migrated = true;
}

// GET /api/trial-status?business_id=xxx
// Returns { isTrial, daysRemaining, trialExpired } calculated server-side
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  await ensureColumn();

  const { data: biz, error } = await supabaseAdmin
    .from("businesses")
    .select("trial_start_date, plan, lemon_subscription_id")
    .eq("id", businessId)
    .single();

  if (error || !biz) {
    return NextResponse.json({ isTrial: false, daysRemaining: 0, trialExpired: false });
  }

  if (!biz.trial_start_date) {
    return NextResponse.json({ isTrial: false, daysRemaining: 0, trialExpired: false });
  }

  const startDate = new Date(biz.trial_start_date);
  const now = new Date();
  const elapsedMs = now.getTime() - startDate.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, TRIAL_DAYS - elapsedDays);
  const trialExpired = daysRemaining === 0;

  // If trial expired and they're still on "pro" without a subscription, downgrade
  if (trialExpired && biz.plan === "pro" && !biz.lemon_subscription_id) {
    await supabaseAdmin
      .from("businesses")
      .update({ plan: "trial_expired" })
      .eq("id", businessId);
  }

  return NextResponse.json({ isTrial: true, daysRemaining, trialExpired });
}
