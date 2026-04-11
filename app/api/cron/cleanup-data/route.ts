import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withCronMonitoring } from "@/lib/telegram";

async function handler(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey);
  const now   = new Date();

  // ── Rule 1 — Delete contact details from bookings 24h after SMS sent ────────
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: staleBookings } = await admin
    .from("bookings")
    .select("id")
    .eq("sms_status", "sent")
    .lt("sms_sent_at", cutoff24h)
    .not("customer_phone", "is", null);

  let bookingsCleaned = 0;

  if (staleBookings && staleBookings.length > 0) {
    const ids = staleBookings.map((b: { id: string }) => b.id);
    const { error } = await admin
      .from("bookings")
      .update({ customer_phone: null, customer_email: null })
      .in("id", ids);

    if (!error) bookingsCleaned = ids.length;
  }

  // ── Rule 2 — Delete feedback text after 90 days ──────────────────────────────
  const cutoff90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: oldFeedback } = await admin
    .from("feedback")
    .select("id")
    .lt("created_at", cutoff90d)
    .not("feedback_text", "is", null);

  let feedbackCleaned = 0;

  if (oldFeedback && oldFeedback.length > 0) {
    const ids = oldFeedback.map((f: { id: string }) => f.id);
    const { error } = await admin
      .from("feedback")
      .update({ feedback_text: null })
      .in("id", ids);

    if (!error) feedbackCleaned = ids.length;
  }

  // ── Rule 3 — Expire leads older than 180 days if not converted ───────────────
  const cutoff180d = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleLeads } = await admin
    .from("leads")
    .select("id")
    .in("status", ["new", "contacted"])
    .lt("created_at", cutoff180d)
    .not("email", "is", null);

  let leadsExpired = 0;

  if (staleLeads && staleLeads.length > 0) {
    const ids = staleLeads.map((l: { id: string }) => l.id);
    const { error } = await admin
      .from("leads")
      .update({
        email:            null,
        phone:            null,
        instagram_handle: null,
        status:           "expired",
      })
      .in("id", ids);

    if (!error) leadsExpired = ids.length;
  }

  // ── Log the run ──────────────────────────────────────────────────────────────
  await admin.from("cleanup_log").insert({
    run_at:           now.toISOString(),
    bookings_cleaned: bookingsCleaned,
    feedback_cleaned: feedbackCleaned,
    leads_expired:    leadsExpired,
  });

  return NextResponse.json({
    ok:               true,
    run_at:           now.toISOString(),
    bookings_cleaned: bookingsCleaned,
    feedback_cleaned: feedbackCleaned,
    leads_expired:    leadsExpired,
  });
}

export const GET = withCronMonitoring("cleanup-data", handler);
