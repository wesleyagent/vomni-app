import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessName, ownerName, email, phone, plan } = body;

    // Try to send via Resend if API key is configured
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
          to: process.env.SIGNUP_NOTIFY_EMAIL ?? "shmeenaresearch@gmail.com",
          subject: `New Vomni Signup: ${businessName}`,
          html: `
            <h2>New Business Signup</h2>
            <p><strong>Business:</strong> ${businessName}</p>
            <p><strong>Owner:</strong> ${ownerName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Plan:</strong> ${plan}</p>
            <p><strong>Signup Time:</strong> ${new Date().toISOString()}</p>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
