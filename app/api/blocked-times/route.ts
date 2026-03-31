import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/blocked-times — create a blocked time slot
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, label, start_time, end_time, is_recurring, day_of_week, date } = body;
  if (!business_id || !start_time || !end_time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("blocked_times")
    .insert({ business_id, label: label ?? null, start_time, end_time, is_recurring: is_recurring ?? false, day_of_week: day_of_week ?? null, date: date ?? null })
    .select("id")
    .single();

  if (error) {
    console.error("[blocked-times POST] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// DELETE /api/blocked-times?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("blocked_times")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[blocked-times DELETE] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
