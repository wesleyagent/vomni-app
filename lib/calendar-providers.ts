/**
 * Unified calendar provider interface.
 *
 * Each provider implements getBusyTimes() + refreshToken().
 * The availability engine calls getUnifiedBusyTimes() to union all
 * active calendar_connections for a business/staff member.
 */

import { encrypt, decrypt }         from "@/lib/crypto";
import { supabaseAdmin }             from "@/lib/supabase-admin";
import { logCalendarDisconnect }     from "@/lib/telegram";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalendarProvider = "google" | "outlook" | "microsoft" | "apple" | "caldav";

export interface CalendarConnection {
  id:              string;
  business_id:     string;
  staff_id:        string | null;
  provider:        CalendarProvider;
  token_encrypted: string | null;
  calendar_id:     string | null;
  email:           string | null;
  caldav_url:      string | null;
  caldav_username: string | null;
  is_active:       boolean;
  expires_at:      string | null;
}

export interface BusyPeriod {
  start: string;  // ISO 8601
  end:   string;
}

interface TokenData {
  access_token:  string;
  refresh_token?: string;
  expires_at:    number;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function encryptToken(data: TokenData): string {
  return encrypt(JSON.stringify(data));
}

export function decryptToken(ciphertext: string): TokenData | null {
  // Backward-compat: try plain JSON first
  try {
    const plain = JSON.parse(ciphertext) as TokenData;
    if (plain.access_token) return plain;
  } catch { /* not plain JSON */ }

  const raw = decrypt(ciphertext);
  if (!raw) return null;
  try { return JSON.parse(raw) as TokenData; } catch { return null; }
}

// ── Google Calendar ───────────────────────────────────────────────────────────

async function refreshGoogleToken(conn: CalendarConnection): Promise<string | null> {
  const tokens = conn.token_encrypted ? decryptToken(conn.token_encrypted) : null;
  if (!tokens) return null;

  if (tokens.access_token && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) return null;

  let res: Response;
  try {
    res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID     ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        refresh_token: tokens.refresh_token,
        grant_type:    "refresh_token",
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await deactivateConnection(conn, `Network error: ${msg}`);
    return null;
  }

  if (!res.ok) {
    await deactivateConnection(conn, `HTTP ${res.status}`);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  const updated: TokenData = {
    ...tokens,
    access_token: data.access_token,
    expires_at:   Date.now() + data.expires_in * 1000,
  };

  await supabaseAdmin
    .from("calendar_connections")
    .update({ token_encrypted: encryptToken(updated) })
    .eq("id", conn.id);

  return data.access_token;
}

async function getGoogleBusy(conn: CalendarConnection, dateStr: string, timezone: string): Promise<BusyPeriod[]> {
  const token = await refreshGoogleToken(conn);
  if (!token) return [];

  const calId = conn.calendar_id ?? "primary";
  const body = {
    timeMin:  new Date(`${dateStr}T00:00:00`).toISOString(),
    timeMax:  new Date(`${dateStr}T23:59:59`).toISOString(),
    timeZone: timezone,
    items:    [{ id: calId }],
  };

  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json() as { calendars: Record<string, { busy: BusyPeriod[] }> };
    return data.calendars?.[calId]?.busy ?? [];
  } catch { return []; }
}

// ── Microsoft Outlook (Graph API) — legacy encrypted token path ───────────────

async function refreshOutlookToken(conn: CalendarConnection): Promise<string | null> {
  const tokens = conn.token_encrypted ? decryptToken(conn.token_encrypted) : null;
  if (!tokens) return null;
  if (tokens.access_token && tokens.expires_at > Date.now() + 60_000) return tokens.access_token;
  if (!tokens.refresh_token) return null;

  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  let res: Response;
  try {
    res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.MICROSOFT_CLIENT_ID     ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        refresh_token: tokens.refresh_token,
        grant_type:    "refresh_token",
        scope:         "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await deactivateConnection(conn, `Network error: ${msg}`);
    return null;
  }

  if (!res.ok) { await deactivateConnection(conn, `HTTP ${res.status}`); return null; }

  const data = await res.json() as { access_token: string; expires_in: number };
  const updated: TokenData = { ...tokens, access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
  await supabaseAdmin.from("calendar_connections").update({ token_encrypted: encryptToken(updated) }).eq("id", conn.id);
  return data.access_token;
}

async function getOutlookBusy(conn: CalendarConnection, dateStr: string, timezone: string): Promise<BusyPeriod[]> {
  const token = await refreshOutlookToken(conn);
  if (!token) return [];

  const startDt = new Date(`${dateStr}T00:00:00`).toISOString();
  const endDt   = new Date(`${dateStr}T23:59:59`).toISOString();

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDt}&endDateTime=${endDt}&$select=start,end,showAs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { value: { start: { dateTime: string }; end: { dateTime: string }; showAs: string }[] };
    return (data.value ?? [])
      .filter(e => e.showAs === "busy" || e.showAs === "tentative")
      .map(e => ({ start: e.start.dateTime + "Z", end: e.end.dateTime + "Z" }));
  } catch { return []; }
}

// ── Microsoft Calendar (Graph API) — new unencrypted token path ───────────────
// Connections stored via /api/auth/callback/microsoft use plain access_token /
// refresh_token columns (same pattern as Google). Token refresh writes back to
// those columns, not token_encrypted.

async function refreshMicrosoftToken(conn: CalendarConnection): Promise<string | null> {
  // access_token is stored in plain column (not token_encrypted) for microsoft provider
  const plainToken = (conn as unknown as { access_token?: string; refresh_token?: string; token_expires_at?: string }).access_token;
  const plainRefresh = (conn as unknown as { access_token?: string; refresh_token?: string; token_expires_at?: string }).refresh_token;
  const plainExpiry = (conn as unknown as { access_token?: string; refresh_token?: string; token_expires_at?: string }).token_expires_at;

  if (!plainToken) return null;

  const expiresAt = plainExpiry ? new Date(plainExpiry).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return plainToken;
  if (!plainRefresh) return null;

  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  let res: Response;
  try {
    res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.MICROSOFT_CLIENT_ID     ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        refresh_token: plainRefresh,
        grant_type:    "refresh_token",
        scope:         "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await deactivateConnection(conn, `Network error: ${msg}`);
    return null;
  }

  if (!res.ok) { await deactivateConnection(conn, `HTTP ${res.status}`); return null; }

  const data = await res.json() as { access_token: string; expires_in: number };
  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("calendar_connections")
    .update({ access_token: data.access_token, token_expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq("id", conn.id);

  return data.access_token;
}

async function getMicrosoftBusy(conn: CalendarConnection, dateStr: string): Promise<BusyPeriod[]> {
  const token = await refreshMicrosoftToken(conn);
  if (!token) return [];

  const startDt = new Date(`${dateStr}T00:00:00`).toISOString();
  const endDt   = new Date(`${dateStr}T23:59:59`).toISOString();

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDt}&endDateTime=${endDt}&$select=start,end,showAs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { value: { start: { dateTime: string }; end: { dateTime: string }; showAs: string }[] };
    return (data.value ?? [])
      .filter(e => e.showAs === "busy" || e.showAs === "tentative")
      .map(e => ({ start: e.start.dateTime + "Z", end: e.end.dateTime + "Z" }));
  } catch { return []; }
}

// ── Apple iCloud / Generic CalDAV ─────────────────────────────────────────────
// CalDAV FREEBUSY report — uses Basic auth with app-specific password

async function getCalDAVBusy(conn: CalendarConnection, dateStr: string): Promise<BusyPeriod[]> {
  if (!conn.caldav_url || !conn.caldav_username || !conn.token_encrypted) return [];

  const password = decrypt(conn.token_encrypted);
  if (!password) return [];

  const dtStart = dateStr.replace(/-/g, "") + "T000000Z";
  const dtEnd   = dateStr.replace(/-/g, "") + "T235959Z";

  const body = `<?xml version="1.0" encoding="utf-8"?>
<C:free-busy-query xmlns:C="urn:ietf:params:xml:ns:caldav">
  <C:time-range start="${dtStart}" end="${dtEnd}"/>
</C:free-busy-query>`;

  try {
    const res = await fetch(conn.caldav_url, {
      method: "REPORT",
      headers: {
        Authorization:  `Basic ${Buffer.from(`${conn.caldav_username}:${password}`).toString("base64")}`,
        "Content-Type": "application/xml; charset=utf-8",
        Depth:          "1",
      },
      body,
    });
    if (!res.ok) return [];

    // Parse VFREEBUSY lines from CalDAV response
    const text = await res.text();
    const busy: BusyPeriod[] = [];
    const fbLines = text.match(/FREEBUSY[^:]*:(.+)/g) ?? [];
    for (const line of fbLines) {
      const periods = line.replace(/^FREEBUSY[^:]*:/, "").split(",");
      for (const period of periods) {
        const [s, e] = period.split("/");
        if (s && e) {
          const start = s.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z");
          const end   = e.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z");
          busy.push({ start, end });
        }
      }
    }
    return busy;
  } catch { return []; }
}

// ── Unified interface ─────────────────────────────────────────────────────────

/**
 * Get busy times from a single calendar connection.
 */
export async function getBusyTimes(
  conn: CalendarConnection,
  dateStr: string,
  timezone: string,
): Promise<BusyPeriod[]> {
  switch (conn.provider) {
    case "google":    return getGoogleBusy(conn, dateStr, timezone);
    case "outlook":   return getOutlookBusy(conn, dateStr, timezone);
    case "microsoft": return getMicrosoftBusy(conn, dateStr);
    case "apple":
    case "caldav":    return getCalDAVBusy(conn, dateStr);
    default:          return [];
  }
}

/**
 * Get unified busy times from ALL active calendar connections for a business.
 * Results are unioned — a slot is blocked if ANY connection shows it as busy.
 */
export async function getUnifiedBusyTimes(
  businessId: string,
  staffId: string | null,
  dateStr: string,
  timezone: string,
): Promise<BusyPeriod[]> {
  let query = supabaseAdmin
    .from("calendar_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (staffId) {
    query = query.or(`staff_id.eq.${staffId},staff_id.is.null`);
  }

  const { data: connections } = await query;
  if (!connections || connections.length === 0) return [];

  const results = await Promise.all(
    (connections as CalendarConnection[]).map(c => getBusyTimes(c, dateStr, timezone))
  );

  return results.flat();
}

async function deactivateConnection(conn: CalendarConnection, reason = "Token refresh failed") {
  const ops: PromiseLike<unknown>[] = [
    supabaseAdmin
      .from("calendar_connections")
      .update({ is_active: false })
      .eq("id", conn.id),
  ];

  // For Google connections, clear the flag on the businesses row too so the
  // dashboard reconnect prompt shows immediately.
  if (conn.provider === "google") {
    ops.push(
      supabaseAdmin
        .from("businesses")
        .update({ google_calendar_connected: false })
        .eq("id", conn.business_id)
    );
  }

  await Promise.all(ops);

  // Log to system_alerts + Telegram (fire-and-forget — never block availability)
  logCalendarDisconnect(conn.provider, conn.business_id, conn.email, reason).catch(() => {});
}
