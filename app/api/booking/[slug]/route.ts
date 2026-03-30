import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/booking/[slug] — Public: fetch business details, services, staff, hours
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Fetch business by booking slug
  const { data: business, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("id, name, logo_url, booking_slug, booking_enabled, booking_buffer_minutes, booking_advance_days, booking_cancellation_hours, booking_confirmation_message, booking_confirmation_message_he, booking_currency, booking_timezone, require_phone, require_email")
    .eq("booking_slug", slug)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if (!business.booking_enabled) {
    return NextResponse.json({ error: "Booking is not enabled for this business" }, { status: 404 });
  }

  // Fetch active services
  const { data: services } = await supabaseAdmin
    .from("services")
    .select("id, name, name_he, description, description_he, duration_minutes, price, currency, display_order")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // Fetch active staff
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("id, name, name_he, avatar_url, bio, bio_he, display_order")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // Fetch staff-service mappings
  const staffIds = (staff ?? []).map(s => s.id);
  let staffServices: { staff_id: string; service_id: string }[] = [];
  if (staffIds.length > 0) {
    const { data: ss } = await supabaseAdmin
      .from("staff_services")
      .select("staff_id, service_id")
      .in("staff_id", staffIds);
    staffServices = ss ?? [];
  }

  // Fetch business hours
  const { data: hours } = await supabaseAdmin
    .from("business_hours")
    .select("day_of_week, is_open, open_time, close_time")
    .eq("business_id", business.id)
    .order("day_of_week", { ascending: true });

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      logo_url: business.logo_url,
      booking_buffer_minutes: business.booking_buffer_minutes ?? 0,
      booking_advance_days: business.booking_advance_days ?? 30,
      booking_cancellation_hours: business.booking_cancellation_hours ?? 24,
      booking_confirmation_message: business.booking_confirmation_message,
      booking_confirmation_message_he: business.booking_confirmation_message_he,
      booking_currency: business.booking_currency ?? "ILS",
      booking_timezone: business.booking_timezone ?? "Asia/Jerusalem",
      require_phone: business.require_phone ?? true,
      require_email: business.require_email ?? false,
    },
    services: services ?? [],
    staff: staff ?? [],
    staffServices,
    hours: hours ?? [],
  });
}
