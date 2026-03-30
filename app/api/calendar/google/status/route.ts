import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/calendar/google/status?business_id=xxx
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  const { data: conn } = await supabaseAdmin
    .from("calendar_connections")
    .select("is_active, calendar_id, created_at")
    .eq("business_id", businessId)
    .eq("provider", "google")
    .single();

  return NextResponse.json({
    connected: conn?.is_active ?? false,
    calendar_id: conn?.calendar_id ?? null,
    connected_at: conn?.created_at ?? null,
  });
}

// DELETE /api/calendar/google/status — disconnect
export async function DELETE(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  await supabaseAdmin.from("calendar_connections")
    .update({ is_active: false, access_token: "", refresh_token: null })
    .eq("business_id", businessId)
    .eq("provider", "google");

  return NextResponse.json({ success: true });
}
