import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/waitlist/cancel/[token] — Return entry details for the cancel page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: entry } = await supabaseAdmin
    .from("waitlist")
    .select("id, business_id, customer_name, requested_date, requested_time, status")
    .eq("cancellation_token", token)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("name, logo_url")
    .eq("id", entry.business_id)
    .single();

  return NextResponse.json({
    entry: {
      status:         entry.status,
      requested_date: entry.requested_date,
      requested_time: entry.requested_time,
      customer_name:  entry.customer_name,
    },
    business: { name: business?.name, logo_url: business?.logo_url },
  });
}

// POST /api/waitlist/cancel/[token] — Cancel the waitlist entry and reorder positions
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: entry } = await supabaseAdmin
    .from("waitlist")
    .select("id, business_id, requested_date, requested_time, staff_id, position, status")
    .eq("cancellation_token", token)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (entry.status === "cancelled") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  }

  if (entry.status === "confirmed") {
    return NextResponse.json({ error: "Booking already confirmed — cancel via booking link instead" }, { status: 400 });
  }

  // Mark entry as cancelled
  await supabaseAdmin
    .from("waitlist")
    .update({ status: "cancelled" })
    .eq("id", entry.id);

  // Decrement position for everyone below this entry in the same slot
  // We fetch them and update in a loop (Supabase doesn't support arithmetic updates via REST)
  const { data: below } = await supabaseAdmin
    .from("waitlist")
    .select("id, position")
    .eq("business_id", entry.business_id)
    .eq("requested_date", entry.requested_date)
    .eq("requested_time", entry.requested_time)
    .gt("position", entry.position)
    .not("status", "in", '("cancelled","confirmed","expired")');

  if (below && below.length > 0) {
    for (const row of below) {
      await supabaseAdmin
        .from("waitlist")
        .update({ position: row.position - 1 })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ success: true });
}
