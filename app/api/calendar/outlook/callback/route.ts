import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { encryptToken }  from "@/lib/calendar-providers";

const CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID     ?? "";
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET ?? "";
const TENANT_ID     = process.env.MICROSOFT_TENANT_ID     ?? "common";
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL      ?? "https://vomni.io";
const REDIRECT      = `${APP_URL}/api/calendar/outlook/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = `${APP_URL}/dashboard/calendar/settings`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=outlook_cancelled`);
  }

  let businessId: string; let staffId: string | null = null; let returnTo: string | null = null;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
    businessId = parsed.business_id;
    staffId    = parsed.staff_id  ?? null;
    returnTo   = parsed.return_to ?? null;
    if (!businessId) throw new Error();
  } catch {
    return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT, grant_type: "authorization_code",
      scope: "https://graph.microsoft.com/Calendars.Read offline_access",
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${settingsUrl}?error=outlook_token_exchange`);

  const tokens = await tokenRes.json() as {
    access_token: string; refresh_token?: string; expires_in: number;
  };

  // Fetch user email
  let email: string | null = null;
  try {
    const me = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (me.ok) {
      const u = await me.json() as { mail?: string; userPrincipalName?: string };
      email = u.mail ?? u.userPrincipalName ?? null;
    }
  } catch { /* non-fatal */ }

  const tokenEncrypted = encryptToken({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    Date.now() + tokens.expires_in * 1000,
  });

  await supabaseAdmin.from("calendar_connections").upsert({
    business_id:     businessId,
    staff_id:        staffId,
    provider:        "outlook",
    token_encrypted: tokenEncrypted,
    calendar_id:     "primary",
    email,
    is_active:       true,
  }, { onConflict: "business_id,provider,staff_id" });

  // Also flag outlook connected on businesses table
  await supabaseAdmin.from("businesses").update({
    outlook_calendar_connected: true,
    outlook_calendar_email:     email,
  }).eq("id", businessId);

  const successUrl = returnTo ? `${APP_URL}${returnTo}?connected=outlook` : `${settingsUrl}?connected=outlook`;
  return NextResponse.redirect(successUrl);
}
