import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/services — create a new service
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, name, name_he, duration_minutes, price, display_order, is_active, color } = body;
  if (!business_id || !name || !duration_minutes) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .insert({
      business_id,
      name,
      name_he: name_he ?? null,
      duration_minutes,
      price: price ?? null,
      display_order: display_order ?? 0,
      is_active: is_active ?? true,
      color: color ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[services POST] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// PATCH /api/services — update a service
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, ...patch } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("services")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error("[services PATCH] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/services?id=xxx — soft-delete (set is_active=false)
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("services")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("[services DELETE] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
