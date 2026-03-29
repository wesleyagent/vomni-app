import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { businessId, ownerName, email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "No email address" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
    }

    const firstName = ownerName ? ownerName.split(" ")[0] : "there";

    const htmlBody = `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, -apple-system, sans-serif; color: #0A0F1E; background: #F7F8FA; padding: 32px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; border: 1px solid #E5E7EB;">
    <p style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 24px; font-weight: 700; color: #0A0F1E; margin: 0 0 24px;">
      Hey ${firstName} 👋
    </p>
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 0 0 16px;">
      It's Nicky from Vomni - just checking in to see how things are going with your review management.
    </p>
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 0 0 16px;">
      Is everything working well for you? Any questions or anything we can improve?
    </p>
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 0 0 24px;">
      Just hit reply - I read every email personally.
    </p>
    <p style="font-size: 15px; color: #374151; margin: 0;">
      Nicky<br/>
      <span style="color: #6B7280; font-size: 13px;">Vomni · support@vomni.io</span>
    </p>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "Nicky at Vomni <nicky@vomni.app>",
        to:      [email],
        subject: "Quick check in - how is Vomni working for you?",
        html:    htmlBody,
        tags: [{ name: "type", value: "checkin" }, { name: "business_id", value: businessId || "unknown" }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send checkin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
