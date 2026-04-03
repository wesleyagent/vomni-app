import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { sendAppointmentReminder } from "@/lib/whatsapp";

// GET /api/cron/appointment-reminders
// Runs hourly via Vercel cron. Finds bookings 23-25h away and sends reminder email.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Window: appointments between 23 and 25 hours from now
  const min = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const max = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_email, customer_phone, appointment_at, service_name, staff_id, business_id, cancellation_token, whatsapp_opt_in")
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("appointment_at", min.toISOString())
    .lte("appointment_at", max.toISOString());

  if (error) {
    console.error("[cron/appointment-reminders] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    // Get business info
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("name, booking_slug, notification_email, owner_email")
      .eq("id", booking.business_id)
      .single();

    // Get staff name
    let staffName = "";
    if (booking.staff_id) {
      const { data: staff } = await supabaseAdmin
        .from("staff").select("name").eq("id", booking.staff_id).single();
      staffName = staff?.name ?? "";
    }

    const time = booking.appointment_at?.substring(11, 16) ?? "";
    const bizName = biz?.name ?? "your appointment";
    const serviceName = booking.service_name ?? "appointment";
    const firstName = booking.customer_name?.split(" ")[0] ?? booking.customer_name ?? "there";
    const cancelUrl = booking.cancellation_token
      ? `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${booking.cancellation_token}`
      : null;

    // Send WhatsApp reminder if opted in
    const waBooking = booking as typeof booking & { whatsapp_opt_in?: boolean };
    if (waBooking.whatsapp_opt_in !== false && biz) {
      try {
        await sendAppointmentReminder(
          { id: booking.id, business_id: booking.business_id, customer_name: booking.customer_name, customer_phone: booking.customer_phone ?? "", appointment_at: booking.appointment_at ?? "", whatsapp_opt_in: true },
          { id: booking.business_id, name: biz.name }
        );
      } catch (e) {
        console.error(`[cron/reminders] WhatsApp reminder failed for ${booking.id}:`, e);
      }
    }

    // Mark reminder_sent regardless of email presence to avoid retry loops
    if (!booking.customer_email) {
      await supabaseAdmin
        .from("bookings")
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
      errors.push(`${booking.id}: no customer email`);
      continue;
    }

    const staffLine = staffName ? ` with ${staffName}` : "";
    const cancelLine = cancelUrl ? ` Need to cancel? ${cancelUrl}` : "";

    const html = [
      `<p>Hi ${firstName},</p>`,
      `<p>Just a reminder that you have a <strong>${serviceName}</strong> appointment at <strong>${bizName}</strong> tomorrow at <strong>${time}</strong>${staffLine}.</p>`,
      cancelUrl ? `<p>Need to cancel? <a href="${cancelUrl}">${cancelUrl}</a></p>` : "",
    ].filter(Boolean).join("");

    try {
      await sendEmail({
        to: booking.customer_email,
        subject: `Appointment Reminder — ${serviceName} at ${bizName}`,
        type: "booking_reminder" as const,
        bookingId: booking.id,
        html,
      });

      await supabaseAdmin
        .from("bookings")
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${booking.id}: ${msg}`);
      // Still mark as sent to avoid retry loops (email failures are usually permanent)
      await supabaseAdmin
        .from("bookings")
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
    }
  }

  console.log(`[cron/appointment-reminders] processed=${processed} errors=${errors.length}`);
  return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined });
}
