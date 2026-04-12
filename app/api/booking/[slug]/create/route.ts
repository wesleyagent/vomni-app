import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateCancellationToken, computeAvailableSlots } from "@/lib/booking-utils";
import { sendBookingMessage } from "@/lib/twilio";
import { sendAppointmentConfirmation } from "@/lib/whatsapp";
import { checkRateLimitGlobal, getClientIP } from "@/lib/rate-limit";
import { sendEmail, buildOwnerNotifyHtml, buildCustomerConfirmHtml } from "@/lib/email";
import { upsertSingleCustomerProfile } from "@/lib/customer-profile-sync";
import { sendBusinessPushNotification } from "@/lib/push";
import { normaliseToE164, encryptPhone, maskPhone, fingerprintPhone } from "@/lib/phone";
import type { BusinessHours, StaffHours } from "@/types/booking";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// POST /api/booking/[slug]/create — Create a booking atomically
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit per IP — raised to 50/hr to avoid false positives on mobile
  // networks where thousands of users share a single IP via CGNAT.
  // The per-phone limit (3/hr) is the real abuse gate.
  const ip = getClientIP(req);
  if (!await checkRateLimitGlobal(`booking:ip:${ip}`, 50, 3600)) {
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
    whatsapp_opt_in?: boolean;
    marketing_consent?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { service_id, staff_id, date, time, first_name, last_name, phone, email, notes, whatsapp_opt_in, marketing_consent } = body;

  // Basic input validation
  if (!service_id || !date || !time || !first_name || !last_name || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Sanitise inputs
  const safeFirst = first_name.trim().slice(0, 100);
  const safeLast  = last_name.trim().slice(0, 100);
  const safeNotes = notes?.trim().slice(0, 500) ?? null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
  }

  // Normalise phone to E.164 — reject if not normalisable
  let phoneE164: string;
  let phoneEncrypted: string;
  let phoneDisplay: string;
  let phoneFingerprint: string; // filled after we know businessId

  try {
    phoneE164 = normaliseToE164(phone);
    phoneEncrypted = encryptPhone(phoneE164);
    phoneDisplay   = maskPhone(phoneE164);
  } catch {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
  }

  // Rate limit by phone (prevent abuse) — global across all instances
  if (!await checkRateLimitGlobal(`booking:phone:${phoneDisplay}`, 3, 3600)) {
    return NextResponse.json({ error: "Too many bookings for this phone number" }, { status: 429 });
  }

  // safePhone alias — used only in-memory for Twilio/email; never written to DB as plaintext
  const safePhone = phoneE164;

  // Fetch business
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, booking_buffer_minutes, booking_timezone, booking_enabled, booking_slug, whatsapp_enabled, owner_email, notification_email, booking_currency")
    .eq("booking_slug", slug)
    .single();

  if (!business || !business.booking_enabled) {
    return NextResponse.json({ error: "Business not found or booking disabled" }, { status: 404 });
  }

  // All customers use SMS/WhatsApp — no email requirement
  const useEmailChannel = false; // email routing deprecated; kept to avoid rewriting downstream refs

  // Now that we have the businessId, compute the dedup fingerprint
  phoneFingerprint = fingerprintPhone(phoneE164, business.id);

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
      p_customer_phone: phoneDisplay,  // masked — RPC stores display, we overwrite with encrypted below
      p_customer_email: email || null,
      p_notes: safeNotes,
      p_cancellation_token: cancellationToken,
      p_service_name: service.name,
      p_service_price: service.price ?? null,
    });

    if (rpcErr) {
      console.error("[booking/create] RPC error:", {
        message: rpcErr.message,
        code:    (rpcErr as any).code,
        details: (rpcErr as any).details,
        hint:    (rpcErr as any).hint,
      });
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; booking_id?: string };
    if (!result.success) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }
    bookingId = result.booking_id!;

    // Immediately overwrite customer_phone with display value and store encrypted
    // (the RPC stored the raw phone — we replace it now)
    // For ILS businesses also suppress SMS so the SMS cron never picks this up —
    // the customer receives email confirmation instead.
    await supabaseAdmin.from("bookings").update({
      customer_phone:           phoneDisplay,
      phone_display:            phoneDisplay,
      customer_phone_encrypted: phoneEncrypted,
      ...(useEmailChannel ? { sms_status: "suppressed" } : {}),
    }).eq("id", bookingId);
  } else {
    // No staff — direct insert
    const { data: booking, error: insertErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        business_id: business.id,
        service_id: service.id,
        customer_name: customerName,
        customer_phone:           phoneDisplay,            // masked — not raw
        phone_display:            phoneDisplay,
        customer_phone_encrypted: phoneEncrypted,          // AES-256-GCM encrypted
        customer_email: email || null,
        service: service.name,
        service_name: service.name,
        service_duration_minutes: service.duration_minutes,
        service_price: service.price,
        appointment_at: appointmentAt,
        booking_source: "vomni",
        status: "confirmed",
        // ILS businesses use email — suppress SMS so cron never picks this up
        sms_status: useEmailChannel ? "suppressed" : "pending",
        notes: safeNotes,
        cancellation_token: cancellationToken,
        whatsapp_opt_in: whatsapp_opt_in !== false,
        marketing_consent: marketing_consent === true,
        whatsapp_status: "pending",
        reminder_sent: false,
        confirmation_sent: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !booking) {
      if ((insertErr as any)?.code === "23505") {
        return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
      }
      console.error("[booking/create] insert error:", {
        message: insertErr?.message,
        code:    (insertErr as any)?.code,
        details: (insertErr as any)?.details,
        hint:    (insertErr as any)?.hint,
      });
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

  const cancelUrl = `${APP_URL}/cancel/${cancellationToken}`;
  const icalUrl   = `${APP_URL}/api/booking/${slug}/calendar.ics?booking_id=${bookingId}`;
  const apptLabel = new Date(`${appointmentAt}Z`).toLocaleString("en-GB", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // Israeli businesses → skip WhatsApp/SMS entirely; customer confirmation email is sent below

  // Send WhatsApp confirmation (primary) or SMS fallback — skipped for ILS businesses
  const waOptIn = whatsapp_opt_in !== false;
  if (!useEmailChannel && waOptIn) {
    const waResult = await sendAppointmentConfirmation(
      { id: bookingId, business_id: business.id, customer_name: customerName, customer_phone: safePhone, appointment_at: appointmentAt, service_name: service.name, cancellation_token: cancellationToken, whatsapp_opt_in: true },
      { id: business.id, name: business.name, booking_slug: business.booking_slug }
    );
    await supabaseAdmin.from("bookings").update({
      confirmation_sent: waResult.success,
      whatsapp_status: waResult.success ? "sent" : "failed",
      whatsapp_opt_in: true,
    }).eq("id", bookingId);

    // If WhatsApp failed, fall back to SMS
    if (!waResult.success) {
      const smsBody = staffName
        ? `Hi ${safeFirst}! ✅ Your ${service.name} at ${business.name} is confirmed for ${date} at ${time} with ${staffName}. Cancel: ${cancelUrl}`
        : `Hi ${safeFirst}! ✅ Your ${service.name} at ${business.name} is confirmed for ${date} at ${time}. Cancel: ${cancelUrl}`;
      const smsResult = await sendBookingMessage(safePhone, smsBody, false, { businessId: business.id, bookingId, messageType: "confirmation" });
      if (smsResult.success) {
        await supabaseAdmin.from("bookings").update({ confirmation_sent: true }).eq("id", bookingId);
      }
    }
  } else if (!useEmailChannel) {
    // Customer opted out of WhatsApp — send SMS (non-ILS only)
    await supabaseAdmin.from("bookings").update({ whatsapp_opt_in: false, whatsapp_status: "opted_out" }).eq("id", bookingId);
    const smsBody = staffName
      ? `Hi ${safeFirst}! ✅ Your ${service.name} at ${business.name} is confirmed for ${date} at ${time} with ${staffName}. Cancel: ${cancelUrl}`
      : `Hi ${safeFirst}! ✅ Your ${service.name} at ${business.name} is confirmed for ${date} at ${time}. Cancel: ${cancelUrl}`;
    const smsResult = await sendBookingMessage(safePhone, smsBody, false, { businessId: business.id, bookingId, messageType: "confirmation" });
    if (smsResult.success) {
      await supabaseAdmin.from("bookings").update({ confirmation_sent: true }).eq("id", bookingId);
    }
  }

  const biz = business as typeof business & {
    notification_email?: string;
    owner_email?: string;
    address?: string | null;
  };
  const notifyEmail = biz.notification_email ?? biz.owner_email;

  // Email to business owner — logged, non-blocking
  if (notifyEmail) {
    sendEmail({
      to:        notifyEmail,
      subject:   `New booking: ${customerName} — ${service.name} on ${date} at ${time}`,
      type:      "booking_owner_notify",
      bookingId,
      html: buildOwnerNotifyHtml({
        customerName,
        phone:       phoneDisplay,
        service:     service.name,
        duration:    service.duration_minutes,
        price:       service.price ?? null,
        staffName,
        notes:       safeNotes,
        date, time,
        apptLabel,
        calendarUrl: `${APP_URL}/dashboard/calendar`,
        cancelUrl,
      }),
    }).catch(err => console.error("[booking/create] owner email failed:", err));
  }

  // Confirmation email to customer — if email provided
  // For ILS businesses this is the primary channel; also marks confirmation_sent
  if (email) {
    sendEmail({
      to:        email,
      subject:   `Booking confirmed — ${service.name} at ${business.name}`,
      type:      "booking_customer_confirm",
      bookingId,
      html: buildCustomerConfirmHtml({
        firstName:    safeFirst,
        businessName: business.name ?? "your appointment",
        service:      service.name,
        duration:     service.duration_minutes,
        staffName,
        apptLabel,
        date, time,
        icalUrl,
        cancelUrl,
        address:      biz.address ?? null,
        manageUrl:    `${APP_URL}/manage/${cancellationToken}`,
      }),
    })
      .then(result => {
        if (result.success && useEmailChannel) {
          supabaseAdmin.from("bookings").update({ confirmation_sent: true }).eq("id", bookingId)
            .then(() => {}, () => {});
        }
      })
      .catch(err => console.error("[booking/create] customer email failed:", err));
  }

  // Notification: new booking (non-blocking, fire and forget)
  void supabaseAdmin.from("notifications").insert({
    business_id: business.id,
    type: "new_booking",
    title: "New booking",
    body: `${customerName} booked ${service.name} on ${date} at ${time}`,
    read: false,
  });

  // Send push notification to business (non-blocking)
  Promise.resolve().then(() => sendBusinessPushNotification(business.id, {
    title: "New booking 📅",
    body: `${customerName} booked ${service.name} at ${time}`,
    data: { type: "new_booking", id: bookingId },
  })).catch(e => console.error("[booking/create] push failed:", e));

  // Audit log
  await supabaseAdmin.from("booking_audit_log").insert({
    booking_id: bookingId,
    action: "created",
    actor: "customer",
    details: { ip, service: service.name, date, time },
  });

  // CRM nudge conversion tracking (non-blocking)
  Promise.resolve().then(async () => {
    const { data: nudge } = await supabaseAdmin
      .from("crm_nudges")
      .select("id")
      .eq("customer_phone", phoneDisplay)
      .eq("converted", false)
      .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (nudge) {
      await supabaseAdmin.from("crm_nudges").update({ converted: true, converted_booking_id: bookingId }).eq("id", nudge.id);

      // Trigger 3: nudge_converted notification (non-blocking within this block)
      try {
        const notifBody = `${customerName} booked after receiving a re-engagement message.`;
        const { data: existingNotif } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("business_id", business.id)
          .eq("type", "nudge_converted")
          .ilike("body", `${customerName}%`)
          .maybeSingle();
        if (!existingNotif) {
          void supabaseAdmin.from("notifications").insert({
            business_id: business.id,
            type: "nudge_converted",
            title: "Re-engagement worked",
            body: notifBody,
            read: false,
          });
          sendBusinessPushNotification(business.id, {
            title: "Re-engagement worked",
            body: notifBody,
            data: { type: "nudge_converted", id: bookingId },
          }).catch(e => console.error("[booking/create] nudge_converted push failed:", e));
        }
      } catch (e) {
        console.error("[booking/create] nudge_converted notification failed:", e);
      }
    }
  }).catch(e => console.error("[booking/create] nudge tracking failed:", e));

  // Sync customer profile in real time so the customer appears immediately in the dashboard CRM
  // (the nightly full-rebuild cron is still the source of truth — this is just a fast-path upsert)
  void upsertSingleCustomerProfile(bookingId);

  // Push to Google Calendar (non-blocking)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";
  fetch(`${appUrl}/api/calendar/google/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: business.id, booking_id: bookingId }),
  }).catch(err => console.error("[booking/create] google sync failed:", err));

  // Push to Microsoft Calendar (non-blocking)
  fetch(`${appUrl}/api/calendar/microsoft/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: business.id, booking_id: bookingId }),
  }).catch(err => console.error("[booking/create] microsoft sync failed:", err));

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
