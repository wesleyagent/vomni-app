/**
 * Generic service-role Supabase proxy.
 * All admin panel pages that need to bypass RLS use this route.
 *
 * GET    /api/admin/db/[table]?select=*&order=created_at.desc&limit=100&status=new
 * POST   /api/admin/db/[table]          body: row object
 * PATCH  /api/admin/db/[table]?id=uuid  body: fields to update
 * DELETE /api/admin/db/[table]?id=uuid
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CONTROL_PARAMS = new Set(["select", "order", "limit"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const sp = req.nextUrl.searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin.from(table).select(sp.get("select") ?? "*");

  // ORDER
  const order = sp.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    query = query.order(col, { ascending: dir !== "desc" });
  }

  // LIMIT
  const limit = sp.get("limit");
  if (limit) query = query.limit(parseInt(limit, 10));

  // FILTERS - every non-control param is treated as eq filter
  for (const [key, value] of sp.entries()) {
    if (!CONTROL_PARAMS.has(key)) query = query.eq(key, value);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from(table)
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
