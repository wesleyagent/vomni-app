import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";
import { generateCancellationToken } from "@/lib/booking-utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// GET /api/waitlist/confirm/[token] — Return waitlist entry details for the confirm page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: entry } = await supabaseAdmin
    .from("waitlist")
    .select("id, business_id, service_id, staff_id, requested_date, requested_time, customer_name, status, expires_at, notified_at")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("name, logo_url")
    .eq("id", entry.business_id)
    .single();

  const { data: service } = entry.service_id
    ? await supabaseAdmin.from("services").select("name, duration_minutes, price, currency").eq("id", entry.service_id).single()
    : { data: null };

  const expired = entry.expires_at ? new Date(entry.expires_at) < new Date() : false;

  return NextResponse.json({
    entry: {
      status: entry.status,
      requested_date: entry.requested_date,
      requested_time: entry.requested_time,
      customer_name: entry.customer_name,
      expires_at: entry.expires_at,
      is_expired: expired,
    },
    business: { name: business?.name, logo_url: business?.logo_url },
    service: service ? { name: service.name, duration_minutes: service.duration_minutes, price: service.price, currency: service.currency } : null,
  });
}

// POST /api/waitlist/confirm/[token] — Confirm the waitlist slot and create booking
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Fetch waitlist entry
  const { data: entry } = await supabaseAdmin
    .from("waitlist")
    .select("id, business_id, service_id, staff_id, requested_date, requested_time, customer_name, customer_phone, status, expires_at")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (entry.status === "confirmed") {
    return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
  }

  if (entry.status === "expired" || entry.status === "cancelled") {
    return NextResponse.json({ error: "This waitlist slot is no longer active" }, { status: 410 });
  }

  if (entry.status !== "notified") {
    return NextResponse.json({ error: "Slot not yet available for confirmation" }, { status: 400 });
  }

  // Check 15-minute window hasn't expired
  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    await supabaseAdmin.from("waitlist").update({ status: "expired" }).eq("id", entry.id);
    return NextResponse.json({ error: "Confirmation window expired" }, { status: 410 });
  }

  // Fetch business + service details needed to create booking
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, booking_slug, booking_buffer_minutes, whatsapp_enabled")
    .eq("id", entry.business_id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data: service } = entry.service_id
    ? await supabaseAdmin.from("services").select("id, name, duration_minutes, price, currency").eq("id", entry.service_id).single()
    : { data: null };

  const durationMinutes = service?.duration_minutes ?? 30;
  const bufferMinutes = business.booking_buffer_minutes ?? 0;
  const appointmentAt = `${entry.requested_date}T${entry.requested_time}:00`;
  const slotEnd = new Date(new Date(appointmentAt).getTime() + (durationMinutes + bufferMinutes) * 60 * 1000).toISOString();

  // Check slot is still free before creating booking (conflict check)
  let conflictQuery = supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("business_id", entry.business_id)
    .eq("status", "confirmed")
    .lt("appointment_at", slotEnd)
    .gt("appointment_at", new Date(new Date(appointmentAt).getTime() - durationMinutes * 60 * 1000).toISOString());

  if (entry.staff_id) {
    conflictQuery = conflictQuery.eq("staff_id", entry.staff_id);
  }

  const { count: conflictCount } = await conflictQuery;

  if ((conflictCount ?? 0) > 0) {
    // Slot taken — mark as expired, notify next in queue
    await supabaseAdmin.from("waitlist").update({ status: "expired" }).eq("id", entry.id);

    // Send apology SMS
    const firstName = entry.customer_name?.split(" ")[0] ?? "there";
    await sendBookingMessage(
      entry.customer_phone,
      `Hi ${firstName}, unfortunately the slot at ${business.name} on ${entry.requested_date} at ${entry.requested_time} was just taken. We'll check if the next slot is available for you.`,
      business.whatsapp_enabled ?? false,
      { businessId: entry.business_id, messageType: "waitlist_expired" }
    );

    // Notify next person in queue
    await notifyNextInQueue(entry.business_id, entry.requested_date, entry.requested_time, entry.staff_id, entry.id);

    return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
  }

  // Create the booking
  const cancellationToken = generateCancellationToken();
  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from("bookings")
    .insert({
      business_id:               business.id,
      staff_id:                  entry.staff_id ?? null,
      service_id:                entry.service_id ?? null,
      service_name:              service?.name ?? "Appointment",
      service:                   service?.name ?? "Appointment",
      service_duration_minutes:  durationMinutes,
      service_price:             service?.price ?? null,
      customer_name:             entry.customer_name,
      customer_phone:            entry.customer_phone,
      phone_display:             entry.customer_phone,
      appointment_at:            appointmentAt,
      booking_source:            "waitlist",
      status:                    "confirmed",
      sms_status:                "pending",
      cancellation_token:        cancellationToken,
      reminder_sent:             false,
      confirmation_sent:         false,
      created_at:                new Date().toISOString(),
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("[waitlist/confirm] booking insert error:", bookingErr?.message);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Mark waitlist entry as confirmed
  await supabaseAdmin
    .from("waitlist")
    .update({ status: "confirmed" })
    .eq("id", entry.id);

  // Send confirmation SMS
  const firstName = entry.customer_name?.split(" ")[0] ?? "there";
  const cancelUrl = `${APP_URL}/cancel/${cancellationToken}`;
  const smsBody = `Hi ${firstName}! ✅ Your booking at ${business.name} is confirmed for ${entry.requested_date} at ${entry.requested_time}. Cancel: ${cancelUrl}`;
  await sendBookingMessage(entry.customer_phone, smsBody, business.whatsapp_enabled ?? false, { businessId: entry.business_id, messageType: "waitlist_confirmation" });

  return NextResponse.json({
    success: true,
    booking: {
      id: booking.id,
      appointment_at: appointmentAt,
      service_name: service?.name ?? "Appointment",
      cancellation_token: cancellationToken,
      cancel_url: cancelUrl,
    },
  });
}

/**
 * After an entry expires or is taken, notify the next waiting person in the queue.
 */
async function notifyNextInQueue(
  businessId: string,
  date: string,
  time: string,
  staffId: string | null,
  skipEntryId: string
) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

  const { data: next } = await supabaseAdmin
    .from("waitlist")
    .select("id, customer_name, customer_phone, confirmation_token")
    .eq("business_id", businessId)
    .eq("requested_date", date)
    .eq("requested_time", time)
    .eq("status", "waiting")
    .neq("id", skipEntryId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next) return;

  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("name, whatsapp_enabled")
    .eq("id", businessId)
    .single();

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from("waitlist")
    .update({ status: "notified", notified_at: new Date().toISOString(), expires_at: expiresAt })
    .eq("id", next.id);

  const firstName = next.customer_name?.split(" ")[0] ?? "there";
  const confirmUrl = `${APP_URL}/waitlist/confirm/${next.confirmation_token}`;
  const cancelUrl = next.confirmation_token
    ? `${APP_URL}/waitlist/cancel/${next.confirmation_token}`
    : null;

  const smsBody = [
    `Hi ${firstName}, a slot opened at ${biz?.name ?? "us"} on ${date} at ${time}.`,
    `Reply YES or confirm here: ${confirmUrl}`,
    `You have 15 minutes.`,
    cancelUrl ? `Remove me: ${cancelUrl}` : null,
  ].filter(Boolean).join(" ");

  await sendBookingMessage(next.customer_phone, smsBody, biz?.whatsapp_enabled ?? false);
}
