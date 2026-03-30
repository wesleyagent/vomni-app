/**
 * Google Calendar helpers — token refresh + freeBusy query
 */

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

interface StoredTokens {
  access_token:  string;
  refresh_token: string | null;
  expires_at:    number;
  email:         string | null;
}

/**
 * Given the raw calendar_token JSON string stored in the DB,
 * return a valid access token (refreshes automatically if expired).
 */
export async function getAccessToken(tokenJson: string): Promise<string | null> {
  let tokens: StoredTokens;
  try {
    tokens = JSON.parse(tokenJson) as StoredTokens;
  } catch {
    return null;
  }

  // If token is still valid (with 60s buffer), return it directly
  if (tokens.access_token && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) return null;

  // Refresh the access token
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

  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; expires_in: number };
  // Note: we don't persist the new token here to avoid write amplification.
  // The short lifetime means this adds at most one refresh call per cold start.
  return data.access_token ?? null;
}

/**
 * Query Google Calendar freeBusy API for the given date.
 * Returns an array of busy periods as { start: string, end: string } in ISO format.
 */
export async function getGoogleBusyTimes(
  accessToken: string,
  dateStr: string,   // "YYYY-MM-DD"
  timezone: string,
): Promise<{ start: string; end: string }[]> {
  const timeMin = `${dateStr}T00:00:00`;
  const timeMax = `${dateStr}T23:59:59`;

  // Convert to UTC ISO strings for the API (freeBusy accepts local times with tz param)
  const body = {
    timeMin: new Date(`${timeMin}Z`).toISOString(),
    timeMax: new Date(`${timeMax}Z`).toISOString(),
    timeZone: timezone,
    items: [{ id: "primary" }],
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

    if (!res.ok) return [];

    const data = await res.json() as {
      calendars: Record<string, { busy: { start: string; end: string }[] }>;
    };

    const primary = data.calendars?.["primary"];
    return primary?.busy ?? [];
  } catch {
    return [];
  }
}
