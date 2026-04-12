import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/calendar/v3/calendarList/primary";

// GET /api/auth/callback/google-calendar?code=xxx&state=<json|business_id>
export async function GET(req: NextRequest) {
  const code      = req.nextUrl.searchParams.get("code");
  const stateRaw  = req.nextUrl.searchParams.get("state") ?? "";
  const error     = req.nextUrl.searchParams.get("error");

  const appUrl      = req.nextUrl.origin;
  const settingsUrl = `${appUrl}/dashboard/calendar/settings`;

  // State may be a plain business_id (legacy) or JSON { b, r } (with return_to)
  let businessId: string;
  let returnTo: string | null = null;
  try {
    const parsed = JSON.parse(stateRaw);
    businessId = parsed.b;
    returnTo   = parsed.r ?? null;
  } catch {
    businessId = stateRaw;
  }

  const successUrl = returnTo
    ? `${appUrl}${returnTo}?calendar_connected=google`
    : `${settingsUrl}?calendar_connected=google`;

  if (error || !code || !businessId) {
    return NextResponse.redirect(`${settingsUrl}?calendar_error=${error ?? "missing_params"}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/auth/callback/google-calendar`;

  // Exchange code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[google-calendar callback] token exchange failed:", err);
    return NextResponse.redirect(`${settingsUrl}?calendar_error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // Fetch primary calendar info
  let calendarEmail = null;
  try {
    const calRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (calRes.ok) {
      const cal = await calRes.json();
      calendarEmail = cal.id; // primary calendar ID = email
    }
  } catch (e) {
    console.error("[google-calendar callback] failed to fetch calendar info:", e);
  }

  const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

  // Delete existing connection then insert fresh (avoids upsert constraint issues)
  await supabaseAdmin
    .from("calendar_connections")
    .delete()
    .eq("business_id", businessId)
    .eq("provider", "google");

  const { error: insertErr } = await supabaseAdmin
    .from("calendar_connections")
    .insert({
      business_id: businessId,
      provider: "google",
      access_token,
      refresh_token: refresh_token ?? null,
      token_expires_at: expiresAt,
      calendar_id: calendarEmail,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  if (insertErr) {
    console.error("[google-calendar callback] insert error:", insertErr.message);
    return NextResponse.redirect(`${settingsUrl}?calendar_error=${encodeURIComponent(insertErr.message)}`);
  }

  // Register webhook for push notifications (so Google notifies us of changes)
  try {
    await registerGoogleWebhook(businessId, access_token, calendarEmail ?? "primary", appUrl);
  } catch (e) {
    console.error("[google-calendar callback] webhook registration failed:", e);
    // Don't fail the whole flow — sync still works without push notifications
  }

  return NextResponse.redirect(successUrl);
}

async function registerGoogleWebhook(
  businessId: string,
  accessToken: string,
  calendarId: string,
  appUrl: string
) {
  const channelId = `vomni-${businessId}`;
  const webhookUrl = `${appUrl}/api/calendar/google/webhook`;

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Webhook registration failed: ${err}`);
  }

  const data = await res.json();

  // Save webhook channel info for renewal
  await supabaseAdmin.from("calendar_connections")
    .update({
      webhook_channel_id: data.id,
      webhook_resource_id: data.resourceId,
      webhook_expires_at: new Date(Number(data.expiration)).toISOString(),
    })
    .eq("business_id", businessId)
    .eq("provider", "google");
}
