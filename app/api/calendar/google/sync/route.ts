import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncBookingToGoogle, removeBookingFromGoogle, getValidGoogleAccessToken } from "@/lib/google-calendar-sync";

// POST /api/calendar/google/sync
// Thin HTTP wrapper — core logic lives in lib/google-calendar-sync.ts
export async function POST(req: NextRequest) {
  let body: { business_id: string; booking_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, booking_id } = body;
  if (!business_id || !booking_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await syncBookingToGoogle(business_id, booking_id);

  if (result.skipped) return NextResponse.json({ skipped: true, reason: result.reason });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true, google_event_id: result.google_event_id });
}

// DELETE /api/calendar/google/sync — remove event when booking is cancelled
export async function DELETE(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  const bookingId  = req.nextUrl.searchParams.get("booking_id");

  if (!businessId || !bookingId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const result = await removeBookingFromGoogle(businessId, bookingId);

  if (result.skipped) return NextResponse.json({ skipped: true });
  return NextResponse.json({ success: result.success });
}
