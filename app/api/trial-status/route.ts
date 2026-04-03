import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TRIAL_DAYS = 14;

// GET /api/trial-status?business_id=xxx
// Returns { isTrial, daysRemaining, trialExpired } calculated server-side.
// Read-only — does NOT modify any data. Downgrade logic lives in cron/downgrade-expired-trials.
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

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

  return NextResponse.json({ isTrial: true, daysRemaining, trialExpired });
}
