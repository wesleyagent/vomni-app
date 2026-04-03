import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";

// POST /api/blocked-times — create a blocked time slot
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

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

  const ownership = await requireBusinessOwnership(auth.email, business_id as string, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Look up blocked time to verify ownership
  const { data: blocked } = await supabaseAdmin
    .from("blocked_times")
    .select("business_id")
    .eq("id", id)
    .single();

  if (!blocked) {
    return NextResponse.json({ error: "Blocked time not found" }, { status: 404 });
  }

  const ownership = await requireBusinessOwnership(auth.email, blocked.business_id, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

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
