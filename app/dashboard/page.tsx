"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useBusinessContext } from "./_context";
import { db } from "@/lib/db";
import { currencySymbol } from "@/lib/currencyUtils";

// ── Palette ──────────────────────────────────────────────────────────────────
const G       = "#1D9E75";
const TEXT    = "#1A1A1A";
const MUTED   = "#6B7280";
const DIVIDER = "#F0F0EE";
const SHADOW  = "0 1px 3px rgba(0,0,0,0.06)";

// ── Funnel status lists ───────────────────────────────────────────────────────
const RATED_STATUSES  = [
  "form_submitted", "redirected_to_google", "private_feedback",
  "private_feedback_from_positive", "reviewed_positive", "reviewed_negative", "redirected",
];
const OPENED_STATUSES = ["form_opened", ...RATED_STATUSES];

// ── Types ─────────────────────────────────────────────────────────────────────
interface NextAppt {
  customer_name:              string | null;
  service_name:               string | null;
  appointment_at:             string;
  reminder_sent:              boolean;
  reminder_sent_at:           string | null;
}

interface TodayBooking {
  id:                         string;
  customer_name:              string | null;
  service_name:               string | null;
  service_duration_minutes:   number | null;
  appointment_at:             string;
  status:                     string;
  reminder_sent:              boolean;
  reminder_sent_at:           string | null;
}

interface PrivateFeedback {
  id:            string;
  rating:        number | null;
  feedback_text: string | null;
  customer_name: string | null;
}

interface CrmProfile {
  id:                      string;
  name:                    string | null;
  is_lapsed:               boolean;
  nudge_sent_at:           string | null;
  avg_days_between_visits: number | null;
  last_visit_at:           string | null;
  nudge_count:             number;
  phone:                   string;
  profileState:            "lapsed" | "queued" | "booked" | "review" | "other";
}

interface DashData {
  nextAppt:            NextAppt | null;
  todayBookings:       TodayBooking[];
  statsToday:          number;
  statsWeek:           number;
  statsMonth:          number;
  monthRevenue:        number;
  reEngagementRevenue: number;
  privateFeedback:     PrivateFeedback[];
  funnelSent:          number;
  funnelOpened:        number;
  funnelRated:         number;
  funnelToGoogle:      number;
  funnelIntercepted:   number;
  profiles:            CrmProfile[];
  vomniReminders:      number;
  vomniReviewReqs:     number;
  vomniReEngagement:   number;
  vomniIntercepted:    number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function isoHHMM(iso: string): string {
  return iso.substring(11, 16);
}

function isoDateLabel(iso: string): string {
  const d = new Date(iso.substring(0, 10) + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

function reminderSendHHMM(appointmentAt: string): string {
  const t = new Date(appointmentAt).getTime() - 24 * 60 * 60 * 1000;
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

// ── Badge config ──────────────────────────────────────────────────────────────
const PROFILE_BADGE: Record<CrmProfile["profileState"], { bg: string; color: string; dot: string; label: string }> = {
  lapsed: { bg: "#FCEBEB", color: "#A32D2D", dot: "#EF4444",  label: "Lapsed"         },
  queued: { bg: "#FAEEDA", color: "#854F0B", dot: "#F59E0B",  label: "Queued"         },
  booked: { bg: "#E1F5EE", color: "#0F6E56", dot: G,          label: "Booked \u2713"  },
  review: { bg: "#EEEDFE", color: "#3C3489", dot: "#7C6FEF",  label: "Review left \u2713" },
  other:  { bg: "#F3F4F6", color: MUTED,     dot: "#9CA3AF",  label: ""               },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { businessId, businessName, currency } = useBusinessContext();
  const sym = currencySymbol(currency);
  const [data,    setData]    = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }

    const now        = new Date();
    const todayStr   = now.toISOString().substring(0, 10);
    const monthStart = startOfMonth();
    const weekStartD = new Date(now);
    weekStartD.setDate(now.getDate() - now.getDay());
    weekStartD.setHours(0, 0, 0, 0);
    const weekEndD   = new Date(weekStartD);
    weekEndD.setDate(weekStartD.getDate() + 6);
    weekEndD.setHours(23, 59, 59, 999);

    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12] =
      await Promise.all([
        // 1 — Next upcoming confirmed appointment
        db.from("bookings")
          .select("customer_name, service_name, appointment_at, reminder_sent, reminder_sent_at")
          .eq("business_id", businessId)
          .eq("status", "confirmed")
          .gt("appointment_at", now.toISOString())
          .order("appointment_at", { ascending: true })
          .limit(1),

        // 2 — Today's bookings
        db.from("bookings")
          .select("id, customer_name, service_name, service_duration_minutes, appointment_at, status, reminder_sent, reminder_sent_at")
          .eq("business_id", businessId)
          .gte("appointment_at", `${todayStr}T00:00:00`)
          .lte("appointment_at", `${todayStr}T23:59:59`)
          .order("appointment_at", { ascending: true }),

        // 3 — This-week confirmed count
        db.from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "confirmed")
          .gte("appointment_at", weekStartD.toISOString())
          .lte("appointment_at", weekEndD.toISOString()),

        // 4 — This-month bookings (count + revenue)
        db.from("bookings")
          .select("id, status, service_price")
          .eq("business_id", businessId)
          .gte("appointment_at", monthStart),

        // 5 — Private feedback ≤ 2
        db.from("feedback")
          .select("id, rating, feedback_text, bookings!booking_id(customer_name)")
          .eq("business_id", businessId)
          .lte("rating", 2)
          .order("created_at", { ascending: false })
          .limit(5),

        // 6 — This-month review funnel (only bookings where a request was actually sent)
        db.from("bookings")
          .select("id, review_status")
          .eq("business_id", businessId)
          .eq("review_request_sent", true)
          .gte("created_at", monthStart),

        // 7 — Customer profiles
        db.from("customer_profiles")
          .select("id, name, is_lapsed, nudge_sent_at, avg_days_between_visits, last_visit_at, nudge_count, phone, opted_out")
          .eq("business_id", businessId)
          .eq("opted_out", false)
          .order("last_visit_at", { ascending: false })
          .limit(20),

        // 8 — Converted CRM nudges this month
        db.from("crm_nudges")
          .select("customer_phone, converted_booking_id")
          .eq("business_id", businessId)
          .eq("converted", true)
          .not("converted_booking_id", "is", null)
          .gte("sent_at", monthStart),

        // 9 — WhatsApp reminders this month
        db.from("whatsapp_log")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("template_name", "appointment_reminder")
          .gte("created_at", monthStart),

        // 10 — WhatsApp review requests this month
        db.from("whatsapp_log")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("template_name", ["review_request", "review_request_manual"])
          .gte("created_at", monthStart),

        // 11 — WhatsApp re-engagement messages this month
        db.from("whatsapp_log")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("template_name", ["nudge_pattern", "nudge_lapsed"])
          .gte("created_at", monthStart),

        // 12 — Intercepted negatives this month
        db.from("feedback")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .lte("rating", 2)
          .gte("created_at", monthStart),
      ]);

    // Next appointment
    const nextAppt = ((r1.data ?? [])[0] ?? null) as NextAppt | null;

    // Today's bookings
    const todayBookings = (r2.data ?? []) as TodayBooking[];

    // Stats
    const statsToday = todayBookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
    const statsWeek  = r3.count ?? 0;
    const monthRows  = (r4.data ?? []) as { status: string; service_price: number | null }[];
    const confirmed  = monthRows.filter(b => b.status === "confirmed" || b.status === "completed");
    const statsMonth = confirmed.length;
    const monthRevenue = confirmed.reduce((s, b) => s + (b.service_price ?? 0), 0);

    // Private feedback
    const privateFeedback: PrivateFeedback[] = ((r5.data ?? []) as any[]).map(row => ({
      id:            row.id,
      rating:        row.rating,
      feedback_text: row.feedback_text,
      customer_name: Array.isArray(row.bookings)
        ? (row.bookings[0]?.customer_name ?? null)
        : ((row.bookings as any)?.customer_name ?? null),
    }));

    // Funnel
    const funnelRows     = (r6.data ?? []) as { review_status: string | null }[];
    const funnelSent     = funnelRows.length;
    const funnelOpened   = funnelRows.filter(b => OPENED_STATUSES.includes(b.review_status ?? "")).length;
    const funnelRated    = funnelRows.filter(b => RATED_STATUSES.includes(b.review_status ?? "")).length;
    const funnelToGoogle = funnelRows.filter(b =>
      b.review_status === "redirected_to_google" || b.review_status === "redirected"
    ).length;
    const funnelIntercepted = r12.count ?? 0;

    // Re-engagement revenue
    const convertedPhones     = new Set(((r8.data ?? []) as any[]).map((n: any) => n.customer_phone as string));
    const convertedBookingIds = ((r8.data ?? []) as any[]).map((n: any) => n.converted_booking_id as string).filter(Boolean);
    let reEngagementRevenue = 0;
    if (convertedBookingIds.length > 0) {
      const { data: convBkgs } = await db.from("bookings")
        .select("service_price, status")
        .in("id", convertedBookingIds)
        .in("status", ["confirmed", "completed"]);
      reEngagementRevenue = ((convBkgs ?? []) as any[]).reduce((s: number, b: any) => s + (b.service_price ?? 0), 0);
    }

    // Customer profiles with state
    const stateOrder: Record<CrmProfile["profileState"], number> = { lapsed: 0, queued: 1, booked: 2, review: 3, other: 4 };
    const rawProfiles: CrmProfile[] = ((r7.data ?? []) as any[]).map(p => {
      let profileState: CrmProfile["profileState"];
      if (p.is_lapsed)                    profileState = "lapsed";
      else if (convertedPhones.has(p.phone)) profileState = "booked";
      else if (p.nudge_sent_at)            profileState = "queued";
      else                                 profileState = "other";
      return { ...p, profileState };
    });
    rawProfiles.sort((a, b) => stateOrder[a.profileState] - stateOrder[b.profileState]);
    const profiles = rawProfiles.filter(p => p.profileState !== "other").slice(0, 4);

    setData({
      nextAppt, todayBookings, statsToday, statsWeek, statsMonth,
      monthRevenue, reEngagementRevenue, privateFeedback,
      funnelSent, funnelOpened, funnelRated, funnelToGoogle, funnelIntercepted,
      profiles,
      vomniReminders:    r9.count  ?? 0,
      vomniReviewReqs:   r10.count ?? 0,
      vomniReEngagement: r11.count ?? 0,
      vomniIntercepted:  funnelIntercepted,
    });
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const d = data ?? {
    nextAppt: null, todayBookings: [], statsToday: 0, statsWeek: 0,
    statsMonth: 0, monthRevenue: 0, reEngagementRevenue: 0, privateFeedback: [],
    funnelSent: 0, funnelOpened: 0, funnelRated: 0, funnelToGoogle: 0, funnelIntercepted: 0,
    profiles: [], vomniReminders: 0, vomniReviewReqs: 0, vomniReEngagement: 0, vomniIntercepted: 0,
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const funnelSteps = [
    { label: "requests sent", count: d.funnelSent,     pctBase: null            },
    { label: "link opened",   count: d.funnelOpened,   pctBase: d.funnelSent    },
    { label: "rated",         count: d.funnelRated,    pctBase: d.funnelOpened  },
    { label: "to Google",     count: d.funnelToGoogle, pctBase: d.funnelRated   },
  ];

  return (
    <div className="dash-page-outer" style={{ padding: "28px 32px", maxWidth: 1100, width: "100%", boxSizing: "border-box", margin: "0 auto", background: "#F7F8F6" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── 1. TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: TEXT, margin: 0, lineHeight: 1.2 }}>
            Dashboard
          </h1>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>
            {dateStr} · {businessName}
          </div>
        </div>
        <Link
          href="/dashboard/calendar"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 20px", borderRadius: 9999,
            background: G, color: "#fff",
            fontSize: 13, fontWeight: 500, textDecoration: "none",
            marginTop: 4,
          }}
        >
          + New booking
        </Link>
      </div>

      {/* ── 2. NEXT APPOINTMENT BANNER ─────────────────────────────────────── */}
      {d.nextAppt ? (
        <Link href="/dashboard/calendar" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            background: G, borderRadius: 14, padding: "18px 22px",
            marginBottom: 20, display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 16,
          }}>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "#9FE1CB",
                textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6,
              }}>
                Next Appointment
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginBottom: 5 }}>
                {d.nextAppt.customer_name} — {d.nextAppt.service_name}
              </div>
              <div style={{ fontSize: 13, color: "#9FE1CB" }}>
                {isoDateLabel(d.nextAppt.appointment_at)} at {isoHHMM(d.nextAppt.appointment_at)}
                {" · "}
                {d.nextAppt.reminder_sent
                  ? "Reminder sent"
                  : `Reminder sending at ${reminderSendHHMM(d.nextAppt.appointment_at)}`}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{
                padding: "5px 14px", borderRadius: 9999,
                background: "rgba(255,255,255,0.2)",
                fontSize: 13, fontWeight: 500, color: "#fff",
              }}>
                Confirmed
              </span>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 18 }}>›</span>
            </div>
          </div>
        </Link>
      ) : (
        <div style={{
          padding: "16px 22px", marginBottom: 20,
          background: "#fff", borderRadius: 14, boxShadow: SHADOW,
        }}>
          <span style={{ fontSize: 14, color: MUTED }}>No appointments booked yet</span>
        </div>
      )}

      {/* ── 3. STATS ROW ──────────────────────────────────────────────────── */}
      <div className="dash-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 28 }}>
        {/* Today */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: SHADOW }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Today
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: TEXT, lineHeight: 1 }}>
            {d.statsToday}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 5 }}>appointments</div>
        </div>

        {/* This week */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: SHADOW }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            This week
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: TEXT, lineHeight: 1 }}>
            {d.statsWeek}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 5 }}>appointments</div>
        </div>

        {/* This month */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: SHADOW }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            This month
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: TEXT, lineHeight: 1 }}>
            {d.statsMonth}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 5 }}>appointments</div>
        </div>

        {/* Est. revenue */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: SHADOW }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Est. revenue
          </div>
          <div style={{ fontSize: d.monthRevenue >= 10000 ? 28 : 36, fontWeight: 700, color: G, lineHeight: 1 }}>
            {d.monthRevenue > 0 ? `${sym}${d.monthRevenue.toLocaleString()}` : `${sym}0`}
          </div>
          {d.reEngagementRevenue > 0 && (
            <div style={{ fontSize: 12, color: G, marginTop: 6 }}>
              +{sym}{d.reEngagementRevenue.toLocaleString()} re-engagements
            </div>
          )}
        </div>
      </div>

      {/* ── 4. TODAY'S APPOINTMENTS ────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: TEXT }}>Today&apos;s appointments</div>
          <Link href="/dashboard/calendar" style={{ fontSize: 13, color: G, textDecoration: "none" }}>
            View calendar →
          </Link>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: SHADOW, overflow: "hidden" }}>
          {d.todayBookings.length === 0 ? (
            <div style={{ padding: "16px 22px", fontSize: 14, color: MUTED }}>
              Nothing booked today
            </div>
          ) : (
            d.todayBookings.map((b, i) => {
              const confirmed = b.status === "confirmed";
              const dot       = confirmed ? G : "#D1D5DB";
              const durLabel  = b.service_duration_minutes ? ` · ${b.service_duration_minutes} min` : "";

              let tag: React.ReactNode = null;
              if (b.reminder_sent) {
                tag = (
                  <span style={{
                    padding: "3px 11px", borderRadius: 9999,
                    background: "#E1F5EE", color: "#0F6E56",
                    fontSize: 12, fontWeight: 500, flexShrink: 0,
                  }}>
                    Reminded ✓
                  </span>
                );
              } else if (confirmed) {
                tag = (
                  <span style={{
                    padding: "3px 11px", borderRadius: 9999,
                    background: "#F3F4F6", color: MUTED,
                    fontSize: 12, flexShrink: 0,
                  }}>
                    Reminder at {reminderSendHHMM(b.appointment_at)}
                  </span>
                );
              }

              return (
                <div
                  key={b.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 22px",
                    borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}`,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, flexShrink: 0, minWidth: 42 }}>
                    {isoHHMM(b.appointment_at)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>
                      {b.customer_name}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                      {b.service_name}{durLabel}
                    </div>
                  </div>
                  {tag}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 5. NEEDS YOUR ATTENTION ────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 10 }}>
          Needs your attention
        </div>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: SHADOW, overflow: "hidden" }}>
          {d.privateFeedback.length === 0 ? (
            <div style={{ padding: "16px 22px", fontSize: 14, color: MUTED }}>
              Nothing needs your attention right now.
            </div>
          ) : (
            d.privateFeedback.map((fb, i) => (
              <div
                key={fb.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 22px",
                  borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}`,
                }}
              >
                {/* Speech bubble icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "#F3F4F6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 16,
                }}>
                  💬
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: TEXT, marginBottom: 3 }}>
                    Private complaint — not on Google
                  </div>
                  {fb.feedback_text && (
                    <div style={{ fontSize: 13, color: MUTED }}>
                      &ldquo;{fb.feedback_text.length > 60
                        ? fb.feedback_text.substring(0, 60) + "…"
                        : fb.feedback_text}&rdquo;
                    </div>
                  )}
                </div>
                <Link
                  href="/dashboard/feedback"
                  style={{ fontSize: 13, color: G, textDecoration: "none", flexShrink: 0, paddingTop: 2 }}
                >
                  Reply →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── 6. THIS MONTH ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 10 }}>
          This month
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Left + Right columns */}
          <div className="dash-content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>

            {/* LEFT — Review pipeline */}
            <div style={{ background: "#fff", padding: "20px 22px", borderRadius: 14, boxShadow: SHADOW }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Review pipeline</div>
                <Link href="/dashboard/analytics" style={{ fontSize: 13, color: G, textDecoration: "none" }}>
                  Details →
                </Link>
              </div>

              {/* Horizontal funnel */}
              <div style={{ display: "flex", alignItems: "stretch", gap: 0, minWidth: 0, overflow: "hidden" }}>
                {funnelSteps.map((step, i) => (
                  <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{
                      flex: 1, textAlign: "center",
                      background: i === 3 ? "rgba(0,200,150,0.08)" : "#F7F8FA",
                      border: `1.5px solid ${i === 3 ? G : "#D1D5DB"}`,
                      borderRadius: 12,
                      padding: "14px 6px",
                    }}>
                      <div style={{ fontSize: 30, fontWeight: 700, color: i === 3 ? G : TEXT, lineHeight: 1 }}>
                        {step.count}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                        {step.label}
                      </div>
                      {step.pctBase !== null && (
                        <div style={{ fontSize: 11, color: G, fontWeight: 600, marginTop: 4 }}>
                          {pct(step.count, step.pctBase)}%
                        </div>
                      )}
                    </div>
                    {i < funnelSteps.length - 1 && (
                      <div style={{ color: "#9CA3AF", fontSize: 18, padding: "0 6px", flexShrink: 0, userSelect: "none" }}>→</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Intercepted negatives */}
              {d.funnelIntercepted > 0 && (
                <div style={{
                  marginTop: 16, paddingLeft: 10,
                  borderLeft: "3px solid #E5E7EB",
                }}>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>
                    {d.funnelIntercepted} negative{d.funnelIntercepted !== 1 ? "s" : ""} intercepted — never reached Google
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Re-engagement */}
            <div style={{ background: "#fff", padding: "20px 22px", borderRadius: 14, boxShadow: SHADOW }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Re-engagement</div>
                <Link href="/dashboard/customers/crm" style={{ fontSize: 13, color: G, textDecoration: "none" }}>
                  View all →
                </Link>
              </div>

              {d.profiles.length === 0 ? (
                <div style={{ fontSize: 13, color: MUTED }}>
                  Customers will appear here as they book.
                </div>
              ) : (
                d.profiles.map((p, i) => {
                  const badge = PROFILE_BADGE[p.profileState];

                  const weeksSinceLast = p.last_visit_at
                    ? Math.floor((Date.now() - new Date(p.last_visit_at).getTime()) / (1000 * 60 * 60 * 24 * 7))
                    : null;
                  const avgWeeks = p.avg_days_between_visits
                    ? Math.round(p.avg_days_between_visits / 7)
                    : null;

                  const detail =
                    p.profileState === "booked"
                      ? "Returned after nudge"
                      : p.profileState === "review"
                        ? "Review request sent"
                        : weeksSinceLast !== null && avgWeeks
                          ? `${weeksSinceLast} weeks · visits every ${avgWeeks} weeks`
                          : weeksSinceLast !== null
                            ? `${weeksSinceLast} weeks since last visit`
                            : null;

                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "11px 0",
                        borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}`,
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: badge.dot, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>
                          {p.name ?? "Customer"}
                        </div>
                        {detail && (
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{detail}</div>
                        )}
                      </div>
                      {badge.label && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 9999,
                          background: badge.bg, color: badge.color,
                          fontSize: 11, fontWeight: 500, flexShrink: 0,
                        }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div style={{ background: "#E1F5EE", padding: "16px 20px", borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#085041", marginBottom: 12 }}>
              Vomni handled this month — automatically
            </div>
            <div className="dash-vomni-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
              {[
                { label: "reminders sent",              value: d.vomniReminders     },
                { label: "review requests",             value: d.vomniReviewReqs    },
                { label: "re-engagement messages",      value: d.vomniReEngagement  },
                { label: "bad reviews on Google",       value: d.vomniIntercepted   },
              ].map((card, i) => (
                <div key={i} style={{
                  background: "#fff", borderRadius: 10, padding: "12px 14px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: G, lineHeight: 1, marginBottom: 5 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.3 }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
