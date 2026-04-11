/**
 * Google Calendar helpers — token refresh + freeBusy query
 * Tokens are stored encrypted with AES-256-GCM (see lib/crypto.ts).
 */

import { encrypt, decrypt }       from "@/lib/crypto";
import { supabaseAdmin }           from "@/lib/supabase-admin";
import { logCalendarDisconnect }   from "@/lib/telegram";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

// ── In-memory freeBusy cache ──────────────────────────────────────────────────
// Key: `${businessId}:${dateStr}` — 60 second TTL per slot
const freeBusyCache = new Map<string, { value: { start: string; end: string }[]; expiresAt: number }>();

function getCached(key: string): { start: string; end: string }[] | null {
  const entry = freeBusyCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { freeBusyCache.delete(key); return null; }
  return entry.value;
}

function setCache(key: string, value: { start: string; end: string }[]) {
  freeBusyCache.set(key, { value, expiresAt: Date.now() + 60_000 });
}

// Cleanup stale cache every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of freeBusyCache.entries()) {
      if (now > v.expiresAt) freeBusyCache.delete(k);
    }
  }, 5 * 60 * 1000);
}

// ── Token types ───────────────────────────────────────────────────────────────

interface StoredTokens {
  access_token:  string;
  refresh_token: string | null;
  expires_at:    number;
  email:         string | null;
}

// ── Encryption helpers ────────────────────────────────────────────────────────

/**
 * Encrypt token JSON before writing to DB.
 */
export function encryptTokenPayload(tokens: StoredTokens): string {
  return encrypt(JSON.stringify(tokens));
}

/**
 * Decrypt token JSON read from DB.
 * Returns null if decryption fails (wrong key / corrupted data).
 */
export function decryptTokenPayload(ciphertext: string): StoredTokens | null {
  // Backwards-compat: if value is valid plain JSON (pre-encryption), parse directly
  try {
    const plain = JSON.parse(ciphertext) as StoredTokens;
    if (plain.access_token) return plain;
  } catch { /* not plain JSON — try decryption */ }

  const decrypted = decrypt(ciphertext);
  if (!decrypted) return null;
  try {
    return JSON.parse(decrypted) as StoredTokens;
  } catch {
    return null;
  }
}

// ── Access token retrieval ────────────────────────────────────────────────────

/**
 * Given the encrypted calendar_token string stored in the DB,
 * return a valid access token (refreshes automatically if expired).
 *
 * If refresh fails, marks the business as disconnected in the DB
 * so the dashboard can surface a reconnect prompt.
 */
export async function getAccessToken(
  tokenCiphertext: string,
  businessId?: string,
): Promise<string | null> {
  const tokens = decryptTokenPayload(tokenCiphertext);
  if (!tokens) return null;

  // Token still valid (60s buffer)
  if (tokens.access_token && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    if (businessId) await markDisconnected(businessId, "No refresh token stored");
    return null;
  }

  // Attempt token refresh
  let res: Response;
  try {
    res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type:    "refresh_token",
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[gcal] Token refresh network error — disconnecting business", businessId, msg);
    if (businessId) await markDisconnected(businessId, `Network error: ${msg}`);
    return null;
  }

  if (!res.ok) {
    console.warn("[gcal] Token refresh failed — disconnecting business", businessId, res.status);
    if (businessId) await markDisconnected(businessId, `HTTP ${res.status}`);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  if (!data.access_token) {
    if (businessId) await markDisconnected(businessId, "No access_token in refresh response");
    return null;
  }

  // Persist refreshed token (encrypted) back to DB
  const updated: StoredTokens = {
    ...tokens,
    access_token: data.access_token,
    expires_at:   Date.now() + data.expires_in * 1000,
  };

  if (businessId) {
    await supabaseAdmin
      .from("businesses")
      .update({ calendar_token: encryptTokenPayload(updated) })
      .eq("id", businessId);
  }

  return data.access_token;
}

async function markDisconnected(businessId: string, reason = "Token refresh failed") {
  await Promise.all([
    supabaseAdmin.from("businesses").update({ google_calendar_connected: false }).eq("id", businessId),
    supabaseAdmin.from("calendar_connections").update({ is_active: false }).eq("business_id", businessId).eq("provider", "google"),
  ]);
  // Notify admin via Telegram + system_alerts (fire-and-forget)
  logCalendarDisconnect("google", businessId, null, reason).catch(() => {});
}

// ── Unified access token retrieval ───────────────────────────────────────────

/**
 * Get a valid Google Calendar access token for a business.
 * Checks calendar_connections table first (new system),
 * falls back to businesses.calendar_token (legacy encrypted system).
 * Handles automatic token refresh for both.
 */
export async function getAccessTokenForBusiness(
  businessId: string,
): Promise<string | null> {
  // 1. Try new calendar_connections table first
  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("business_id", businessId)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (conn?.access_token) {
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
    // Token still valid
    if (expiresAt > Date.now() + 60_000) return conn.access_token;

    // Try refresh first
    if (conn.refresh_token) {
      const refreshed = await refreshAccessToken(conn.refresh_token, businessId, "connection");
      if (refreshed) return refreshed;
    }

    // Refresh failed — if access_token exists, try it anyway (may still work)
    // Only mark disconnected if token is definitely stale (older than 2h)
    if (expiresAt > 0 && expiresAt < Date.now() - 2 * 60 * 60 * 1000) {
      await markDisconnected(businessId);
      return null;
    }

    // Token recently expired but refresh unavailable — try it anyway
    return conn.access_token;
  }

  // 2. Fall back to legacy businesses.calendar_token
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("calendar_token, google_calendar_connected")
    .eq("id", businessId)
    .single();

  if (biz?.google_calendar_connected && biz?.calendar_token) {
    return getAccessToken(biz.calendar_token as string, businessId);
  }

  return null;
}

async function refreshAccessToken(
  refreshToken: string,
  businessId: string,
  target: "connection" | "legacy",
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[gcal] refreshAccessToken network error:", msg);
    await markDisconnected(businessId, `Network error: ${msg}`);
    return null;
  }

  if (!res.ok) {
    await markDisconnected(businessId, `HTTP ${res.status}`);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  if (!data.access_token) return null;

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  if (target === "connection") {
    await supabaseAdmin.from("calendar_connections")
      .update({ access_token: data.access_token, token_expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .eq("provider", "google");
  }

  return data.access_token;
}

// ── freeBusy query ────────────────────────────────────────────────────────────

/**
 * Query Google Calendar freeBusy API for the given date.
 * Results are cached in memory for 60 seconds per (businessId, date) key.
 */
export async function getGoogleBusyTimes(
  accessToken: string,
  dateStr: string,        // "YYYY-MM-DD"
  timezone: string,
  businessId?: string,    // used as cache key prefix
): Promise<{ start: string; end: string }[]> {
  const cacheKey = `${businessId ?? "anon"}:${dateStr}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Build time range in local midnight → midnight UTC
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd   = new Date(`${dateStr}T23:59:59`);

  const body = {
    timeMin:  dayStart.toISOString(),
    timeMax:  dayEnd.toISOString(),
    timeZone: timezone,
    items:    [{ id: "primary" }],
  };

  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setCache(cacheKey, []);
      return [];
    }

    const data = await res.json() as {
      calendars: Record<string, { busy: { start: string; end: string }[] }>;
    };

    const busy = data.calendars?.["primary"]?.busy ?? [];
    setCache(cacheKey, busy);
    return busy;
  } catch {
    setCache(cacheKey, []);
    return [];
  }
}
