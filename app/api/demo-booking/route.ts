import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, businessName, businessType, phone } = body;

    // 1. Store in Supabase
    if (supabaseConfigured) {
      await supabase.from("demo_bookings").insert({
        first_name: firstName,
        last_name: lastName,
        email,
        business_name: businessName,
        business_type: businessType,
        phone,
        status: "new",
      });
    }

    // 2. Send notification email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vomni <onboarding@resend.dev>",
          to: "shmeenaresearch@gmail.com",
          subject: `New demo request - ${businessName}`,
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #0A0F1E; padding: 32px; border-radius: 12px 12px 0 0;">
                <h1 style="color: #00C896; font-size: 24px; margin: 0;">New Demo Request</h1>
                <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0;">Someone wants to see Vomni in action</p>
              </div>
              <div style="background: #fff; border: 1px solid #E5E7EB; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 14px; width: 140px;">Name</td><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; font-weight: 600; color: #111827;">${firstName} ${lastName}</td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 14px;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; color: #111827;"><a href="mailto:${email}" style="color: #00C896;">${email}</a></td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 14px;">Phone</td><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; color: #111827;">${phone}</td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 14px;">Business</td><td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; font-weight: 600; color: #111827;">${businessName}</td></tr>
                  <tr><td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Business Type</td><td style="padding: 10px 0; font-size: 14px; color: #111827;">${businessType}</td></tr>
                </table>
                <div style="margin-top: 24px; background: rgba(0,200,150,0.08); border: 1px solid rgba(0,200,150,0.2); border-radius: 10px; padding: 16px;">
                  <p style="margin: 0; font-size: 14px; color: #047857; font-weight: 600;">Action required: Reach out within a few hours to confirm their demo time.</p>
                </div>
                <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">Submitted ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
              </div>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Demo booking error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
