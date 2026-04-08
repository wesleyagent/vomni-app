import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { db } from "@/lib/db";

// GET /api/dashboard/waitlist?date=YYYY-MM-DD
// Returns all waitlist entries for the authenticated business on a given date.
export async function GET(req: NextRequest) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Get business for this user
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data: entries, error } = await supabaseAdmin
    .from("waitlist")
    .select(`
      id,
      requested_date,
      requested_time,
      customer_name,
      customer_phone,
      position,
      status,
      notified_at,
      expires_at,
      created_at,
      service_id,
      staff_id,
      cancellation_token
    `)
    .eq("business_id", business.id)
    .eq("requested_date", date)
    .order("requested_time", { ascending: true })
    .order("position", { ascending: true });

  if (error) {
    console.error("[dashboard/waitlist] query error:", error.message);
    return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }

  // Enrich with service and staff names
  const serviceIds = [...new Set((entries ?? []).map(e => e.service_id).filter(Boolean))];
  const staffIds   = [...new Set((entries ?? []).map(e => e.staff_id).filter(Boolean))];

  const [services, staffList] = await Promise.all([
    serviceIds.length > 0
      ? supabaseAdmin.from("services").select("id, name").in("id", serviceIds as string[])
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? supabaseAdmin.from("staff").select("id, name").in("id", staffIds as string[])
      : Promise.resolve({ data: [] }),
  ]);

  const serviceMap = Object.fromEntries((services.data ?? []).map(s => [s.id, s.name]));
  const staffMap   = Object.fromEntries((staffList.data ?? []).map(s => [s.id, s.name]));

  const enriched = (entries ?? []).map(e => ({
    ...e,
    service_name: e.service_id ? (serviceMap[e.service_id] ?? null) : null,
    staff_name:   e.staff_id   ? (staffMap[e.staff_id]   ?? null) : null,
  }));

  return NextResponse.json({ entries: enriched });
}

// DELETE /api/dashboard/waitlist?id=UUID
// Business-side cancel of a waitlist entry (with position reorder).
export async function DELETE(req: NextRequest) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data: entry } = await supabaseAdmin
    .from("waitlist")
    .select("id, business_id, requested_date, requested_time, position, status")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await supabaseAdmin.from("waitlist").update({ status: "cancelled" }).eq("id", id);

  // Reorder positions for entries below this one in the same slot
  const { data: below } = await supabaseAdmin
    .from("waitlist")
    .select("id, position")
    .eq("business_id", business.id)
    .eq("requested_date", entry.requested_date)
    .eq("requested_time", entry.requested_time)
    .gt("position", entry.position)
    .not("status", "in", '("cancelled","confirmed","expired")');

  if (below && below.length > 0) {
    for (const row of below) {
      await supabaseAdmin.from("waitlist").update({ position: row.position - 1 }).eq("id", row.id);
    }
  }

  return NextResponse.json({ success: true });
}
