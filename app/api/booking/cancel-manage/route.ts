import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBusinessPushNotification } from "@/lib/push";
import { removeBookingFromGoogle } from "@/lib/google-calendar-sync";
import { removeBookingFromMicrosoft } from "@/lib/microsoft-calendar-sync";

// POST /api/booking/cancel-manage
// Body: { token: string }
// No auth required — the cancellation_token is the secret.
// Called by the /manage/[token] page when the customer confirms cancellation.
export async function POST(req: NextRequest) {
  let token: string;
  try {
    const body = await req.json() as { token?: string };
    token = body.token ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // 1. Fetch booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, customer_name, service_name, appointment_at, status")
    .eq("cancellation_token", token)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // 2. Verify status is confirmed
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "This appointment has already been cancelled." }, { status: 400 });
  }
  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "This appointment cannot be cancelled." }, { status: 400 });
  }

  // 3. Cancel the booking
  const { error: updateErr } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: "customer_request",
      cancelled_at: new Date().toISOString(),
      sms_status: "cancelled", // suppress pending review request
    })
    .eq("id", booking.id);

  if (updateErr) {
    console.error("[cancel-manage] update error:", updateErr.message);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }

  // 4. Audit log
  await supabaseAdmin.from("booking_audit_log").insert({
    booking_id: booking.id,
    action: "cancelled",
    actor: "customer",
    details: { reason: "customer_request", source: "manage_page" },
  });

  // 5. Owner notification (non-blocking)
  const date = booking.appointment_at?.substring(0, 10) ?? "";
  const time = booking.appointment_at?.substring(11, 16) ?? "";
  const notifBody = `${booking.customer_name} cancelled their ${booking.service_name} on ${date} at ${time}`;

  void supabaseAdmin.from("notifications").insert({
    business_id: booking.business_id,
    type: "booking_cancelled",
    title: "Booking cancelled",
    body: notifBody,
    read: false,
  });

  Promise.resolve().then(() =>
    sendBusinessPushNotification(booking.business_id, {
      title: "Booking cancelled",
      body: notifBody,
      data: { type: "cancellation", id: booking.id },
    })
  ).catch(e => console.error("[cancel-manage] push failed:", e));

  // Remove from Google Calendar (non-blocking)
  const cancelledBookingId = booking.id;
  const cancelledBusinessId = booking.business_id;
  after(async () => {
    await removeBookingFromGoogle(cancelledBusinessId, cancelledBookingId).catch(
      err => console.error("[cancel-manage] google calendar removal failed:", err)
    );
  });

  after(async () => {
    await removeBookingFromMicrosoft(cancelledBusinessId, cancelledBookingId).catch(
      err => console.error("[cancel-manage] microsoft calendar removal failed:", err)
    );
  });

  return NextResponse.json({ success: true });
}
