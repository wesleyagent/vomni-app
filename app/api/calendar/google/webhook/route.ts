import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/calendar/google/webhook
// Google sends push notifications here when calendar changes
export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  // Acknowledge immediately (Google requires < 1s response)
  if (resourceState === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  if (!channelId || !channelId.startsWith("vomni-")) {
    return new NextResponse(null, { status: 200 });
  }

  const businessId = channelId.replace("vomni-", "");

  // Run sync in background (don't await — Google needs fast response)
  syncGoogleCalendar(businessId).catch(err =>
    console.error("[google/webhook] sync error:", err)
  );

  return new NextResponse(null, { status: 200 });
}

async function syncGoogleCalendar(businessId: string) {
  // Get the calendar connection with tokens
  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", businessId)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (!conn) return;

  const accessToken = await getValidAccessToken(conn, businessId);
  if (!accessToken) return;

  const calendarId = conn.calendar_id ?? "primary";

  // Fetch events from Google Calendar for the next 60 days
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const eventsRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!eventsRes.ok) return;

  const eventsData = await eventsRes.json();
  const events: GoogleCalendarEvent[] = eventsData.items ?? [];

  // Get existing Google-sourced blocked times for this business
  const { data: existingBlocks } = await supabaseAdmin
    .from("blocked_times")
    .select("id, google_event_id")
    .eq("business_id", businessId)
    .not("google_event_id", "is", null);

  const existingMap = new Map((existingBlocks ?? []).map(b => [b.google_event_id, b.id]));
  const seenEventIds = new Set<string>();

  for (const event of events) {
    if (!event.id || !event.start || !event.end) continue;
    // Skip events created by Vomni (to avoid circular sync)
    if (event.description?.includes("vomni-booking")) continue;

    seenEventIds.add(event.id);

    const startAt = event.start.dateTime ?? `${event.start.date}T00:00:00`;
    const endAt = event.end.dateTime ?? `${event.end.date}T23:59:59`;

    if (existingMap.has(event.id)) {
      // Update existing block
      await supabaseAdmin.from("blocked_times")
        .update({
          label: event.summary ?? "Busy",
          start_at: startAt,
          end_at: endAt,
        })
        .eq("id", existingMap.get(event.id)!);
    } else {
      // Insert new block
      await supabaseAdmin.from("blocked_times").insert({
        business_id: businessId,
        google_event_id: event.id,
        label: event.summary ?? "Busy",
        start_at: startAt,
        end_at: endAt,
        source: "google_calendar",
      });
    }
  }

  // Remove blocks for deleted Google events
  for (const [googleEventId, blockId] of existingMap) {
    if (!seenEventIds.has(googleEventId)) {
      await supabaseAdmin.from("blocked_times").delete().eq("id", blockId);
    }
  }
}

async function getValidAccessToken(
  conn: { access_token: string; refresh_token: string | null; token_expires_at: string | null },
  businessId: string
): Promise<string | null> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 60_000;

  if (!isExpired) return conn.access_token;
  if (!conn.refresh_token) return null;

  // Refresh the token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();

  await supabaseAdmin.from("calendar_connections")
    .update({ access_token: data.access_token, token_expires_at: newExpiry })
    .eq("business_id", businessId)
    .eq("provider", "google");

  return data.access_token;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}
