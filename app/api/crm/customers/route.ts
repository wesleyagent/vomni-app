/**
 * GET /api/crm/customers
 * Returns CRM customer list + stat cards for the CRM tab.
 *
 * Query params:
 *   business_id  — required
 *   filter       — all | active | at_risk | lapsed | opted_out | imported
 *   page         — 1-based (default 1)
 *   per_page     — default 20
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";

export const runtime = "nodejs";

const NOW_MINUS_28  = () => new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
const NOW_MINUS_42  = () => new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
const NOW_MINUS_14  = () => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const businessId = searchParams.get("business_id");
  const filter     = searchParams.get("filter") ?? "all";
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const perPage    = Math.min(50, Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10)));

  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, businessId, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  // ── Stat cards (always computed across all customers) ────────────────────
  const [totalRes, activeRes, atRiskRes, lapsedRes] = await Promise.all([
    supabaseAdmin
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabaseAdmin
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("opted_out", false)
      .gte("last_visit_at", NOW_MINUS_28()),
    supabaseAdmin
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("opted_out", false)
      .lt("last_visit_at", NOW_MINUS_28())
      .gte("last_visit_at", NOW_MINUS_42()),
    supabaseAdmin
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("opted_out", false)
      .lt("last_visit_at", NOW_MINUS_42()),
  ]);

  const stats = {
    total:   totalRes.count  ?? 0,
    active:  activeRes.count ?? 0,
    at_risk: atRiskRes.count ?? 0,
    lapsed:  lapsedRes.count ?? 0,
  };

  // ── Customer list query ──────────────────────────────────────────────────
  // marketing_consent was added in migration 022 — omit it from the SELECT
  // so the query works even if that migration hasn't been applied yet.
  // We default to false in the assembled response below.
  let query = supabaseAdmin
    .from("customer_profiles")
    .select(`
      id,
      name,
      phone_display,
      phone,
      source,
      last_visit_at,
      total_visits,
      opted_out,
      opted_out_at,
      nudge_sent_at,
      notes,
      created_at
    `)
    .eq("business_id", businessId);

  // Apply filter
  if (filter === "active") {
    query = query.eq("opted_out", false).gte("last_visit_at", NOW_MINUS_28());
  } else if (filter === "at_risk") {
    query = query.eq("opted_out", false).lt("last_visit_at", NOW_MINUS_28()).gte("last_visit_at", NOW_MINUS_42());
  } else if (filter === "lapsed") {
    query = query.eq("opted_out", false).lt("last_visit_at", NOW_MINUS_42());
  } else if (filter === "opted_out") {
    query = query.eq("opted_out", true);
  } else if (filter === "imported") {
    query = query.eq("source", "import");
  }

  const offset = (page - 1) * perPage;
  query = query.order("last_visit_at", { ascending: false, nullsFirst: false }).range(offset, offset + perPage - 1);

  const { data: profiles, error: profilesErr } = await query;

  if (profilesErr) {
    console.error("[crm/customers] profiles query error:", profilesErr.message);
    return NextResponse.json({ error: "Database error", detail: profilesErr.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ stats, customers: [], page, per_page: perPage });
  }

  const profileIds = profiles.map(p => p.id);
  // Use phone column (E.164) for joining if available, fall back to phone_display
  const phoneValues = profiles.map(p => p.phone ?? p.phone_display).filter(Boolean);

  // ── Next upcoming appointments ───────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const { data: upcomingBookings } = await supabaseAdmin
    .from("bookings")
    .select("customer_phone, phone_display, appointment_at, service_name")
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .gte("appointment_at", nowIso)
    .in("customer_phone", phoneValues.length > 0 ? phoneValues : ["__none__"])
    .order("appointment_at", { ascending: true });

  // Map phone → next appointment
  const nextApptByPhone = new Map<string, { appointment_at: string; service_name: string | null }>();
  for (const b of upcomingBookings ?? []) {
    const key = b.customer_phone ?? b.phone_display;
    if (key && !nextApptByPhone.has(key)) {
      nextApptByPhone.set(key, { appointment_at: b.appointment_at, service_name: b.service_name });
    }
  }

  // ── Last service name (from most recent completed booking) ───────────────
  const { data: lastBookings } = await supabaseAdmin
    .from("bookings")
    .select("customer_phone, phone_display, appointment_at, service_name")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .in("customer_phone", phoneValues.length > 0 ? phoneValues : ["__none__"])
    .order("appointment_at", { ascending: false });

  const lastServiceByPhone = new Map<string, string>();
  for (const b of lastBookings ?? []) {
    const key = b.customer_phone ?? b.phone_display;
    if (key && !lastServiceByPhone.has(key) && b.service_name) {
      lastServiceByPhone.set(key, b.service_name);
    }
  }

  // ── Most recent outreach (nudge or review request) ───────────────────────
  const { data: recentNudges } = await supabaseAdmin
    .from("crm_nudges")
    .select("customer_phone, nudge_type, sent_at")
    .eq("business_id", businessId)
    .in("customer_phone", phoneValues.length > 0 ? phoneValues : ["__none__"])
    .order("sent_at", { ascending: false });

  const lastNudgeByPhone = new Map<string, { type: string; sent_at: string }>();
  for (const n of recentNudges ?? []) {
    if (!lastNudgeByPhone.has(n.customer_phone)) {
      lastNudgeByPhone.set(n.customer_phone, { type: n.nudge_type, sent_at: n.sent_at });
    }
  }

  // ── Assemble customer rows ───────────────────────────────────────────────
  const now28 = new Date(NOW_MINUS_28());
  const now42 = new Date(NOW_MINUS_42());
  const now14 = new Date(NOW_MINUS_14());

  const customers = profiles.map(p => {
    const phoneKey = p.phone ?? p.phone_display;

    // Status
    let status: "active" | "at_risk" | "lapsed" | "opted_out" = "lapsed";
    if (p.opted_out) {
      status = "opted_out";
    } else if (p.last_visit_at) {
      const lv = new Date(p.last_visit_at);
      if (lv >= now28)       status = "active";
      else if (lv >= now42)  status = "at_risk";
      else                   status = "lapsed";
    }

    // Name: first name + last initial
    const nameParts  = (p.name ?? "").trim().split(/\s+/);
    const firstName  = nameParts[0] ?? "";
    const lastInitial = nameParts.length > 1 ? `${nameParts[nameParts.length - 1][0]}.` : "";
    const displayName = lastInitial ? `${firstName} ${lastInitial}` : firstName;

    // Next appointment
    const nextAppt = phoneKey ? nextApptByPhone.get(phoneKey) : undefined;

    // Last outreach
    const nudge = phoneKey ? lastNudgeByPhone.get(phoneKey) : undefined;

    // Nudged recently (within 14 days)
    const nudgedRecently = nudge ? new Date(nudge.sent_at) >= now14 : false;

    return {
      id:             p.id,
      display_name:   displayName,
      phone_display:  p.phone_display ?? p.phone?.slice(-3) ?? "***",
      source:         p.source ?? "booking",
      last_visit_at:  p.last_visit_at ?? null,
      last_service:   (phoneKey ? lastServiceByPhone.get(phoneKey) : null) ?? null,
      total_visits:   p.total_visits ?? 0,
      status,
      next_appointment: nextAppt ?? null,
      last_outreach:  nudge ?? null,
      nudged_recently: nudgedRecently,
      opted_out:         p.opted_out ?? false,
      opted_out_at:      p.opted_out_at ?? null,
      marketing_consent: (p as typeof p & { marketing_consent?: boolean }).marketing_consent ?? false,
      notes:             p.notes ?? null,
      created_at:     p.created_at,
    };
  });

  return NextResponse.json({ stats, customers, page, per_page: perPage });
}

// ── PATCH /api/crm/customers — update notes ──────────────────────────────────

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { business_id: string; profile_id: string; notes: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, profile_id, notes } = body;
  if (!business_id || !profile_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, business_id, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  const { error } = await supabaseAdmin
    .from("customer_profiles")
    .update({ notes: notes?.trim().slice(0, 2000) ?? null })
    .eq("id", profile_id)
    .eq("business_id", business_id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
