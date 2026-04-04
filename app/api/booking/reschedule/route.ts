import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAppointmentConfirmation } from "@/lib/whatsapp";
import { sendBusinessPushNotification } from "@/lib/push";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// POST /api/booking/reschedule
// Body: { token: string, new_appointment_at: string, new_staff_id: string }
// No auth required — the cancellation_token is the secret.
// Calls the reschedule_booking_atomic RPC (see migration 024) to atomically
// cancel the old booking and create a new one, preventing double-booking.
export async function POST(req: NextRequest) {
  let token: string, new_appointment_at: string, new_staff_id: string;
  try {
    const body = await req.json() as {
      token?: string;
      new_appointment_at?: string;
      new_staff_id?: string;
    };
    token             = body.token ?? "";
    new_appointment_at = body.new_appointment_at ?? "";
    new_staff_id      = body.new_staff_id ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!token || !new_appointment_at || !new_staff_id) {
    return NextResponse.json({ error: "token, new_appointment_at and new_staff_id are required" }, { status: 400 });
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

  const biz = existing.businesses as unknown as { booking_buffer_minutes: number | null } | null;
  const bufferMinutes = biz?.booking_buffer_minutes ?? 0;

  // 1. Call atomic RPC — re-checks availability server-side at the moment of submission
  const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc(
    "reschedule_booking_atomic",
    {
      p_old_token:          token,
      p_new_appointment_at: new_appointment_at,
      p_new_staff_id:       new_staff_id,
      p_buffer_minutes:     bufferMinutes,
    }
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
    .select("id, business_id, customer_name, customer_phone, service_name, appointment_at, whatsapp_opt_in, businesses(name, booking_slug, booking_timezone)")
    .eq("id", newBookingId)
    .maybeSingle();

  if (newBooking) {
    const business = newBooking.businesses as unknown as {
      name: string | null;
      booking_slug: string | null;
      booking_timezone: string | null;
    } | null;

    const businessName = business?.name ?? "";
    const tz = business?.booking_timezone ?? "Asia/Jerusalem";
    const date = new Date(newApptAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz });
    const time = new Date(newApptAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });

    // 3. Send WhatsApp confirmation to customer (non-blocking)
    // NOTE: customer_phone is stored as a masked display value.
    // WhatsApp delivery will succeed only if the phone resolves to a valid E.164.
    // This mirrors the pattern used elsewhere for post-creation notifications.
    if (newBooking.whatsapp_opt_in !== false) {
      Promise.resolve().then(() =>
        sendAppointmentConfirmation(
          {
            id:                  newBooking.id,
            business_id:         newBooking.business_id,
            customer_name:       newBooking.customer_name ?? "",
            customer_phone:      newBooking.customer_phone ?? "",
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
        )
      ).catch(e => console.error("[reschedule] WhatsApp send failed:", e));
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

    // 5. Audit log
    await supabaseAdmin.from("booking_audit_log").insert({
      booking_id: newBookingId,
      action:     "created",
      actor:      "customer",
      details:    { source: "reschedule", previous_token: token },
    });
  }

  // 6. Manage link for the new booking
  const newManageUrl = `${APP_URL}/manage/${newToken}`;

  return NextResponse.json({
    success:            true,
    new_token:          newToken,
    new_appointment_at: newApptAt,
    manage_url:         newManageUrl,
  });
}
