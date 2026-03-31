import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface HourPayload {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

// POST /api/business-hours
// Body: { business_id: string, hours: HourPayload[] }
// Uses supabaseAdmin to bypass RLS for dashboard writes.
export async function POST(req: NextRequest) {
  let body: { business_id: string; hours: HourPayload[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, hours } = body;
  if (!business_id || !Array.isArray(hours)) {
    return NextResponse.json({ error: "Missing business_id or hours" }, { status: 400 });
  }

  // Verify business exists
  const { data: biz, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("id", business_id)
    .single();

  if (bizErr || !biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Delete existing hours then insert new ones
  const { error: delErr } = await supabaseAdmin
    .from("business_hours")
    .delete()
    .eq("business_id", business_id);

  if (delErr) {
    console.error("[business-hours] delete error:", delErr.message);
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const rows = hours.map(h => ({
    business_id,
    day_of_week: h.day_of_week,
    is_open: h.is_open,
    open_time: h.open_time,
    close_time: h.close_time,
  }));

  const { error: insErr } = await supabaseAdmin
    .from("business_hours")
    .insert(rows);

  if (insErr) {
    console.error("[business-hours] insert error:", insErr.message);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
