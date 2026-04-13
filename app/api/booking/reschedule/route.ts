import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAppointmentConfirmation } from "@/lib/whatsapp";
import { sendBookingMessage } from "@/lib/twilio";
import { sendBusinessPushNotification } from "@/lib/push";
import { decryptPhone } from "@/lib/phone";
import { sendEmail } from "@/lib/email";
import { syncBookingToGoogle, removeBookingFromGoogle } from "@/lib/google-calendar-sync";
import { syncBookingToMicrosoft, removeBookingFromMicrosoft } from "@/lib/microsoft-calendar-sync";
import { sendTelegramAlert } from "@/lib/telegram";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// POST /api/booking/reschedule
// Body: { token: string, new_appointment_at: string, new_staff_id?: string | null }
// No auth required — the cancellation_token is the secret.
// new_staff_id is optional — null/omitted for solo businesses with no staff system.
// Calls the reschedule_booking_atomic RPC (see migration 024) to atomically
// cancel the old booking and create a new one, preventing double-booking.
export async function POST(req: NextRequest) {
  let token: string, new_appointment_at: string, new_staff_id: string | null;
  try {
    const body = await req.json() as {
      token?: string;
      new_appointment_at?: string;
      new_staff_id?: string | null;
    };
    token             = body.token ?? "";
    new_appointment_at = body.new_appointment_at ?? "";
    new_staff_id      = body.new_staff_id ?? null;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!token || !new_appointment_at) {
    return NextResponse.json({ error: "token and new_appointment_at are required" }, { status: 400 });
  }

  // Validate ISO datetime format (YYYY-MM-DDTHH:MM:SS)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(new_appointment_at)) {
    return NextResponse.json({ error: "Invalid new_appointment_at format" }, { status: 400 });
  }

  // Reject past times
  if (new Date(new_appointment_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Cannot reschedule to a past time" }, { status: 400 });
  }

  // Fetch buffer minutes from the booking's business
  const { data: existing } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, businesses(booking_buffer_minutes)")
    .eq("cancellation_token", token)
    .eq("status", "confirmed")
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Booking not found or not eligible for rescheduling" }, { status: 404 });
  }

  const oldBookingId  = existing.id;
  const oldBusinessId = existing.business_id;
  const biz = existing.businesses as unknown as { booking_buffer_minutes: number | null } | null;
  const bufferMinutes = biz?.booking_buffer_minutes ?? 0;

  // 1. Call atomic RPC — re-checks availability server-side at the moment of submission
  const rpcParams: Record<string, unknown> = {
    p_old_token:          token,
    p_new_appointment_at: `${new_appointment_at}+00:00`,
    p_buffer_minutes:     bufferMinutes,
  };
  if (new_staff_id) rpcParams.p_new_staff_id = new_staff_id;

  const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc(
    "reschedule_booking_atomic",
    rpcParams as Parameters<typeof supabaseAdmin.rpc>[1]
  );

  if (rpcErr) {
    console.error("[reschedule] RPC error:", rpcErr.message);
    return NextResponse.json({ error: "Failed to reschedule" }, { status: 500 });
  }

  const result = rpcResult as {
    success: boolean;
    error?: string;
    new_booking_id?: string;
    new_token?: string;
    new_appointment_at?: string;
  };

  if (!result.success) {
    if (result.error === "slot_not_available") {
      return NextResponse.json(
        { error: "Sorry, that slot was just taken. Please choose another time." },
        { status: 409 }
      );
    }
    if (result.error === "booking_not_found_or_not_confirmed") {
      return NextResponse.json({ error: "Booking not found or no longer eligible." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to reschedule" }, { status: 500 });
  }

  const newBookingId  = result.new_booking_id!;
  const newToken      = result.new_token!;
  const newApptAt     = result.new_appointment_at ?? new_appointment_at;

  // 2. Fetch new booking + business for notifications
  const { data: newBooking } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, customer_name, customer_phone, customer_phone_encrypted, service_name, appointment_at, whatsapp_opt_in, businesses(name, booking_slug, booking_timezone, owner_email, notification_email)")
    .eq("id", newBookingId)
    .maybeSingle();

  if (newBooking) {
    const business = newBooking.businesses as unknown as {
      name: string | null;
      booking_slug: string | null;
      booking_timezone: string | null;
      owner_email?: string | null;
      notification_email?: string | null;
    } | null;

    const businessName = business?.name ?? "";
    const tz = business?.booking_timezone ?? "Asia/Jerusalem";
    const date = new Date(newApptAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz });
    const time = new Date(newApptAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });

    // 3. Send confirmation to customer (WhatsApp or SMS fallback) — non-blocking
    const manageUrl = `${APP_URL}/manage/${newToken}`;
    const firstName = (newBooking.customer_name ?? "there").split(" ")[0];

    // Decrypt real phone — customer_phone stores masked display value, unusable for Twilio
    const encPhone = (newBooking as typeof newBooking & { customer_phone_encrypted?: string }).customer_phone_encrypted;
    const realPhone = encPhone
      ? (() => { try { return decryptPhone(encPhone); } catch { return newBooking.customer_phone ?? ""; } })()
      : (newBooking.customer_phone ?? "");

    const smsFallback = () => {
      if (!realPhone) return;
      const smsBody = `Hi ${firstName}! ✅ Your ${newBooking.service_name ?? "appointment"} at ${businessName} has been rescheduled to ${date} at ${time}. Manage: ${manageUrl}`;
      void sendBookingMessage(realPhone, smsBody, false, { businessId: newBooking.business_id, bookingId: newBooking.id, messageType: "reschedule" });
    };

    if (newBooking.whatsapp_opt_in !== false) {
      Promise.resolve().then(async () => {
        const waResult = await sendAppointmentConfirmation(
          {
            id:                  newBooking.id,
            business_id:         newBooking.business_id,
            customer_name:       newBooking.customer_name ?? "",
            customer_phone:      realPhone,
            appointment_at:      newApptAt,
            service_name:        newBooking.service_name ?? "",
            cancellation_token:  newToken,
            whatsapp_opt_in:     true,
          },
          {
            id:           newBooking.business_id,
            name:         businessName,
            booking_slug: business?.booking_slug ?? "",
          }
        );
        if (!waResult.success) smsFallback();
      }).catch(e => { console.error("[reschedule] WhatsApp send failed:", e); smsFallback(); });
    } else {
      smsFallback();
    }

    // 4. Owner notification (non-blocking)
    const notifBody = `${newBooking.customer_name} rescheduled to ${date} at ${time}`;
    void supabaseAdmin.from("notifications").insert({
      business_id: newBooking.business_id,
      type:        "new_booking",
      title:       "Appointment rescheduled",
      body:        notifBody,
      read:        false,
    });

    Promise.resolve().then(() =>
      sendBusinessPushNotification(newBooking.business_id, {
        title: "Appointment rescheduled",
        body:  notifBody,
        data:  { type: "new_booking", id: newBookingId },
      })
    ).catch(e => console.error("[reschedule] push failed:", e));

    // Email business owner
    const ownerEmail = business?.notification_email ?? business?.owner_email;
    if (ownerEmail) {
      sendEmail({
        to: ownerEmail,
        subject: `Booking rescheduled: ${newBooking.customer_name} — ${newBooking.service_name} → ${date} at ${time}`,
        type: "booking_owner_notify",
        bookingId: newBookingId,
        html: `<div style="font-family:Inter,sans-serif;background:#F9FAFB;padding:24px;"><div style="max-width:520px;margin:0 auto;"><div style="background:#0A0F1E;border-radius:16px 16px 0 0;padding:20px 32px;"><span style="font-weight:700;font-size:20px;color:#fff;">vomni</span></div><div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;"><div style="background:#F59E0B;border-radius:12px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">Appointment Rescheduled</div><div style="font-size:14px;color:rgba(255,255,255,0.85);">New time: ${date} at ${time}</div></div><table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Customer</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${newBooking.customer_name ?? ""}</td></tr><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">Service</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${newBooking.service_name ?? ""}</td></tr><tr><td style="color:#6B7280;border-top:1px solid #F0F0F0;">New date</td><td style="font-weight:600;border-top:1px solid #F0F0F0;">${date} at ${time}</td></tr></table></div></div></div>`,
      }).catch(err => console.error("[reschedule] owner email failed:", err));
    }

    // 5. Audit log
    await supabaseAdmin.from("booking_audit_log").insert({
      booking_id: newBookingId,
      action:     "created",
      actor:      "customer",
      details:    { source: "reschedule", previous_token: token },
    });
  }

  // 6. Calendar sync — delete old event, create new one (with retry)
  after(async () => {
    // Remove old Google event first
    await removeBookingFromGoogle(oldBusinessId, oldBookingId).catch(() => {});
    // Create new Google event — retry once on failure
    try {
      let result = await syncBookingToGoogle(oldBusinessId, newBookingId);
      if (!result.success && !result.skipped) {
        await new Promise(r => setTimeout(r, 2000));
        result = await syncBookingToGoogle(oldBusinessId, newBookingId);
      }
      if (!result.success && !result.skipped) {
        await sendTelegramAlert(
          `📅 <b>Google Calendar sync failed after reschedule (2/2 attempts)</b>\n` +
          `<b>Business:</b> ${oldBusinessId}\n<b>New booking:</b> ${newBookingId}\n` +
          `<b>Error:</b> ${result.error ?? "unknown"}`
        );
      }
    } catch (err) {
      await sendTelegramAlert(
        `📅 <b>Google Calendar reschedule sync exception</b>\n` +
        `<b>Business:</b> ${oldBusinessId}\n<b>Error:</b> ${String(err).slice(0, 300)}`
      ).catch(() => {});
    }
  });

  after(async () => {
    // Remove old Microsoft event first
    await removeBookingFromMicrosoft(oldBusinessId, oldBookingId).catch(() => {});
    // Create new Microsoft event — retry once on failure
    try {
      let result = await syncBookingToMicrosoft(oldBusinessId, newBookingId);
      if (!result.success && !result.skipped) {
        await new Promise(r => setTimeout(r, 2000));
        result = await syncBookingToMicrosoft(oldBusinessId, newBookingId);
      }
      if (!result.success && !result.skipped) {
        await sendTelegramAlert(
          `📅 <b>Microsoft Calendar sync failed after reschedule (2/2 attempts)</b>\n` +
          `<b>Business:</b> ${oldBusinessId}\n<b>New booking:</b> ${newBookingId}\n` +
          `<b>Error:</b> ${result.error ?? "unknown"}`
        );
      }
    } catch (err) {
      await sendTelegramAlert(
        `📅 <b>Microsoft Calendar reschedule sync exception</b>\n` +
        `<b>Business:</b> ${oldBusinessId}\n<b>Error:</b> ${String(err).slice(0, 300)}`
      ).catch(() => {});
    }
  });

  // 7. Manage link for the new booking
  const newManageUrl = `${APP_URL}/manage/${newToken}`;

  return NextResponse.json({
    success:            true,
    new_token:          newToken,
    new_appointment_at: newApptAt,
    manage_url:         newManageUrl,
  });
}
