import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID    = process.env.GOOGLE_CLIENT_ID ?? "";
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";
const REDIRECT_URI = `${APP_URL}/api/google-calendar/callback`;

// GET /api/google-calendar/connect?business_id=XXX
// Redirects to Google OAuth consent screen
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");

  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  if (!CLIENT_ID) {
    // Google Calendar not configured — redirect back with error
    return NextResponse.redirect(
      `${APP_URL}/dashboard/calendar/settings?error=not_configured`
    );
  }

  const state = Buffer.from(JSON.stringify({ business_id: businessId })).toString("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",     CLIENT_ID);
  url.searchParams.set("redirect_uri",  REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope",         "https://www.googleapis.com/auth/calendar.readonly");
  url.searchParams.set("access_type",   "offline");
  url.searchParams.set("prompt",        "consent");
  url.searchParams.set("state",         state);

  return NextResponse.redirect(url.toString());
}
