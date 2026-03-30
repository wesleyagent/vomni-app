/**
 * Google Calendar helpers — token refresh + freeBusy query
 * Tokens are stored encrypted with AES-256-GCM (see lib/crypto.ts).
 */

import { encrypt, decrypt } from "@/lib/crypto";
import { supabaseAdmin }    from "@/lib/supabase-admin";

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
    if (businessId) await markDisconnected(businessId);
    return null;
  }

  // Attempt token refresh
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    console.warn("[gcal] Token refresh failed — disconnecting business", businessId);
    if (businessId) await markDisconnected(businessId);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  if (!data.access_token) {
    if (businessId) await markDisconnected(businessId);
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

async function markDisconnected(businessId: string) {
  await supabaseAdmin
    .from("businesses")
    .update({ google_calendar_connected: false })
    .eq("id", businessId);
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
