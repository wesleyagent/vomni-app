import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/email/unsubscribe?t={token}
// Token = base64url(email|businessId)
// Sets opted_out = true on matching customer_profile, renders a confirmation page.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");

  if (!token) {
    return new NextResponse(errorPage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  let email: string;
  let businessId: string;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split("|");
    if (parts.length !== 2) throw new Error("malformed token");
    [email, businessId] = parts;
  } catch {
    return new NextResponse(errorPage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Update customer_profiles — match by email + business_id
  const { error } = await supabaseAdmin
    .from("customer_profiles")
    .update({
      opted_out:    true,
      opted_out_at: new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("email", email);

  if (error) {
    console.error("[email/unsubscribe] DB error:", error.message);
  }

  return new NextResponse(successPage(email), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

function successPage(email: string) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed · הוסרת מהרשימה</title>
</head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:Inter,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:16px;padding:48px 40px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0B2D2A;border-radius:12px;padding:16px 24px;display:inline-block;margin-bottom:28px;">
      <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:18px;color:#fff;">vomni</span>
    </div>
    <div style="font-size:40px;margin-bottom:16px;">✅</div>
    <h1 style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:#0A0F1E;margin:0 0 12px;">
      Unsubscribed · הוסרת מהרשימה
    </h1>
    <p style="font-family:Inter,sans-serif;font-size:14px;color:#6B7280;margin:0 0 8px;">
      ${escHtml(email)} has been removed from all marketing emails.
    </p>
    <p style="font-family:Inter,sans-serif;font-size:14px;color:#6B7280;margin:0 0 24px;">
      כתובת הדוא"ל שלך הוסרה מכל הדיוורים שיווקיים.
    </p>
    <p style="font-family:Inter,sans-serif;font-size:12px;color:#9CA3AF;margin:0;">
      You'll still receive booking confirmations and reminders.<br>
      אישורי הזמנות ותזכורות יישלחו כרגיל.
    </p>
  </div>
</body>
</html>`;
}

function errorPage(msg: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Error</title></head>
<body style="margin:0;padding:40px;font-family:Inter,sans-serif;text-align:center;color:#6B7280;">
  <p>${escHtml(msg)}</p>
  <p><a href="https://vomni.io" style="color:#0B2D2A;">vomni.io</a></p>
</body>
</html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
