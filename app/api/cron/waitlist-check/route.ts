import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

/**
 * GET /api/cron/waitlist-check
 *
 * Runs every 5 minutes. For each notified waitlist entry whose 15-minute
 * confirmation window has expired:
 *  1. Mark it as 'expired'
 *  2. Find the next 'waiting' entry in the same slot (ordered by position)
 *  3. Notify them via SMS and start a new 15-minute window
 *
 * If no one else is waiting, the slot reopens as available automatically
 * (no action needed — the bookings table is the source of truth).
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Find all notified entries whose window has expired
  const { data: expired, error } = await supabaseAdmin
    .from("waitlist")
    .select("id, business_id, requested_date, requested_time, staff_id, customer_name, customer_phone, position")
    .eq("status", "notified")
    .lt("expires_at", now);

  if (error) {
    console.error("[cron/waitlist-check] query error:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ expired: 0, notified: 0 });
  }

  let expiredCount = 0;
  let notifiedCount = 0;
  const errors: string[] = [];

  for (const entry of expired) {
    try {
      // Mark as expired
      await supabaseAdmin
        .from("waitlist")
        .update({ status: "expired" })
        .eq("id", entry.id);
      expiredCount++;

      // Find next waiting person for the same slot
      let nextQuery = supabaseAdmin
        .from("waitlist")
        .select("id, customer_name, customer_phone, confirmation_token, cancellation_token")
        .eq("business_id", entry.business_id)
        .eq("requested_date", entry.requested_date)
        .eq("requested_time", entry.requested_time)
        .eq("status", "waiting")
        .order("position", { ascending: true })
        .limit(1);

      if (entry.staff_id) {
        nextQuery = nextQuery.eq("staff_id", entry.staff_id);
      }

      const { data: next } = await nextQuery.maybeSingle();

      if (!next) continue; // No one left — slot reopens naturally

      // Fetch business info
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("name, whatsapp_enabled")
        .eq("id", entry.business_id)
        .single();

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Update next entry to notified
      await supabaseAdmin
        .from("waitlist")
        .update({
          status:      "notified",
          notified_at: new Date().toISOString(),
          expires_at:  expiresAt,
        })
        .eq("id", next.id);

      const firstName = next.customer_name?.split(" ")[0] ?? "there";
      const confirmUrl = `${APP_URL}/waitlist/confirm/${next.confirmation_token}`;
      const cancelUrl  = `${APP_URL}/waitlist/cancel/${next.cancellation_token}`;

      const smsBody = [
        `Hi ${firstName}, a slot opened at ${biz?.name ?? "us"} on ${entry.requested_date} at ${entry.requested_time}.`,
        `Confirm here: ${confirmUrl}`,
        `You have 15 minutes.`,
        `Remove me: ${cancelUrl}`,
      ].join(" ");

      await sendBookingMessage(next.customer_phone, smsBody, biz?.whatsapp_enabled ?? false);
      notifiedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/waitlist-check] error for entry ${entry.id}:`, msg);
      errors.push(`${entry.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    expired: expiredCount,
    notified: notifiedCount,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
