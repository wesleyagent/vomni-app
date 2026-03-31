import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH /api/business-settings
// Body: { business_id: string, [field]: value, ... }
// Uses supabaseAdmin to bypass RLS for dashboard writes.
// Only allows a safe whitelist of booking-related fields.

const ALLOWED_FIELDS = new Set([
  "booking_slug",
  "booking_enabled",
  "booking_buffer_minutes",
  "booking_advance_days",
  "booking_cancellation_hours",
  "booking_confirmation_message",
  "booking_confirmation_message_he",
  "booking_timezone",
  "require_phone",
  "require_email",
  "whatsapp_enabled",
  "google_maps_url",
  "instagram_handle",
  "calendar_token",
]);

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, ...rest } = body;
  if (!business_id || typeof business_id !== "string") {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  // Filter to only allowed fields
  const patch: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(rest)) {
    if (ALLOWED_FIELDS.has(key)) {
      patch[key] = val;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // If setting booking_slug, verify it isn't already taken by another business
  if (patch.booking_slug && typeof patch.booking_slug === "string") {
    const { data: existing } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("booking_slug", patch.booking_slug)
      .neq("id", business_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update(patch)
    .eq("id", business_id);

  if (error) {
    console.error("[business-settings] update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
