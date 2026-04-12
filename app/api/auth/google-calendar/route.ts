import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

// GET /api/auth/google-calendar?business_id=xxx
// Initiates Google OAuth flow for calendar sync
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  // Use the request origin so the redirect_uri always matches the domain being used
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google-calendar`;

  // Encode return_to alongside business_id in the OAuth state so the callback
  // can redirect back to the correct page (e.g. /onboarding) after success.
  const returnTo = req.nextUrl.searchParams.get("return_to");
  const state = returnTo
    ? JSON.stringify({ b: businessId, r: returnTo })
    : businessId;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
