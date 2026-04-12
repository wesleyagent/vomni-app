import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";
import { decryptPhone } from "@/lib/phone";
import { sendEmail } from "@/lib/email";
import { removeBookingFromGoogle } from "@/lib/google-calendar-sync";
import { removeBookingFromMicrosoft } from "@/lib/microsoft-calendar-sync";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// GET /api/booking/cancel/[token] — Fetch booking details for cancellation page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, customer_name, service_name, service_duration_minutes, appointment_at, status, cancelled_at")
    .eq("cancellation_token", token)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("name, logo_url, booking_cancellation_hours, booking_slug")
    .eq("id", booking.business_id)
    .single();

  if (booking.status === "cancelled") {
    return NextResponse.json({
      booking: { ...booking, business_name: business?.name },
      already_cancelled: true,
    });
  }

  const cancellationHours = business?.booking_cancellation_hours ?? 24;
  const appointmentTime = new Date(booking.appointment_at).getTime();
  const now = Date.now();
  const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
  const canCancel = hoursUntil > cancellationHours;

  return NextResponse.json({
    booking: {
      id: booking.id,
      customer_name: booking.customer_name,
      service_name: booking.service_name,
      service_duration_minutes: booking.service_duration_minutes,
      appointment_at: booking.appointment_at,
      status: booking.status,
      business_name: business?.name,
      logo_url: business?.logo_url,
    },
    can_cancel: canCancel,
    cancellation_hours: cancellationHours,
    hours_until_appointment: Math.round(hoursUntil * 10) / 10,
  });
}

// POST /api/booking/cancel/[token] — Cancel the booking
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let reason = "";
  try {
    const body = await req.json();
    reason = body.reason ?? "";
  } catch { /* no body is fine */ }

  // Fetch booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, customer_name, customer_phone, customer_phone_encrypted, appointment_at, status, service_name, staff_id")
    .eq("cancellation_token", token)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  }

  // Check cancellation policy
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("name, booking_cancellation_hours, booking_slug, whatsapp_enabled, owner_email, notification_email")
    .eq("id", booking.business_id)
    .single();

  const cancellationHours = business?.booking_cancellation_hours ?? 24;
  const appointmentTime = new Date(booking.appointment_at).getTime();
  const hoursUntil = (appointmentTime - Date.now()) / (1000 * 60 * 60);

  if (hoursUntil <= cancellationHours) {
    return NextResponse.json({
      error: `Cannot cancel within ${cancellationHours} hours of appointment`,
    }, { status: 400 });
  }

  // Cancel the booking
  const { error: updateErr } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason || null,
      cancelled_at: new Date().toISOString(),
      sms_status: "cancelled", // Suppress 24h review request
    })
    .eq("id", booking.id);

  if (updateErr) {
    console.error("[booking/cancel] update error:", updateErr.message);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }

  // Notification: booking cancelled (non-blocking, fire and forget)
  void supabaseAdmin.from("notifications").insert({
    business_id: booking.business_id,
    type: "booking_cancelled",
    title: "Booking cancelled",
    body: `${booking.customer_name} cancelled their ${booking.service_name} on ${booking.appointment_at?.substring(0,10) ?? ""} at ${booking.appointment_at?.substring(11,16) ?? ""}`,
    read: false,
  });

  // Audit log
  await supabaseAdmin.from("booking_audit_log").insert({
    booking_id: booking.id,
    action: "cancelled",
    actor: "customer",
    details: { reason },
  });

  // Send cancellation confirmation SMS
  const firstName = booking.customer_name?.split(" ")[0] ?? "there";
  const date = booking.appointment_at?.substring(0, 10) ?? "";
  const time = booking.appointment_at?.substring(11, 16) ?? "";
  const rebookUrl = business?.booking_slug ? `${APP_URL}/book/${business.booking_slug}` : null;

  const smsBody = [
    `Hi ${firstName}, your ${booking.service_name} appointment at ${business?.name ?? "us"} on ${date} at ${time} has been cancelled.`,
    rebookUrl ? `Book again anytime: ${rebookUrl}` : null,
  ].filter(Boolean).join(" ");

  // Decrypt real phone — customer_phone stores masked display value, unusable for Twilio
  const encPhone = (booking as typeof booking & { customer_phone_encrypted?: string }).customer_phone_encrypted;
  const sendPhone = encPhone
    ? (() => { try { return decryptPhone(encPhone); } catch { return booking.customer_phone ?? ""; } })()
    : (booking.customer_phone ?? "");

  await sendBookingMessage(sendPhone, smsBody, business?.whatsapp_enabled ?? false, { businessId: booking.business_id, bookingId: booking.id, messageType: "cancellation" });

  // Email business owner
  const ownerEmail = (business as typeof business & { notification_email?: string; owner_email?: string })?.notification_email
    ?? (business as typeof business & { owner_email?: string })?.owner_email;
  if (ownerEmail) {
    const appDate = date || booking.appointment_at?.substring(0, 10) || "";
    const appTime = time || booking.appointment_at?.substring(11, 16) || "";
    sendEmail({
      to: ownerEmail,
      subject: `Booking cancelled: ${booking.customer_name} — ${booking.service_name} on ${appDate} at ${appTime}`,
      type: "booking_owner_notify",
      bookingId: booking.id,
      html: `<div style="font-family:Inter,sans-serif;background:#F9FAFB;padding:24px;"><div style="max-width:520px;margin:0 auto;"><div style="background:#0A0F1E;border-radius:16px 16px 0 0;padding:20px 32px;"><span style="font-weight:700;font-size:20px;color:#fff;">vomni</span></div><div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;"><div style="background:#EF4444;border-radius:12px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">Booking Cancelled</div><div style="font-size:14px;color:rgba(255,255,255,0.85);">${appDate} at ${appTime}</div></div><table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Customer</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${booking.customer_name ?? ""}</td></tr><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Service</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${booking.service_name ?? ""}</td></tr>${reason ? `<tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Reason</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${reason}</td></tr>` : ""}</table></div></div></div>`,
    }).catch(err => console.error("[booking/cancel] owner email failed:", err));
  }

  // Notify waitlist — find the first person waiting for this exact slot
  const apptDateStr = date || undefined;
  const apptTimeStr = time || undefined;
  if (apptDateStr && apptTimeStr) {
    // Query new waitlist table for this exact slot
    let waitlistQuery = supabaseAdmin
      .from("waitlist")
      .select("id, customer_name, customer_phone, confirmation_token, cancellation_token")
      .eq("business_id", booking.business_id)
      .eq("requested_date", apptDateStr)
      .eq("requested_time", apptTimeStr)
      .eq("status", "waiting")
      .order("position", { ascending: true })
      .limit(1);

    if (booking.staff_id) {
      waitlistQuery = waitlistQuery.eq("staff_id", booking.staff_id);
    }

    const { data: next } = await waitlistQuery.maybeSingle();

    if (next) {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("waitlist")
        .update({
          status:      "notified",
          notified_at: new Date().toISOString(),
          expires_at:  expiresAt,
        })
        .eq("id", next.id);

      const wFirstName = next.customer_name?.split(" ")[0] ?? "there";
      const confirmUrl = `${APP_URL}/waitlist/confirm/${next.confirmation_token}`;
      const wCancelUrl  = `${APP_URL}/waitlist/cancel/${next.cancellation_token}`;

      const wMsg = [
        `Hi ${wFirstName}, a slot just opened at ${business?.name ?? "us"} on ${apptDateStr} at ${apptTimeStr}.`,
        `Reply YES or confirm: ${confirmUrl}`,
        `You have 15 minutes.`,
        `Remove me: ${wCancelUrl}`,
      ].join(" ");

      await sendBookingMessage(next.customer_phone, wMsg, business?.whatsapp_enabled ?? false, { businessId: booking.business_id, messageType: "waitlist_notify" });
    }
  }

  // Remove from Google Calendar (non-blocking, with retry suppressed — deletion is best-effort)
  const cancelledBookingId  = booking.id;
  const cancelledBusinessId = booking.business_id;
  after(async () => {
    await removeBookingFromGoogle(cancelledBusinessId, cancelledBookingId).catch(
      err => console.error("[booking/cancel] google calendar removal failed:", err)
    );
  });

  after(async () => {
    await removeBookingFromMicrosoft(cancelledBusinessId, cancelledBookingId).catch(
      err => console.error("[booking/cancel] microsoft calendar removal failed:", err)
    );
  });

  return NextResponse.json({ success: true });
}
