import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// DELETE /api/google-calendar/disconnect?business_id=XXX
// Clears stored calendar tokens and marks the business as disconnected.
export async function DELETE(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");

  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update({
      calendar_token:          null,
      google_calendar_connected: false,
    })
    .eq("id", businessId);

  if (error) {
    console.error("[gcal/disconnect] DB error:", error.message);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
