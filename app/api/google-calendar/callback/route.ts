import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { encryptTokenPayload } from "@/lib/google-calendar";

const CLIENT_ID    = process.env.GOOGLE_CLIENT_ID    ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL  ?? "https://vomni.io";
const REDIRECT_URI = `${APP_URL}/api/google-calendar/callback`;

// GET /api/google-calendar/callback?code=XXX&state=XXX
// Called by Google after user grants access. Exchanges code for tokens and stores them.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = `${APP_URL}/dashboard/calendar/settings`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=cancelled`);
  }

  // Decode state to get business_id
  let businessId: string;
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const parsed  = JSON.parse(decoded);
    businessId    = parsed.business_id;
    if (!businessId) throw new Error("no business_id");
  } catch {
    return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
  }

  // Exchange auth code for access + refresh tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("[gcal/callback] token exchange failed:", text);
    return NextResponse.redirect(`${settingsUrl}?error=token_exchange`);
  }

  const tokens = await tokenRes.json() as {
    access_token:  string;
    refresh_token?: string;
    expires_in:    number;
    token_type:    string;
  };

  // Fetch connected Google account email
  let calendarEmail: string | null = null;
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userRes.ok) {
      const user = await userRes.json() as { email?: string };
      calendarEmail = user.email ?? null;
    }
  } catch {
    // Non-fatal — we just won't show the email
  }

  // Persist tokens — stored encrypted with AES-256-GCM
  const tokenPayload = encryptTokenPayload({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at:    Date.now() + tokens.expires_in * 1000,
    email:         calendarEmail,
  });

  const { error: dbErr } = await supabaseAdmin
    .from("businesses")
    .update({
      calendar_token:            tokenPayload,
      google_calendar_connected: true,
      google_calendar_email:     calendarEmail,
    })
    .eq("id", businessId);

  if (dbErr) {
    console.error("[gcal/callback] DB update error:", dbErr.message);
    return NextResponse.redirect(`${settingsUrl}?error=db`);
  }

  return NextResponse.redirect(`${settingsUrl}?connected=true`);
}
