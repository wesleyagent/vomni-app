import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getWeeklyRedirectCap(accountAgeWeeks: number): number {
  if (accountAgeWeeks <= 4)  return 5;
  if (accountAgeWeeks <= 8)  return 15;
  if (accountAgeWeeks <= 12) return 30;
  return 50;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: businesses, error: fetchError } = await supabase
    .from("businesses")
    .select("id, created_at");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!businesses || businesses.length === 0) {
    return NextResponse.json({ updated: 0, timestamp: new Date().toISOString() });
  }

  const now = new Date();
  let updated = 0;

  for (const business of businesses) {
    const createdAt       = new Date(business.created_at);
    const ageMs           = now.getTime() - createdAt.getTime();
    const accountAgeWeeks = Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000));
    const weeklyRedirectCap = getWeeklyRedirectCap(accountAgeWeeks);

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        weekly_google_redirects:  0,
        weekly_redirect_reset_at: now.toISOString(),
        account_age_weeks:        accountAgeWeeks,
        weekly_redirect_cap:      weeklyRedirectCap,
      })
      .eq("id", business.id);

    if (!updateError) updated++;
  }

  return NextResponse.json({ updated, timestamp: now.toISOString() });
}
