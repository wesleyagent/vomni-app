import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TRIAL_DAYS = 14;

// GET /api/cron/downgrade-expired-trials
// Runs daily at 4am. Finds businesses on "pro" trial with no subscription
// that have exceeded the trial period and downgrades them to "trial_expired".
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRIAL_DAYS);

  // Find businesses still on "pro" plan with a trial_start_date older than 14 days
  // and no active subscription
  const { data: expired, error } = await supabaseAdmin
    .from("businesses")
    .select("id, name, trial_start_date")
    .eq("plan", "pro")
    .is("lemon_subscription_id", null)
    .not("trial_start_date", "is", null)
    .lte("trial_start_date", cutoffDate.toISOString());

  if (error) {
    console.error("[cron/downgrade-expired-trials] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ downgraded: 0 });
  }

  const ids = expired.map(b => b.id);

  const { error: updateErr } = await supabaseAdmin
    .from("businesses")
    .update({ plan: "trial_expired" })
    .in("id", ids);

  if (updateErr) {
    console.error("[cron/downgrade-expired-trials] update error:", updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  console.log(`[cron/downgrade-expired-trials] downgraded ${ids.length} businesses`);
  return NextResponse.json({ downgraded: ids.length, businesses: expired.map(b => b.name) });
}
