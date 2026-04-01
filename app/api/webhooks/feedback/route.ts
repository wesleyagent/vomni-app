import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── Supabase Database Webhook ────────────────────────────────────────────
// Fires on INSERT into the `feedback` table.
// Looks up the business owner, then sends a Resend email:
//   rating 1-3 → urgent private-feedback alert
//   rating 4-5 → positive review notification

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verify webhook secret ───────────────────────────────────────
    if (WEBHOOK_SECRET) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // ── 2. Parse the Supabase webhook payload ──────────────────────────
    const payload = await req.json();
    // Supabase sends: { type: "INSERT", table: "feedback", record: {...}, ... }
    const feedback = payload.record;
    if (!feedback) {
      return NextResponse.json(
        { error: "No record in payload" },
        { status: 400 }
      );
    }

    const {
      business_id,
      booking_id,
      rating,
      feedback_text,
    } = feedback;

    if (!business_id || !rating) {
      return NextResponse.json(
        { error: "Missing business_id or rating" },
        { status: 400 }
      );
    }

    // ── 3. Look up business ────────────────────────────────────────────
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("name, owner_email, owner_name")
      .eq("id", business_id)
      .single();

    if (bizErr || !business) {
      console.error("Business lookup failed:", bizErr);
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    if (!business.owner_email) {
      console.error("Business has no owner_email:", business_id);
      return NextResponse.json(
        { error: "No owner email on file" },
        { status: 422 }
      );
    }

    // ── 4. Look up customer name from booking ──────────────────────────
    let customerName = "A customer";
    if (booking_id) {
      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select("customer_name")
        .eq("id", booking_id)
        .single();
      if (booking?.customer_name) {
        customerName = booking.customer_name;
      }
    }

    // ── 4b. Update booking review_status based on rating ───────────────
    if (booking_id) {
      const newStatus = rating <= 3 ? "reviewed_negative" : "reviewed_positive";
      await supabaseAdmin
        .from("bookings")
        .update({
          review_status: newStatus,
          rating: rating,
        })
        .eq("id", booking_id);
    }

    // ── 5. Build and send email ────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("RESEND_API_KEY not set");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const isNegative = rating <= 3;
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.app";

    const subject = isNegative
      ? `⚠️ New private feedback - ${customerName} left ${rating} star${rating === 1 ? "" : "s"}`
      : `⭐ New ${rating}-star review - ${customerName}`;

    const html = isNegative
      ? buildNegativeEmail({
          businessName: business.name ?? "Your Business",
          customerName,
          rating,
          stars,
          feedbackText: feedback_text ?? "",
          dashboardUrl: `${appUrl}/dashboard/feedback`,
        })
      : buildPositiveEmail({
          businessName: business.name ?? "Your Business",
          customerName,
          rating,
          stars,
          dashboardUrl: `${appUrl}/dashboard/feedback`,
        });

    const fromAddress =
      process.env.RESEND_FROM_ADDRESS ?? "Vomni <onboarding@resend.dev>";

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: business.owner_email,
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", emailRes.status, errBody);
      return NextResponse.json(
        { error: "Email send failed" },
        { status: 502 }
      );
    }

    console.log(
      `✅ Feedback email sent to ${business.owner_email} (${rating}★ from ${customerName})`
    );

    // Send push notification to business (non-blocking)
    try {
      const { data: tokens } = await supabaseAdmin
        .from('device_tokens')
        .select('token')
        .eq('business_id', business_id);

      if (tokens && tokens.length > 0) {
        const messages = tokens.map((t: { token: string }) => ({
          to: t.token,
          title: 'New review',
          body: `⭐ ${customerName} left you a ${rating}-star review`,
          data: { type: 'new_review' },
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });
      }
    } catch (e) {
      console.error('Push notification failed:', e);
    }

    return NextResponse.json({ success: true, emailSentTo: business.owner_email });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Email Templates ──────────────────────────────────────────────────────

function buildNegativeEmail(p: {
  businessName: string;
  customerName: string;
  rating: number;
  stars: string;
  feedbackText: string;
  dashboardUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">

    <!-- Header -->
    <div style="background:#0A0F1E;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#FF6B6B;font-size:22px;margin:0 0 8px;">⚠️ Private Feedback Alert</h1>
      <p style="color:rgba(255,255,255,0.7);margin:0;font-size:15px;">${escapeHtml(p.businessName)}</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:32px;border-radius:0 0 12px 12px;">

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        You have received private feedback that <strong>did not go public</strong>. Vomni caught this before it reached Google.
      </p>

      <!-- Rating -->
      <div style="text-align:center;margin:0 0 20px;">
        <span style="font-size:32px;letter-spacing:4px;color:#FF6B6B;">${p.stars}</span>
        <p style="margin:6px 0 0;font-size:13px;color:#6B7280;">${escapeHtml(p.customerName)} left ${p.rating} star${p.rating === 1 ? "" : "s"}</p>
      </div>

      <!-- Feedback box -->
      ${
        p.feedbackText
          ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;color:#991B1B;line-height:1.6;white-space:pre-wrap;">${escapeHtml(p.feedbackText)}</p>
      </div>`
          : ""
      }

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 0;">
        <a href="${p.dashboardUrl}" style="display:inline-block;background:#00C896;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Log in to respond
        </a>
      </div>

      <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:24px 0 0;">
        Responding quickly to negative feedback increases the chance of recovery by 70%.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="font-size:12px;color:#9CA3AF;margin:0;">Sent by <strong style="color:#00C896;">Vomni</strong> - Protecting your reputation, one review at a time.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildPositiveEmail(p: {
  businessName: string;
  customerName: string;
  rating: number;
  stars: string;
  dashboardUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">

    <!-- Header -->
    <div style="background:#0A0F1E;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#00C896;font-size:22px;margin:0 0 8px;">⭐ Great News!</h1>
      <p style="color:rgba(255,255,255,0.7);margin:0;font-size:15px;">${escapeHtml(p.businessName)}</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:32px;border-radius:0 0 12px 12px;">

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        Great news - <strong>${escapeHtml(p.customerName)}</strong> left you a positive review!
      </p>

      <!-- Rating -->
      <div style="text-align:center;margin:0 0 20px;">
        <span style="font-size:32px;letter-spacing:4px;color:#F59E0B;">${p.stars}</span>
        <p style="margin:6px 0 0;font-size:13px;color:#6B7280;">${p.rating} star${p.rating === 1 ? "" : "s"}</p>
      </div>

      <!-- Google redirect notice -->
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:20px;margin:0 0 24px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#065F46;line-height:1.6;">
          ✅ This customer was redirected to your <strong>Google review page</strong>. Their positive experience is now working for you.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 0;">
        <a href="${p.dashboardUrl}" style="display:inline-block;background:#0A0F1E;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          View dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="font-size:12px;color:#9CA3AF;margin:0;">Sent by <strong style="color:#00C896;">Vomni</strong> - Protecting your reputation, one review at a time.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
