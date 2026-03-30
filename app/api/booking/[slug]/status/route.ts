import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/require-auth";

// PATCH /api/booking/[slug]/status — Update booking status (dashboard use only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  await params; // slug not used — we use booking_id in body

  let body: { booking_id: string; status: string; internal_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { booking_id, status, internal_notes } = body;
  const allowed = ["confirmed", "completed", "no_show", "cancelled"];
  if (!booking_id || !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid booking_id or status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (internal_notes !== undefined) updates.internal_notes = internal_notes;

  // No-show: suppress review SMS
  if (status === "no_show") {
    updates.sms_status = "cancelled";
  }

  // Cancelled from dashboard: suppress review SMS
  if (status === "cancelled") {
    updates.sms_status = "cancelled";
    updates.cancelled_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", booking_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("booking_audit_log").insert({
    booking_id,
    action: status,
    actor: "business",
    details: { internal_notes },
  });

  return NextResponse.json({ success: true });
}
