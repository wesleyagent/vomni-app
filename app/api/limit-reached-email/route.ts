import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildEmail(opts: {
  ownerName: string;
  businessName: string;
  smsLimit: number;
  googleReviews: number;
  negativeCaught: number;
  completionRate: number;
  upgradePlan: string;
  upgradePrice: string;
  upgradeFeatures: string[];
  businessId: string;
  appUrl: string;
}) {
  const { ownerName, businessName, smsLimit, googleReviews, negativeCaught, completionRate, upgradePlan, upgradePrice, upgradeFeatures, businessId, appUrl } = opts;

  const topUpLinks = [
    { credits: 20,  price: "£9",  slug: "topup-20"  },
    { credits: 50,  price: "£20", slug: "topup-50"  },
    { credits: 100, price: "£35", slug: "topup-100" },
  ];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:Inter,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 20px;">
  <tr><td align="center">
  <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr><td style="background:#0A0F1E;padding:24px 36px;">
      <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:22px;color:#fff;letter-spacing:-0.5px;">vomni</span>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:32px 36px 0;">
      <p style="font-size:15px;color:#0A0F1E;margin:0 0 6px;font-weight:600;font-family:'Bricolage Grotesque',sans-serif;">Hi ${escapeHtml(ownerName)},</p>
      <p style="font-size:14px;color:#6B7280;margin:0 0 28px;line-height:1.7;">
        You have used all ${smsLimit} of your monthly review requests. Here is what Vomni did for you this month before they paused:
      </p>

      <!-- Stats -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-collapse:separate;border-spacing:8px;">
        <tr>
          <td style="width:32%;text-align:center;background:#F9FAFB;border-radius:12px;padding:18px 8px;border:1px solid #F0F0F0;">
            <div style="font-size:28px;font-weight:800;color:#0A0F1E;font-family:'Bricolage Grotesque',sans-serif;">${googleReviews}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:5px;line-height:1.4;">Google reviews generated</div>
          </td>
          <td style="width:32%;text-align:center;background:#F9FAFB;border-radius:12px;padding:18px 8px;border:1px solid #F0F0F0;">
            <div style="font-size:28px;font-weight:800;color:#0A0F1E;font-family:'Bricolage Grotesque',sans-serif;">${negativeCaught}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:5px;line-height:1.4;">Private feedback caught</div>
          </td>
          <td style="width:32%;text-align:center;background:#F9FAFB;border-radius:12px;padding:18px 8px;border:1px solid #F0F0F0;">
            <div style="font-size:28px;font-weight:800;color:#0A0F1E;font-family:'Bricolage Grotesque',sans-serif;">${completionRate}%</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:5px;line-height:1.4;">Completion rate</div>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid #F0F0F0;margin:0 0 24px;">

      <!-- Upgrade section -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf9;border:1.5px solid #6ee7d0;border-radius:14px;margin-bottom:24px;">
        <tr><td style="padding:22px 24px;">
          <p style="font-size:17px;font-weight:800;color:#0A0F1E;margin:0 0 14px;font-family:'Bricolage Grotesque',sans-serif;">
            Upgrade to ${escapeHtml(upgradePlan)} — ${escapeHtml(upgradePrice)}/month
          </p>
          ${upgradeFeatures.map(f => `
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
            <span style="color:#00C896;font-weight:700;font-size:14px;flex-shrink:0;">✓</span>
            <span style="font-size:13px;color:#374151;line-height:1.5;">${escapeHtml(f)}</span>
          </div>`).join("")}
          <br>
          <a href="${escapeHtml(appUrl)}/checkout/${escapeHtml(upgradePlan.toLowerCase())}?business_id=${escapeHtml(businessId)}"
             style="display:inline-block;padding:13px 28px;background:#00C896;color:#fff;text-decoration:none;border-radius:9999px;font-size:14px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;">
            Upgrade to ${escapeHtml(upgradePlan)} →
          </a>
        </td></tr>
      </table>

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid #F0F0F0;margin:0 0 16px;">

      <!-- Top-up section -->
      <p style="font-size:12px;color:#9CA3AF;margin:0 0 12px;">Need just a little more this month? Top up instead:</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px;">
        ${topUpLinks.map(t => `
        <a href="${escapeHtml(appUrl)}/checkout/${t.slug}?business_id=${escapeHtml(businessId)}"
           style="display:inline-block;padding:8px 16px;border:1.5px solid #D1D5DB;border-radius:9999px;font-size:12px;font-weight:600;color:#374151;text-decoration:none;background:#fff;">
          ${t.credits} credits — ${t.price}
        </a>`).join("")}
      </div>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:20px 36px;border-top:1px solid #F0F0F0;text-align:center;">
      <p style="font-size:12px;color:#D1D5DB;margin:0;">
        <a href="${escapeHtml(appUrl)}" style="color:#9CA3AF;text-decoration:none;">vomni.app</a>
        &nbsp;·&nbsp;
        <a href="mailto:hello@vomni.app" style="color:#9CA3AF;text-decoration:none;">hello@vomni.app</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(appUrl)}/dashboard/settings" style="color:#9CA3AF;text-decoration:none;">Unsubscribe</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const { business_id } = await req.json();
  if (!business_id) return NextResponse.json({ error: "Missing business_id" }, { status: 400 });

  const { data: biz, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("name, owner_name, owner_email, plan")
    .eq("id", business_id)
    .single();

  if (bizErr || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Fetch stats
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id, review_status, feedback!booking_id(rating)")
    .eq("business_id", business_id)
    .gte("created_at", monthStart);

  const total          = bookings?.length ?? 0;
  const googleReviews  = bookings?.filter((b: { review_status?: string }) => b.review_status === "reviewed").length ?? 0;
  const negativeCaught = bookings?.filter((b: { feedback?: Array<{ rating?: number }> }) => b.feedback && b.feedback.length > 0 && (b.feedback[0]?.rating ?? 5) <= 3).length ?? 0;
  const completionRate = total > 0 ? Math.round((googleReviews / total) * 100) : 0;

  const bizTyped   = biz as typeof biz & { plan?: string };
  const plan       = bizTyped.plan ?? "starter";
  const smsLimit   = plan === "growth" ? 300 : plan === "pro" ? 9999 : 100;
  const isStarter  = plan === "starter";
  const upgradePlan  = isStarter ? "Growth" : "Pro";
  const upgradePrice = isStarter ? "£79" : "£149";
  const upgradeFeatures = isStarter
    ? ["300 review requests every month — 3x more than Starter", "AI insights and suggested replies", "Full analytics dashboard", "Weekly performance email", "Cancel anytime"]
    : ["Your own dedicated SMS number", "Priority support", "Full analytics and weekly reports", "Cancel anytime"];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni-app.vercel.app";

  const html = buildEmail({
    ownerName: biz.owner_name ?? "there",
    businessName: biz.name ?? "Your business",
    smsLimit,
    googleReviews,
    negativeCaught,
    completionRate,
    upgradePlan,
    upgradePrice,
    upgradeFeatures,
    businessId: business_id,
    appUrl,
  });

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_ADDRESS ?? "alerts@vomni.app",
      to:   [biz.owner_email],
      subject: `Your review requests are paused — here is how to keep them running`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error("Resend error:", err);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sent_to: biz.owner_email });
}
