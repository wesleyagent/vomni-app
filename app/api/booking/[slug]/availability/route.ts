import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeAvailableSlots } from "@/lib/booking-utils";
import { getAccessTokenForBusiness, getGoogleBusyTimes } from "@/lib/google-calendar";
import { getUnifiedBusyTimes } from "@/lib/calendar-providers";
import type { BusinessHours, StaffHours } from "@/types/booking";

// GET /api/booking/[slug]/availability?date=YYYY-MM-DD&service_id=X&staff_id=X
// GET /api/booking/[slug]/availability?find=next_today&service_id=X  — next slot today
// GET /api/booking/[slug]/availability?find=next_week&service_id=X   — first slot this week
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date");
  const serviceId = searchParams.get("service_id");
  const staffId = searchParams.get("staff_id") ?? null; // "any" or UUID
  const find = searchParams.get("find"); // "next_today" | "next_week"

  if (!serviceId) {
    return NextResponse.json({ error: "service_id is required" }, { status: 400 });
  }
  if (!find && !date) {
    return NextResponse.json({ error: "date or find param required" }, { status: 400 });
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Fetch business
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, booking_buffer_minutes, booking_advance_days, booking_timezone, booking_enabled")
    .eq("booking_slug", slug)
    .single();

  if (!business || !business.booking_enabled) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const timezone = business.booking_timezone ?? "Asia/Jerusalem";
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const maxDate = new Date(todayStr);
  maxDate.setDate(maxDate.getDate() + (business.booking_advance_days ?? 30));
  const maxDateStr = maxDate.toISOString().substring(0, 10);
  const bufferMinutes = business.booking_buffer_minutes ?? 0;

  // Fetch service
  const { data: service } = await supabaseAdmin
    .from("services")
    .select("id, duration_minutes")
    .eq("id", serviceId)
    .eq("business_id", business.id)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Fetch business hours
  const { data: bizHoursRaw } = await supabaseAdmin
    .from("business_hours")
    .select("*")
    .eq("business_id", business.id);
  const bizHours = (bizHoursRaw ?? []) as BusinessHours[];

  // Get Google Calendar access token — checks calendar_connections first, falls back to legacy
  const gcalToken = await getAccessTokenForBusiness(business.id);

  // ── Smart shortcuts ────────────────────────────────────────────────────────
  if (find === "next_today" || find === "next_week") {
    const days = find === "next_today" ? 1 : 7;
    for (let i = 0; i < days; i++) {
      const candidate = new Date(Date.now() + i * 86400000)
        .toLocaleDateString("en-CA", { timeZone: timezone });
      if (candidate > maxDateStr) break;

      const slots = await getSlotsForDate(
        candidate, business.id, serviceId, staffId,
        service.duration_minutes, bizHours, bufferMinutes, timezone, gcalToken
      );

      if (slots.length > 0) {
        return NextResponse.json({
          date: candidate,
          slots: slots.map(t => ({ time: t, available: true })),
          next_available: true,
        });
      }
    }
    return NextResponse.json({ date: null, slots: [], next_available: false });
  }

  // ── Standard date query ────────────────────────────────────────────────────
  if (date! < todayStr || date! > maxDateStr) {
    return NextResponse.json({ slots: [] });
  }

  const slots = await getSlotsForDate(
    date!, business.id, serviceId, staffId,
    service.duration_minutes, bizHours, bufferMinutes, timezone, gcalToken
  );

  return NextResponse.json({ slots: slots.map(t => ({ time: t, available: true })) });
}

async function getSlotsForDate(
  date: string,
  businessId: string,
  serviceId: string,
  staffId: string | null,
  durationMinutes: number,
  bizHours: BusinessHours[],
  bufferMinutes: number,
  timezone: string,
  gcalToken: string | null = null,
): Promise<string[]> {
  // Fetch busy times from ALL connected calendars (legacy Google + multi-provider)
  const [gcalBusy, unifiedBusy] = await Promise.all([
    gcalToken ? getGoogleBusyTimes(gcalToken, date, timezone, businessId) : [],
    getUnifiedBusyTimes(businessId, staffId === "any" ? null : staffId, date, timezone),
  ]);

  // Convert to the same format as blocked_times
  const gcalBlocked = [...gcalBusy, ...unifiedBusy].map(b => ({ start_at: b.start, end_at: b.end }));

  if (!staffId || staffId === "any") {
    const { data: staffServicesRaw } = await supabaseAdmin
      .from("staff_services")
      .select("staff_id")
      .eq("service_id", serviceId);
    const eligibleStaffIds = (staffServicesRaw ?? []).map(ss => ss.staff_id);

    if (eligibleStaffIds.length === 0) {
      // Solo business — use business hours only
      const dbBlocked = await getBlockedTimes(businessId, date, null);
      const slots = computeAvailableSlots(
        date, durationMinutes, bufferMinutes,
        bizHours, [], await getBookingsForDate(businessId, date, null),
        [...dbBlocked, ...gcalBlocked], timezone
      );
      return slots;
    }

    const allSlots = new Set<string>();
    for (const sid of eligibleStaffIds) {
      const { data: shRaw } = await supabaseAdmin
        .from("staff_hours").select("*").eq("staff_id", sid);
      const staffHours = (shRaw ?? []) as StaffHours[];

      const bookings = await getBookingsForDate(businessId, date, sid);
      const dbBlocked = await getBlockedTimes(businessId, date, sid);

      computeAvailableSlots(
        date, durationMinutes, bufferMinutes,
        bizHours, staffHours, bookings, [...dbBlocked, ...gcalBlocked], timezone
      ).forEach(s => allSlots.add(s));
    }

    return Array.from(allSlots).sort();
  }

  // Specific staff
  const { data: shRaw } = await supabaseAdmin
    .from("staff_hours").select("*").eq("staff_id", staffId);
  const staffHours = (shRaw ?? []) as StaffHours[];

  const bookings = await getBookingsForDate(businessId, date, staffId);
  const dbBlocked = await getBlockedTimes(businessId, date, staffId);

  return computeAvailableSlots(
    date, durationMinutes, bufferMinutes,
    bizHours, staffHours, bookings, [...dbBlocked, ...gcalBlocked], timezone
  );
}

async function getBookingsForDate(businessId: string, date: string, staffId: string | null) {
  let query = supabaseAdmin
    .from("bookings")
    .select("appointment_at, service_duration_minutes")
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .gte("appointment_at", `${date}T00:00:00`)
    .lte("appointment_at", `${date}T23:59:59`);

  if (staffId) query = query.eq("staff_id", staffId);

  const { data } = await query;
  return (data ?? []) as { appointment_at: string; service_duration_minutes: number | null }[];
}

async function getBlockedTimes(businessId: string, date: string, staffId: string | null) {
  let query = supabaseAdmin
    .from("blocked_times")
    .select("start_at, end_at")
    .lte("start_at", `${date}T23:59:59`)
    .gte("end_at", `${date}T00:00:00`);

  if (staffId) {
    query = query.or(`staff_id.eq.${staffId},and(staff_id.is.null,business_id.eq.${businessId})`);
  } else {
    query = query.eq("business_id", businessId);
  }

  const { data } = await query;
  return (data ?? []) as { start_at: string; end_at: string }[];
}
