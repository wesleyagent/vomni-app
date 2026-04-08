import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

// GET /api/auth/callback/microsoft?code=xxx&state=business_id
export async function GET(req: NextRequest) {
  const code       = req.nextUrl.searchParams.get("code");
  const businessId = req.nextUrl.searchParams.get("state");
  const error      = req.nextUrl.searchParams.get("error");

  const appUrl      = req.nextUrl.origin;
  const settingsUrl = `${appUrl}/dashboard/calendar/settings`;

  if (error || !code || !businessId) {
    return NextResponse.redirect(
      `${settingsUrl}?calendar_error=${error ?? "missing_params"}`
    );
  }

  const clientId     = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const redirectUri  = `${appUrl}/api/auth/callback/microsoft`;

  // Exchange code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
      scope:         "Calendars.ReadWrite offline_access User.Read",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[microsoft callback] token exchange failed:", err);
    return NextResponse.redirect(`${settingsUrl}?calendar_error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json() as {
    access_token:  string;
    refresh_token?: string;
    expires_in:    number;
  };

  const { access_token, refresh_token, expires_in } = tokens;

  // Fetch user email from Microsoft Graph
  let calendarEmail: string | null = null;
  try {
    const meRes = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (meRes.ok) {
      const u = await meRes.json() as { mail?: string; userPrincipalName?: string };
      calendarEmail = u.mail ?? u.userPrincipalName ?? null;
    }
  } catch (e) {
    console.error("[microsoft callback] failed to fetch user info:", e);
  }

  const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

  // Delete any existing connection then insert fresh (avoids upsert constraint issues)
  await supabaseAdmin
    .from("calendar_connections")
    .delete()
    .eq("business_id", businessId)
    .eq("provider", "microsoft");

  const { error: insertErr } = await supabaseAdmin
    .from("calendar_connections")
    .insert({
      business_id:      businessId,
      provider:         "microsoft",
      access_token,
      refresh_token:    refresh_token ?? null,
      token_expires_at: expiresAt,
      calendar_id:      calendarEmail ?? "primary",
      email:            calendarEmail,
      is_active:        true,
      updated_at:       new Date().toISOString(),
    });

  if (insertErr) {
    console.error("[microsoft callback] insert error:", insertErr.message);
    return NextResponse.redirect(
      `${settingsUrl}?calendar_error=${encodeURIComponent(insertErr.message)}`
    );
  }

  return NextResponse.redirect(`${settingsUrl}?calendar_connected=microsoft`);
}
