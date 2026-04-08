import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? "";
const TENANT_ID = process.env.MICROSOFT_TENANT_ID ?? "common";

const SCOPES = "Calendars.ReadWrite offline_access User.Read";

// GET /api/auth/microsoft-calendar?business_id=xxx
// Initiates Microsoft OAuth flow for calendar sync
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  if (!CLIENT_ID) {
    return NextResponse.json({ error: "Microsoft OAuth not configured" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/microsoft`;

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         SCOPES,
    response_mode: "query",
    state:         businessId, // pass business_id through OAuth state
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`
  );
}
