import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBusinessPushNotification } from "@/lib/push";
import { sendEmail } from "@/lib/email";
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
    .select("id, business_id, customer_name, service_name, appointment_at, status, businesses(name, booking_timezone, owner_email, notification_email)")
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

  // Email owner (non-blocking)
  const business = (booking as typeof booking & { businesses?: { name?: string | null; booking_timezone?: string | null; owner_email?: string | null; notification_email?: string | null } | null }).businesses;
  const ownerEmail = business?.notification_email ?? business?.owner_email;
  if (ownerEmail) {
    const tz = business?.booking_timezone ?? "Asia/Jerusalem";
    const fmtDate = new Date(booking.appointment_at.substring(0, 19)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz });
    const fmtTime = new Date(booking.appointment_at.substring(0, 19)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    sendEmail({
      to: ownerEmail,
      subject: `Booking cancelled: ${booking.customer_name} — ${booking.service_name} on ${fmtDate} at ${fmtTime}`,
      type: "booking_owner_notify",
      bookingId: booking.id,
      html: `<div style="font-family:Inter,sans-serif;background:#F9FAFB;padding:24px;"><div style="max-width:520px;margin:0 auto;"><div style="background:#0A0F1E;border-radius:16px 16px 0 0;padding:20px 32px;"><span style="font-weight:700;font-size:20px;color:#fff;">vomni</span></div><div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;"><div style="background:#EF4444;border-radius:12px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">Booking Cancelled</div><div style="font-size:14px;color:rgba(255,255,255,0.85);">The customer has cancelled their appointment.</div></div><table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Customer</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${booking.customer_name ?? ""}</td></tr><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Service</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${booking.service_name ?? ""}</td></tr><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Was booked for</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${fmtDate} at ${fmtTime}</td></tr></table></div></div></div>`,
    }).catch(err => console.error("[cancel-manage] owner email failed:", err));
  }

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
