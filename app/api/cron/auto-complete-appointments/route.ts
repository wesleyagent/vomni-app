import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/cron/auto-complete-appointments
// Runs nightly at 11pm. Auto-marks confirmed/pending appointments as completed
// if their appointment time was more than 30 minutes ago.
// Free-tier workaround: runs once daily. When upgraded to Vercel Pro, switch to hourly.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Only auto-complete if appointment was at least 30 mins ago (buffer for running late)
  const cutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .in("status", ["confirmed", "pending"])
    .lt("appointment_at", cutoff);

  if (error) {
    console.error("[auto-complete] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ completed: 0 });
  }

  const ids = bookings.map(b => b.id);

  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ status: "completed" })
    .in("id", ids);

  if (updateError) {
    console.error("[auto-complete] update error:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("booking_audit_log").insert(
    ids.map(id => ({
      booking_id: id,
      action: "completed",
      actor: "system",
      details: { reason: "auto_complete_cron" },
    }))
  );

  console.log(`[auto-complete] marked ${ids.length} appointments as completed`);
  return NextResponse.json({ completed: ids.length });
}
