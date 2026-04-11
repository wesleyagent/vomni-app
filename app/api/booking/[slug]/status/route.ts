import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/require-auth";
import { sendBookingMessage } from "@/lib/twilio";
import { upsertSingleCustomerProfile } from "@/lib/customer-profile-sync";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// PATCH /api/booking/[slug]/status — Update booking status (dashboard use only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  await params; // slug not used — we use booking_id in body

  let body: { booking_id: string; status: string; internal_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { booking_id, status, internal_notes } = body;
  const allowed = ["confirmed", "completed", "no_show", "cancelled"];
  if (!booking_id || !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid booking_id or status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (internal_notes !== undefined) updates.internal_notes = internal_notes;

  // No-show: suppress review SMS
  if (status === "no_show") {
    updates.sms_status = "cancelled";
  }

  // Cancelled from dashboard: suppress review SMS
  if (status === "cancelled") {
    updates.sms_status = "cancelled";
    updates.cancelled_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", booking_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("booking_audit_log").insert({
    booking_id,
    action: status,
    actor: "business",
    details: { internal_notes },
  });

  // Completed: upsert customer profile immediately so dashboard CRM is up to date (non-blocking)
  if (status === "completed") {
    void upsertSingleCustomerProfile(booking_id);
  }

  // Trigger 4: no_show notification (non-blocking)
  if (status === "no_show") {
    try {
      const { data: bk } = await supabaseAdmin
        .from("bookings")
        .select("customer_name, appointment_at, business_id")
        .eq("id", booking_id)
        .maybeSingle();
      if (bk?.business_id) {
        const name = bk.customer_name ?? "A customer";
        const timeStr = bk.appointment_at?.split("T")[1]?.slice(0, 5) ?? "their";
        const notifBody = `${name} did not show up for their ${timeStr} appointment.`;
        const { data: existingNotif } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("business_id", bk.business_id)
          .eq("type", "no_show")
          .ilike("body", `${name}%`)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();
        if (!existingNotif) {
          void supabaseAdmin.from("notifications").insert({
            business_id: bk.business_id,
            type: "no_show",
            title: "No-show recorded",
            body: notifBody,
            read: false,
          });
        }
      }
    } catch (e) {
      console.error("[booking/status] no_show notification failed:", e);
    }
  }

  // Cancelled by business — notify customer via SMS (non-blocking)
  if (status === "cancelled") {
    try {
      const { data: bk } = await supabaseAdmin
        .from("bookings")
        .select("customer_name, customer_phone, service_name, appointment_at, business_id, cancellation_token, businesses(name, booking_slug)")
        .eq("id", booking_id)
        .maybeSingle();

      if (bk?.customer_phone) {
        const bizData   = bk.businesses as unknown as { name: string | null; booking_slug: string | null } | null;
        const bizName   = bizData?.name ?? "us";
        const firstName = bk.customer_name?.split(" ")[0] ?? "there";
        const date      = bk.appointment_at?.substring(0, 10) ?? "";
        const time      = bk.appointment_at?.substring(11, 16) ?? "";
        const rebookUrl = bizData?.booking_slug ? `${APP_URL}/book/${bizData.booking_slug}` : null;
        const rebookLine = rebookUrl ? ` Book again: ${rebookUrl}` : "";
        const smsBody   = `Hi ${firstName}, your ${bk.service_name ?? "appointment"} at ${bizName} on ${date} at ${time} has been cancelled.${rebookLine}`;
        void sendBookingMessage(bk.customer_phone, smsBody, false, { businessId: bk.business_id, bookingId: booking_id, messageType: "business_cancellation" });
      }
    } catch (e) {
      console.error("[booking/status] cancellation SMS failed:", e);
    }
  }

  return NextResponse.json({ success: true });
}
