import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface BizWithEmail {
  id: string;
  name: string | null;
  owner_name: string | null;
  notification_email: string | null;
  owner_email: string | null;
  business_type: string | null;
}

export async function GET() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const resendKey  = process.env.RESEND_API_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";

  if (!serviceKey || !url || !resendKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey);

  // Find all active businesses
  const { data: businesses } = await admin
    .from("businesses")
    .select("id, name, owner_name, notification_email, owner_email, business_type")
    .eq("status", "active")
    .not("plan", "is", null);

  if (!businesses || businesses.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().split("T")[0];

  // Filter: only send if not already sent this week
  const { data: alreadySent } = await admin
    .from("weekly_reports")
    .select("business_id")
    .eq("week_starting", weekStart);

  const sentIds = new Set((alreadySent ?? []).map((r: { business_id: string }) => r.business_id));

  let sentCount = 0;

  for (const biz of (businesses as BizWithEmail[])) {
    if (sentIds.has(biz.id)) continue;

    const toEmail = biz.notification_email || biz.owner_email;
    if (!toEmail) continue;

    // Get this week's stats
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: bookings } = await admin
      .from("bookings")
      .select("id, review_status, rating")
      .eq("business_id", biz.id)
      .gte("created_at", weekAgo);

    const allBookings = bookings ?? [];
    const reviewsSent     = allBookings.filter((b: { review_status: string | null }) => b.review_status && b.review_status !== "pending").length;
    const googleReviews   = allBookings.filter((b: { review_status: string | null }) => b.review_status === "redirected").length;
    const negativeCaught  = allBookings.filter((b: { review_status: string | null }) => b.review_status === "reviewed_negative").length;
    const ratingArr       = allBookings.filter((b: { rating: number | null }) => b.rating != null).map((b: { rating: number }) => b.rating);
    const avgRating       = ratingArr.length > 0 ? (ratingArr.reduce((a: number, b: number) => a + b, 0) / ratingArr.length).toFixed(1) : null;

    // Generate one AI insight
    let aiInsight = "";
    if (anthropicKey && allBookings.length > 0) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-20250514",
            max_tokens: 150,
            system: "You generate concise, specific weekly insights for service business owners about their review performance. One sentence only. Actionable. No fluff.",
            messages: [{
              role: "user",
              content: `Business: ${biz.name} (${biz.business_type || "service business"}). This week: ${googleReviews} Google reviews, ${negativeCaught} negative caught, ${reviewsSent} total requests, avg rating ${avgRating ?? "unknown"}. Write one specific actionable insight.`,
            }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          aiInsight = data.content?.[0]?.text?.trim() || "";
        }
      } catch { /* skip */ }
    }

    const firstName = biz.owner_name?.split(" ")[0] ?? "there";

    const htmlBody = `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, -apple-system, sans-serif; color: #0A0F1E; background: #F7F8FA; padding: 32px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; border: 1px solid #E5E7EB;">
    <p style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 20px; font-weight: 700; color: #00C896; margin: 0 0 4px;">vomni</p>
    <h1 style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 26px; font-weight: 800; color: #0A0F1E; margin: 0 0 24px;">
      Your weekly summary, ${firstName}
    </h1>

    <div style="display: grid; gap: 12px; margin-bottom: 24px;">
      <div style="background: rgba(0,200,150,0.06); border: 1px solid rgba(0,200,150,0.2); border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; color: #6B7280;">Google reviews generated</span>
        <span style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 28px; font-weight: 800; color: #00C896;">${googleReviews}</span>
      </div>
      <div style="background: rgba(0,200,150,0.06); border: 1px solid rgba(0,200,150,0.2); border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; color: #6B7280;">Negative reviews caught</span>
        <span style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 28px; font-weight: 800; color: #0A0F1E;">${negativeCaught}</span>
      </div>
      ${avgRating ? `<div style="background: rgba(0,200,150,0.06); border: 1px solid rgba(0,200,150,0.2); border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; color: #6B7280;">Average rating this week</span>
        <span style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 28px; font-weight: 800; color: #00C896;">${avgRating} ★</span>
      </div>` : ""}
    </div>

    ${aiInsight ? `
    <div style="background: rgba(0,200,150,0.04); border-left: 4px solid #00C896; border-radius: 0 12px 12px 0; padding: 16px 20px; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; color: #00C896; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px;">This week's insight</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0;">${aiInsight}</p>
    </div>` : ""}

    <a href="https://vomni-app.vercel.app/dashboard" style="display: inline-block; padding: 14px 28px; border-radius: 10px; background: #00C896; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600;">
      View full dashboard →
    </a>

    <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px;">
      You're receiving this because you're a Vomni customer. <a href="mailto:support@vomni.app" style="color: #9CA3AF;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;

    // Send email
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    "Vomni Weekly <nicky@vomni.app>",
          to:      [toEmail],
          subject: `Your Vomni weekly summary - ${googleReviews} reviews, ${negativeCaught} caught`,
          html:    htmlBody,
        }),
      });

      if (emailRes.ok) {
        // Record the report
        await admin.from("weekly_reports").insert({
          business_id:   biz.id,
          week_starting: weekStart,
          data_json: { googleReviews, negativeCaught, reviewsSent, avgRating },
        });
        sentCount++;
      }
    } catch { /* skip this business */ }
  }

  return NextResponse.json({ sent: sentCount, total: businesses.length });
}
