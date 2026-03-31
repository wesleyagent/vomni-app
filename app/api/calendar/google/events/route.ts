import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenForBusiness } from "@/lib/google-calendar";

// GET /api/calendar/google/events?business_id=xxx&start=ISO&end=ISO
// Fetches Google Calendar events for the given time range (dashboard view)
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");

  if (!businessId || !start || !end) {
    return NextResponse.json({ events: [] });
  }

  const accessToken = await getAccessTokenForBusiness(businessId);
  if (!accessToken) {
    return NextResponse.json({ events: [], connected: false });
  }

  try {
    const params = new URLSearchParams({
      timeMin: new Date(start).toISOString(),
      timeMax: new Date(end).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ events: [], connected: true, error: "fetch_failed" });
    }

    const data = await res.json() as {
      items?: Array<{
        id: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        status?: string;
      }>;
    };

    const events = (data.items ?? [])
      .filter(e => e.status !== "cancelled")
      .map(e => ({
        id: e.id,
        title: e.summary ?? "Busy",
        start: e.start?.dateTime ?? e.start?.date ?? "",
        end: e.end?.dateTime ?? e.end?.date ?? "",
        allDay: !e.start?.dateTime,
      }));

    return NextResponse.json({ events, connected: true });
  } catch {
    return NextResponse.json({ events: [], connected: true, error: "exception" });
  }
}
