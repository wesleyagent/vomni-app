import { NextRequest, NextResponse } from "next/server";
import { syncBookingToMicrosoft, removeBookingFromMicrosoft } from "@/lib/microsoft-calendar-sync";

// POST /api/calendar/microsoft/sync
// Thin HTTP wrapper — core logic lives in lib/microsoft-calendar-sync.ts
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

  const result = await syncBookingToMicrosoft(business_id, booking_id);

  if (result.skipped) return NextResponse.json({ skipped: true, reason: result.reason });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true, microsoft_event_id: result.microsoft_event_id });
}

// DELETE /api/calendar/microsoft/sync — remove event when booking is cancelled
export async function DELETE(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  const bookingId  = req.nextUrl.searchParams.get("booking_id");

  if (!businessId || !bookingId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const result = await removeBookingFromMicrosoft(businessId, bookingId);

  if (result.skipped) return NextResponse.json({ skipped: true });
  return NextResponse.json({ success: result.success });
}
