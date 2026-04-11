import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { withCronMonitoring } from "@/lib/telegram";

async function handler(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = now.getDate(); // 1-31
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isLastDay = today === daysInMonth;

  // Fetch all businesses with a billing anchor day
  const { data: businesses, error: fetchError } = await supabaseAdmin
    .from("businesses")
    .select("id, billing_anchor_day");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Determine which businesses reset today
  const idsToReset = (businesses ?? [])
    .filter((biz: { id: string; billing_anchor_day: number | null }) => {
      const anchor = biz.billing_anchor_day;
      if (anchor === null || anchor === undefined) {
        // Legacy businesses without an anchor day: reset on the 1st
        return today === 1;
      }
      // Normal case: anchor day matches today
      if (anchor === today) return true;
      // Edge case: anchor day doesn't exist this month (e.g. 31 in a 30-day month)
      // Reset on the last day of the month instead
      if (anchor > daysInMonth && isLastDay) return true;
      return false;
    })
    .map((biz: { id: string }) => biz.id);

  if (idsToReset.length === 0) {
    return NextResponse.json({ success: true, reset_count: 0, reset_at: now.toISOString() });
  }

  // sms_sent_this_month and sms_limit_reset_at removed — credit system deprecated
  // Reset top_up_credits only (if it still exists)
  const { error: updateError } = await supabaseAdmin
    .from("businesses")
    .update({ top_up_credits: 0 })
    .in("id", idsToReset);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, reset_count: idsToReset.length, reset_at: now.toISOString() });
}

export const GET = withCronMonitoring("reset-sms-counters", handler);
