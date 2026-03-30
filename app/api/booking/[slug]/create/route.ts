import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateCancellationToken, computeAvailableSlots } from "@/lib/booking-utils";
import { sendBookingMessage } from "@/lib/twilio";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import type { BusinessHours, StaffHours } from "@/types/booking";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// POST /api/booking/[slug]/create — Create a booking atomically
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit: 5 bookings per IP per hour
  const ip = getClientIP(req);
  if (!checkRateLimit(`booking:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: {
    service_id: string;
    staff_id: string;
    date: string;
    time: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    notes?: string;
    send_reminder?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { service_id, staff_id, date, time, first_name, last_name, phone, email, notes } = body;

  // Basic input validation
  if (!service_id || !date || !time || !first_name || !last_name || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Sanitise inputs
  const safeFirst = first_name.trim().slice(0, 100);
  const safeLast = last_name.trim().slice(0, 100);
  const safePhone = phone.replace(/[^\d+\-() ]/g, "").trim().slice(0, 20);
  const safeNotes = notes?.trim().slice(0, 500) ?? null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
  }

  // Rate limit by phone too (prevent abuse)
  if (!checkRateLimit(`booking:phone:${safePhone}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many bookings for this phone number" }, { status: 429 });
  }

  // Fetch business
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, booking_buffer_minutes, booking_timezone, booking_enabled, booking_slug, whatsapp_enabled, owner_email, notification_email")
    .eq("booking_slug", slug)
    .single();

  if (!business || !business.booking_enabled) {
    return NextResponse.json({ error: "Business not found or booking disabled" }, { status: 404 });
  }

  // Fetch service
  const { data: service } = await supabaseAdmin
    .from("services")
    .select("id, name, name_he, duration_minutes, price, currency")
    .eq("id", service_id)
    .eq("business_id", business.id)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Determine staff — if "any", pick first available
  let resolvedStaffId: string | null = null;
  let staffName: string | null = null;

  if (staff_id && staff_id !== "any") {
    resolvedStaffId = staff_id;
    const { data: staffMember } = await supabaseAdmin
      .from("staff").select("name").eq("id", staff_id).single();
    staffName = staffMember?.name ?? null;
  } else {
    const { data: staffServicesRaw } = await supabaseAdmin
      .from("staff_services").select("staff_id").eq("service_id", service_id);
    const eligibleStaffIds = (staffServicesRaw ?? []).map(ss => ss.staff_id);

    if (eligibleStaffIds.length > 0) {
      const { data: bizHoursRaw } = await supabaseAdmin
        .from("business_hours").select("*").eq("business_id", business.id);
      const bizHours = (bizHoursRaw ?? []) as BusinessHours[];

      for (const sid of eligibleStaffIds) {
        const { data: shRaw } = await supabaseAdmin
          .from("staff_hours").select("*").eq("staff_id", sid);
        const staffHours = (shRaw ?? []) as StaffHours[];

        const bookings = await getBookingsForDate(business.id, date, sid);
        const blocked = await getBlockedTimes(business.id, date, sid);

        const slots = computeAvailableSlots(
          date, service.duration_minutes, business.booking_buffer_minutes ?? 0,
          bizHours, staffHours, bookings, blocked,
          business.booking_timezone ?? "Asia/Jerusalem",
        );

        if (slots.includes(time)) {
          resolvedStaffId = sid;
          const { data: sm } = await supabaseAdmin
            .from("staff").select("name").eq("id", sid).single();
          staffName = sm?.name ?? null;
          break;
        }
      }

      if (!resolvedStaffId) {
        return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
      }
    }
  }

  const cancellationToken = generateCancellationToken();
  const appointmentAt = `${date}T${time}:00`;
  const customerName = `${safeFirst} ${safeLast}`.trim();
  const bufferMinutes = business.booking_buffer_minutes ?? 0;

  // Use atomic RPC if staff is resolved (prevents double-booking)
  let bookingId: string;

  if (resolvedStaffId) {
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc("create_booking_atomic", {
      p_business_id: business.id,
      p_staff_id: resolvedStaffId,
      p_service_id: service.id,
      p_appointment_at: appointmentAt,
      p_duration_minutes: service.duration_minutes,
      p_buffer_minutes: bufferMinutes,
      p_customer_name: customerName,
      p_customer_phone: safePhone,
      p_customer_email: email || null,
      p_notes: safeNotes,
      p_cancellation_token: cancellationToken,
      p_service_name: service.name,
      p_service_price: service.price ?? null,
    });

    if (rpcErr) {
      console.error("[booking/create] RPC error:", rpcErr.message);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; booking_id?: string };
    if (!result.success) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }
    bookingId = result.booking_id!;
  } else {
    // No staff — direct insert
    const { data: booking, error: insertErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        business_id: business.id,
        service_id: service.id,
        customer_name: customerName,
        customer_phone: safePhone,
        customer_email: email || null,
        service: service.name,
        service_name: service.name,
        service_duration_minutes: service.duration_minutes,
        service_price: service.price,
        appointment_at: appointmentAt,
        booking_source: "vomni",
        status: "confirmed",
        sms_status: "pending",
        notes: safeNotes,
        cancellation_token: cancellationToken,
        reminder_sent: false,
        confirmation_sent: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !booking) {
      console.error("[booking/create] insert error:", insertErr?.message);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
    bookingId = booking.id;
  }

  // Fetch the created booking for response
  const { data: created } = await supabaseAdmin
    .from("bookings")
    .select("id, appointment_at, service_name, service_duration_minutes, service_price, status, cancellation_token")
    .eq("id", bookingId)
    .single();

  // Send confirmation SMS
  const cancelUrl = `${APP_URL}/cancel/${cancellationToken}`;
  const smsBody = staffName
    ? `Hi ${safeFirst}! ✅ Your ${service.name} appointment at ${business.name} is confirmed for ${date} at ${time} with ${staffName}. Cancel: ${cancelUrl}`
    : `Hi ${safeFirst}! ✅ Your ${service.name} appointment at ${business.name} is confirmed for ${date} at ${time}. Cancel: ${cancelUrl}`;

  const smsResult = await sendBookingMessage(safePhone, smsBody, business.whatsapp_enabled ?? false);
  if (smsResult.success) {
    await supabaseAdmin.from("bookings").update({ confirmation_sent: true }).eq("id", bookingId);
  }

  // Email notification to business owner
  const notifyEmail = (business as typeof business & { notification_email?: string; owner_email?: string }).notification_email
    ?? (business as typeof business & { notification_email?: string; owner_email?: string }).owner_email;

  if (notifyEmail && process.env.RESEND_API_KEY) {
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";
    const cancelUrl = `${appUrl}/cancel/${cancellationToken}`;
    const apptDate  = new Date(appointmentAt).toLocaleString("en-GB", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:Inter,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 20px;">
  <tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:#0A0F1E;padding:20px 32px;">
      <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:20px;color:#fff;">vomni</span>
    </td></tr>
    <tr><td style="padding:28px 32px;">
      <div style="background:#00C896;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">New Booking!</div>
        <div style="font-family:Inter,sans-serif;font-size:14px;color:rgba(255,255,255,0.85);">${apptDate}</div>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        ${[
          ["Customer",  customerName],
          ["Phone",     safePhone],
          ["Service",   service.name],
          ["Duration",  `${service.duration_minutes} min`],
          ...(service.price ? [["Price", `£${service.price}`]] : []),
          ...(staffName ? [["Staff", staffName]] : []),
          ...(safeNotes ? [["Notes", safeNotes]] : []),
        ].map(([label, val], i) => `
        <tr style="background:${i % 2 === 0 ? "#F9FAFB" : "#fff"}">
          <td style="padding:10px 16px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#6B7280;width:110px;">${label}</td>
          <td style="padding:10px 16px;font-family:Inter,sans-serif;font-size:14px;color:#0A0F1E;">${val}</td>
        </tr>`).join("")}
      </table>
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${appUrl}/dashboard/calendar" style="display:inline-block;padding:13px 28px;background:#0A0F1E;color:#fff;text-decoration:none;border-radius:9999px;font-size:14px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;">
          View in Calendar →
        </a>
      </div>
      <div style="text-align:center;">
        <a href="${cancelUrl}" style="font-family:Inter,sans-serif;font-size:12px;color:#9CA3AF;text-decoration:none;">Customer cancel link</a>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #F0F0F0;text-align:center;">
      <p style="font-size:12px;color:#D1D5DB;margin:0;font-family:Inter,sans-serif;">
        <a href="${appUrl}" style="color:#9CA3AF;text-decoration:none;">vomni.io</a>
        &nbsp;·&nbsp;
        <a href="mailto:hello@vomni.io" style="color:#9CA3AF;text-decoration:none;">hello@vomni.io</a>
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;

    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    process.env.RESEND_FROM_ADDRESS ?? "bookings@vomni.app",
        to:      [notifyEmail],
        subject: `New booking: ${customerName} — ${service.name} on ${date} at ${time}`,
        html:    emailHtml,
      }),
    }).catch(err => console.error("[booking/create] email notification failed:", err));
  }

  // Audit log
  await supabaseAdmin.from("booking_audit_log").insert({
    booking_id: bookingId,
    action: "created",
    actor: "customer",
    details: { ip, service: service.name, date, time },
  });

  return NextResponse.json({
    booking: {
      id: created?.id ?? bookingId,
      appointment_at: created?.appointment_at ?? appointmentAt,
      service_name: created?.service_name ?? service.name,
      service_duration_minutes: created?.service_duration_minutes ?? service.duration_minutes,
      service_price: created?.service_price ?? service.price,
      staff_name: staffName,
      business_name: business.name,
      cancellation_token: created?.cancellation_token ?? cancellationToken,
      status: created?.status ?? "confirmed",
    },
  });
}

async function getBookingsForDate(businessId: string, date: string, staffId: string) {
  const { data } = await supabaseAdmin
    .from("bookings")
    .select("appointment_at, service_duration_minutes")
    .eq("business_id", businessId)
    .eq("staff_id", staffId)
    .eq("status", "confirmed")
    .gte("appointment_at", `${date}T00:00:00`)
    .lte("appointment_at", `${date}T23:59:59`);
  return (data ?? []) as { appointment_at: string; service_duration_minutes: number | null }[];
}

async function getBlockedTimes(businessId: string, date: string, staffId: string) {
  const { data } = await supabaseAdmin
    .from("blocked_times")
    .select("start_at, end_at")
    .lte("start_at", `${date}T23:59:59`)
    .gte("end_at", `${date}T00:00:00`)
    .or(`staff_id.eq.${staffId},and(staff_id.is.null,business_id.eq.${businessId})`);
  return (data ?? []) as { start_at: string; end_at: string }[];
}
