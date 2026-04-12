import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID  = process.env.MICROSOFT_CLIENT_ID ?? "";
const TENANT_ID  = process.env.MICROSOFT_TENANT_ID ?? "common";
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL  ?? "https://vomni.io";
const REDIRECT   = `${APP_URL}/api/calendar/outlook/callback`;

// GET /api/calendar/outlook/connect?business_id=XXX&staff_id=XXX
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const businessId = searchParams.get("business_id");
  const staffId    = searchParams.get("staff_id") ?? null;

  if (!businessId) return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  if (!CLIENT_ID)  return NextResponse.redirect(`${APP_URL}/dashboard/calendar/settings?error=outlook_not_configured`);

  const returnTo = searchParams.get("return_to") ?? null;
  const state = Buffer.from(JSON.stringify({ business_id: businessId, staff_id: staffId, return_to: returnTo })).toString("base64url");

  const url = new URL(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id",     CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri",  REDIRECT);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope",         "https://graph.microsoft.com/Calendars.Read offline_access");
  url.searchParams.set("state",         state);

  return NextResponse.redirect(url.toString());
}
