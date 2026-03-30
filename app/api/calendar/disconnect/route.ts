import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// DELETE /api/calendar/disconnect?connection_id=XXX&business_id=XXX
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const connectionId = searchParams.get("connection_id");
  const businessId   = searchParams.get("business_id");

  if (!connectionId || !businessId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("business_id", businessId); // Ownership check

  if (error) return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  return NextResponse.json({ success: true });
}
