"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Star, Users, ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, Clock, AlertCircle, UserCheck, MessageSquare } from "lucide-react";
import { useBusinessContext } from "../_context";
import { getAllBookings, fmtDate, type DBBooking, getAuthToken } from "@/lib/db";

const G     = "#00C896";
const N     = "#0A0F1E";
const PAGE_SIZE = 15;

// ── Status definitions ─────────────────────────────────────────────────────

/** Ordered journey steps */
const JOURNEY_STEPS: { key: string; label: string }[] = [
  { key: "pending",                        label: "Pending"    },
  { key: "sms_sent",                       label: "SMS Sent"   },
  { key: "form_opened",                    label: "Opened"     },
  { key: "form_submitted",                 label: "Rated"      },
  { key: "redirected_to_google",           label: "Google"     },
  { key: "private_feedback",               label: "Private"    },
  { key: "private_feedback_from_positive", label: "Private"    },
  // legacy
  { key: "reviewed_positive",              label: "Positive"   },
  { key: "reviewed_negative",              label: "Negative"   },
  { key: "redirected",                     label: "Redirected" },
];

const STEP_INDEX: Record<string, number> = {
  pending:                        0,
  sms_sent:                       1,
  form_opened:                    2,
  form_submitted:                 3,
  redirected_to_google:           4,
  private_feedback:               3,
  private_feedback_from_positive: 3,
  // legacy
  reviewed_positive:              3,
  reviewed_negative:              3,
  redirected:                     4,
};

function stepColor(key: string): string {
  if (key === "pending")                           return "#9CA3AF";
  if (key === "sms_sent")                          return "#F59E0B";
  if (key === "form_opened")                       return "#F59E0B";
  if (key === "form_submitted")                    return G;
  if (key === "redirected_to_google")              return G;
  if (key === "private_feedback")                  return "#EF4444";
  if (key === "private_feedback_from_positive")    return "#F59E0B";
  if (key === "reviewed_positive")                 return G;
  if (key === "reviewed_negative")                 return "#EF4444";
  if (key === "redirected")                        return G;
  return "#9CA3AF";
}

/** Compact badge for table / mobile cards */
const STATUS_BADGE: Record<string, { label: string; style: React.CSSProperties }> = {
  pending:                        { label: "Pending",          style: { background: "#F3F4F6", color: "#6B7280" } },
  sms_sent:                       { label: "SMS Sent",         style: { background: "#FEF3C7", color: "#B45309" } },
  form_opened:                    { label: "Opened",           style: { background: "#FEF3C7", color: "#B45309" } },
  form_submitted:                 { label: "Rated",            style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  redirected_to_google:           { label: "Sent to Google",   style: { background: "rgba(0,200,150,0.12)", color: "#00A87D" } },
  private_feedback:               { label: "Private Feedback", style: { background: "#FEE2E2", color: "#DC2626" } },
  private_feedback_from_positive: { label: "Gave Feedback",   style: { background: "#FEF3C7", color: "#B45309" } },
  // legacy statuses - keep for backward compat
  reviewed_positive: { label: "Positive",         style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  reviewed_negative: { label: "Negative",         style: { background: "#FEE2E2", color: "#DC2626" } },
  redirected:        { label: "Redirected",        style: { background: "rgba(0,200,150,0.12)", color: "#00A87D" } },
  sent:              { label: "Sent",              style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  opened:            { label: "Opened",            style: { background: "#FEF3C7", color: "#B45309" } },
  clicked:           { label: "Clicked",           style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  failed:            { label: "Failed",            style: { background: "#FEE2E2", color: "#DC2626" } },
};

const STATUS_OPTIONS = [
  { value: "all",                         label: "All" },
  { value: "pending",                     label: "Pending" },
  { value: "sms_sent",                    label: "SMS Sent" },
  { value: "form_opened",                 label: "Form Opened" },
  { value: "form_submitted",              label: "Rated" },
  { value: "redirected_to_google",        label: "Sent to Google" },
  { value: "private_feedback",            label: "Private Feedback" },
  // legacy
  { value: "reviewed_positive",           label: "Positive (legacy)" },
  { value: "reviewed_negative",           label: "Negative (legacy)" },
  { value: "redirected",                  label: "Redirected (legacy)" },
];

const DATE_OPTIONS = [
  { value: "all",   label: "All time" },
  { value: "week",  label: "This week" },
  { value: "month", label: "This month" },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} style={{ fill: i <= rating ? "#FACC15" : "#E5E7EB", color: i <= rating ? "#FACC15" : "#E5E7EB" }} />
      ))}
    </div>
  );
}

/**
 * Visual horizontal progress track showing which journey stage the booking is at.
 * 4 nodes: Pending → SMS Sent → Opened → Reviewed/Redirected
 */
function JourneyTrack({ status }: { status: string | null }) {
  const current = status ?? "pending";
  const idx     = STEP_INDEX[current] ?? 0;
  const isNeg   = current === "reviewed_negative" || current === "private_feedback";

  // 4 display nodes
  const nodes = [
    { key: "pending",     label: "Sent"      },
    { key: "sms_sent",    label: "SMS"       },
    { key: "form_opened", label: "Opened"    },
    { key: "form_submitted", label: isNeg ? "Negative" : idx >= 3 ? "Reviewed" : "Review" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 160 }}>
      {nodes.map((node, i) => {
        const reached  = i <= idx;
        const isActive = i === idx;
        const dotColor = reached
          ? (isNeg && i === 3 ? "#EF4444" : i === 0 ? "#9CA3AF" : i === 1 ? "#F59E0B" : i === 2 ? "#F59E0B" : G)
          : "#E5E7EB";

        return (
          <div key={node.key} style={{ display: "flex", alignItems: "center", flex: i < nodes.length - 1 ? 1 : "none" }}>
            {/* Dot */}
            <div style={{
              width: isActive ? 12 : 8,
              height: isActive ? 12 : 8,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
              transition: "all 0.2s",
              boxShadow: isActive ? `0 0 0 3px ${dotColor}30` : "none",
            }} />
            {/* Line */}
            {i < nodes.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: i < idx ? dotColor : "#E5E7EB",
                minWidth: 12,
                transition: "background 0.2s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CRM Types ────────────────────────────────────────────────────────────────

interface CrmCustomer {
  id: string;
  display_name: string;
  phone_display: string;
  source: "booking" | "import";
  last_visit_at: string | null;
  last_service: string | null;
  total_visits: number;
  status: "active" | "at_risk" | "lapsed" | "opted_out";
  next_appointment: { appointment_at: string; service_name: string | null } | null;
  last_outreach: { type: string; sent_at: string } | null;
  nudged_recently: boolean;
  opted_out: boolean;
  opted_out_at: string | null;
  notes: string | null;
  created_at: string;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string | null;
  appointment_at: string | null;
  status: "confirmed" | "completed" | "no_show" | "cancelled" | "pending";
  notes: string | null;
  created_at: string;
}

// ── Appointment status helpers ───────────────────────────────────────────────

const APPT_BADGE: Record<string, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
  confirmed:  { label: "Confirmed",  icon: <CheckCircle size={12} />, style: { background: "rgba(0,200,150,0.10)", color: "#00A87D", border: "1px solid rgba(0,200,150,0.3)" } },
  completed:  { label: "Completed",  icon: <CheckCircle size={12} />, style: { background: "#EFF6FF", color: "#3B82F6", border: "1px solid #BFDBFE" } },
  no_show:    { label: "No-Show",    icon: <XCircle size={12} />,     style: { background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA" } },
  cancelled:  { label: "Cancelled",  icon: <XCircle size={12} />,     style: { background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" } },
  pending:    { label: "Pending",    icon: <Clock size={12} />,       style: { background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" } },
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { businessId } = useBusinessContext();

  const [activeTab,  setActiveTab]  = useState<"appointments" | "reviews" | "crm">("appointments");

  // Reviews tab state
  const [bookings,  setBookings]  = useState<DBBooking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page,      setPage]      = useState(1);

  // CRM tab state
  const [crmFilter,    setCrmFilter]    = useState<"all"|"active"|"at_risk"|"lapsed"|"opted_out"|"imported">("all");
  const [crmPage,      setCrmPage]      = useState(1);
  const [crmLoading,   setCrmLoading]   = useState(false);
  const [crmCustomers, setCrmCustomers] = useState<CrmCustomer[]>([]);
  const [crmStats,     setCrmStats]     = useState({ total: 0, active: 0, at_risk: 0, lapsed: 0 });
  const [crmExpanded,  setCrmExpanded]  = useState<string | null>(null);
  const [crmNotes,     setCrmNotes]     = useState<Record<string, string>>({});
  const [savingNotes,  setSavingNotes]  = useState<string | null>(null);
  const [sendingNudge, setSendingNudge] = useState<string | null>(null);
  const CRM_PER_PAGE = 20;

  // Appointments tab state
  const [appointments,   setAppointments]   = useState<Appointment[]>([]);
  const [apptLoading,    setApptLoading]    = useState(true);
  const [apptSearch,     setApptSearch]     = useState("");
  const [apptStatus,     setApptStatus]     = useState("all");
  const [apptPage,       setApptPage]       = useState(1);
  const [markingNoShow,  setMarkingNoShow]  = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) { setLoading(false); setApptLoading(false); return; }

    // Load review data
    getAllBookings(businessId).then(data => {
      setBookings(data);
      setLoading(false);
    });

    // Load appointments
    db.from("bookings")
      .select("id, customer_name, customer_email, customer_phone, service_name, appointment_at, status, notes, created_at")
      .eq("business_id", businessId)
      .order("appointment_at", { ascending: false })
      .then(({ data }) => {
        setAppointments((data ?? []) as Appointment[]);
        setApptLoading(false);
      });
  }, [businessId]);

  // ── CRM fetch ────────────────────────────────────────────────────────────
  const fetchCrm = useCallback(async () => {
    if (!businessId) return;
    setCrmLoading(true);
    try {
      const token = await getAuthToken();
      const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `/api/crm/customers?business_id=${businessId}&filter=${crmFilter}&page=${crmPage}&per_page=${CRM_PER_PAGE}`,
        { headers: authHeader }
      );
      if (res.ok) {
        const json = await res.json();
        setCrmCustomers(json.customers ?? []);
        setCrmStats(json.stats ?? { total: 0, active: 0, at_risk: 0, lapsed: 0 });
        // Pre-populate notes state
        const notesMap: Record<string, string> = {};
        for (const c of json.customers ?? []) {
          notesMap[c.id] = c.notes ?? "";
        }
        setCrmNotes(prev => ({ ...prev, ...notesMap }));
      }
    } finally {
      setCrmLoading(false);
    }
  }, [businessId, crmFilter, crmPage]);

  useEffect(() => {
    if (activeTab === "crm") fetchCrm();
  }, [activeTab, fetchCrm]);

  async function saveNotes(profileId: string) {
    if (!businessId) return;
    setSavingNotes(profileId);
    try {
      const token = await getAuthToken();
      const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
      await fetch("/api/crm/customers", {
        method: "PATCH",
        headers: authHeader,
        body: JSON.stringify({ business_id: businessId, profile_id: profileId, notes: crmNotes[profileId] ?? "" }),
      });
    } finally {
      setSavingNotes(null);
    }
  }

  async function sendNudge(profileId: string, phone: string) {
    if (!businessId) return;
    setSendingNudge(profileId);
    try {
      const token = await getAuthToken();
      const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
      await fetch("/api/crm/nudge", {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ business_id: businessId, customer_phone: phone, nudge_type: "lapsed" }),
      });
      await fetchCrm();
    } finally {
      setSendingNudge(null);
    }
  }

  async function markNoShow(bookingId: string) {
    setMarkingNoShow(bookingId);
    await db.from("bookings").update({ status: "no_show" }).eq("id", bookingId);
    setAppointments(prev => prev.map(a => a.id === bookingId ? { ...a, status: "no_show" as const } : a));
    setMarkingNoShow(null);
  }

  // Appointment filtering
  const filteredAppts = useMemo(() => {
    return appointments.filter(a => {
      const matchSearch = !apptSearch || [a.customer_name, a.customer_email, a.customer_phone, a.service_name]
        .some(v => v?.toLowerCase().includes(apptSearch.toLowerCase()));
      const matchStatus = apptStatus === "all" || a.status === apptStatus;
      return matchSearch && matchStatus;
    });
  }, [appointments, apptSearch, apptStatus]);

  const apptTotalPages = Math.max(1, Math.ceil(filteredAppts.length / PAGE_SIZE));
  const apptPaged      = filteredAppts.slice((apptPage - 1) * PAGE_SIZE, apptPage * PAGE_SIZE);

  const filtered = useMemo(() => {
    const now   = new Date();
    const wkAgo = new Date(now); wkAgo.setDate(now.getDate() - 7);
    const moSt  = new Date(now.getFullYear(), now.getMonth(), 1);

    return bookings.filter(b => {
      const matchSearch = !search || [b.customer_name, b.customer_email, b.service]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = status === "all" || b.review_status === status;
      const created     = new Date(b.created_at);
      const matchDate   = dateRange === "all" ? true
        : dateRange === "week" ? created >= wkAgo
        : created >= moSt;
      return matchSearch && matchStatus && matchDate;
    });
  }, [bookings, search, status, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: "0 0 20px" }}>
          Customers
        </h1>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #F3F4F6" }}>
          {([
            { key: "appointments", label: "Appointments", icon: <Calendar size={15} /> },
            { key: "reviews",      label: "Reviews",      icon: <Star size={15} /> },
            { key: "crm",          label: "CRM",          icon: <UserCheck size={15} /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", border: "none", background: "none", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                color: activeTab === tab.key ? G : "#6B7280",
                borderBottom: `2px solid ${activeTab === tab.key ? G : "transparent"}`,
                marginBottom: -2, transition: "color 0.15s",
              }}
            >
              {tab.icon}
              {tab.label}
              <span style={{
                background: activeTab === tab.key ? `${G}18` : "#F3F4F6",
                color: activeTab === tab.key ? G : "#9CA3AF",
                borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 700,
              }}>
                {tab.key === "appointments" ? appointments.length : tab.key === "reviews" ? bookings.length : crmStats.total}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── APPOINTMENTS TAB ── */}
      {activeTab === "appointments" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
              <input
                value={apptSearch}
                onChange={e => { setApptSearch(e.target.value); setApptPage(1); }}
                placeholder="Search name, phone, service…"
                style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <select
              value={apptStatus}
              onChange={e => { setApptStatus(e.target.value); setApptPage(1); }}
              style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", background: "#fff", minWidth: 160 }}
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="no_show">No-Show</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {apptLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : apptPaged.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <Calendar size={36} style={{ color: "#D1D5DB", margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                {appointments.length === 0 ? "No appointments yet" : "No results match your filters"}
              </h3>
              <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                {appointments.length === 0 ? "Appointments will appear here when customers book via your booking link." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                      {["Customer", "Service", "Date & Time", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apptPaged.map((a, idx) => {
                      const badge = APPT_BADGE[a.status] ?? APPT_BADGE.pending;
                      const isPast = a.appointment_at ? new Date(a.appointment_at) < new Date() : false;
                      const canMarkNoShow = (a.status === "confirmed" || a.status === "pending") && isPast;
                      return (
                        <tr key={a.id} style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : "none" }}>
                          <td style={{ padding: "14px 16px" }}>
                            <p style={{ fontWeight: 600, color: N, fontSize: 14, margin: 0 }}>{a.customer_name ?? "-"}</p>
                            {a.customer_phone && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>{a.customer_phone}</p>}
                            {a.customer_email && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "1px 0 0" }}>{a.customer_email}</p>}
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 14, color: "#374151" }}>{a.service_name ?? "-"}</td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" }}>
                            {a.appointment_at ? (
                              <>
                                <p style={{ margin: 0, color: N, fontWeight: 500 }}>{new Date(a.appointment_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>{new Date(a.appointment_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                              </>
                            ) : "-"}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: "4px 10px", ...badge.style }}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            {canMarkNoShow && (
                              <button
                                onClick={() => markNoShow(a.id)}
                                disabled={markingNoShow === a.id}
                                style={{
                                  padding: "6px 12px", borderRadius: 8, border: "1px solid #FECACA",
                                  background: markingNoShow === a.id ? "#F9FAFB" : "#FEF2F2",
                                  color: "#DC2626", fontFamily: "Inter, sans-serif", fontSize: 12,
                                  fontWeight: 600, cursor: markingNoShow === a.id ? "not-allowed" : "pointer",
                                  display: "flex", alignItems: "center", gap: 5,
                                }}
                              >
                                <AlertCircle size={12} />
                                {markingNoShow === a.id ? "Saving…" : "Mark No-Show"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {apptTotalPages > 1 && (
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                    {(apptPage - 1) * PAGE_SIZE + 1}–{Math.min(apptPage * PAGE_SIZE, filteredAppts.length)} of {filteredAppts.length}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={apptPage === 1} onClick={() => setApptPage(p => p - 1)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: apptPage === 1 ? "#F9FAFB" : "#fff", color: apptPage === 1 ? "#D1D5DB" : N, cursor: apptPage === 1 ? "not-allowed" : "pointer" }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button disabled={apptPage === apptTotalPages} onClick={() => setApptPage(p => p + 1)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: apptPage === apptTotalPages ? "#F9FAFB" : "#fff", color: apptPage === apptTotalPages ? "#D1D5DB" : N, cursor: apptPage === apptTotalPages ? "not-allowed" : "pointer" }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── REVIEWS TAB ── */}
      {activeTab === "reviews" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, service…"
            style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", background: "#fff", minWidth: 180 }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={dateRange}
          onChange={e => { setDateRange(e.target.value); setPage(1); }}
          style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", background: "#fff", minWidth: 140 }}
        >
          {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { color: "#9CA3AF", label: "Pending" },
          { color: "#F59E0B", label: "SMS Sent" },
          { color: "#F59E0B", label: "Form Opened" },
          { color: G,         label: "Positive / Redirected" },
          { color: "#EF4444", label: "Negative" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          {bookings.length === 0 ? (
            <>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Users size={28} style={{ color: G }} />
              </div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                No customers yet
              </h3>
              <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif", maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Customers appear here when they are added via the Vomni booking system. Each entry tracks their full review journey - from first message to Google review.
              </p>
            </>
          ) : (
            <>
              <Users size={32} style={{ color: "#D1D5DB", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                No results match your filters.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  {["Customer", "Service", "Appointment", "Journey", "Status", "Rating", "Added"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((b, idx) => {
                  const badge = STATUS_BADGE[b.review_status ?? "pending"] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={b.id} style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : "none" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontWeight: 500, color: N, fontSize: 14, margin: 0 }}>{b.customer_name ?? "-"}</p>
                        {b.customer_email && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>{b.customer_email}</p>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#374151" }}>{b.service ?? "-"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#6B7280" }}>{fmtDate(b.appointment_at)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <JourneyTrack status={b.review_status} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, borderRadius: 9999, padding: "3px 10px", ...badge.style }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {b.rating ? <StarRating rating={b.rating} /> : <span style={{ fontSize: 12, color: "#D1D5DB" }}>-</span>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#6B7280" }}>{fmtDate(b.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: page === 1 ? "#F9FAFB" : "#fff", color: page === 1 ? "#D1D5DB" : N, cursor: page === 1 ? "not-allowed" : "pointer" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: page === totalPages ? "#F9FAFB" : "#fff", color: page === totalPages ? "#D1D5DB" : N, cursor: page === totalPages ? "not-allowed" : "pointer" }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
        </>
      )} {/* end reviews tab */}

      {/* ── CRM TAB ── */}
      {activeTab === "crm" && (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total",   value: crmStats.total,   color: N },
              { label: "Active",  value: crmStats.active,  color: G },
              { label: "At-risk", value: crmStats.at_risk, color: "#F59E0B" },
              { label: "Lapsed",  value: crmStats.lapsed,  color: "#EF4444" },
            ].map(card => (
              <div key={card.label} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "20px 22px" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: "0 0 6px" }}>{card.label}</p>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: card.color, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {([
              { key: "all",       label: "All" },
              { key: "active",    label: "Active" },
              { key: "at_risk",   label: "At-risk" },
              { key: "lapsed",    label: "Lapsed" },
              { key: "opted_out", label: "Opted out" },
              { key: "imported",  label: "Imported" },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => { setCrmFilter(f.key); setCrmPage(1); }}
                style={{
                  padding: "6px 16px", border: `1px solid ${crmFilter === f.key ? G : "#E5E7EB"}`,
                  borderRadius: 9999, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                  background: crmFilter === f.key ? `${G}12` : "#fff",
                  color: crmFilter === f.key ? G : "#6B7280", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          {crmLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : crmCustomers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <Users size={36} style={{ color: "#D1D5DB", margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                {crmStats.total === 0 ? "No customers yet" : "No customers match this filter"}
              </h3>
              <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                {crmStats.total === 0
                  ? "Customers appear here after their first completed appointment or import. Your CRM builds itself."
                  : "Try a different filter."}
              </p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    {["Customer", "Source", "Last visit", "Visits", "Status", "Next appt", "Outreach", "Action"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crmCustomers.map((c, idx) => {
                    const isExpanded = crmExpanded === c.id;
                    const statusBadge = {
                      active:    { label: "Active",    bg: "rgba(0,200,150,0.1)",  color: "#00A87D" },
                      at_risk:   { label: "At-risk",   bg: "#FEF3C7",              color: "#B45309" },
                      lapsed:    { label: "Lapsed",    bg: "#FEE2E2",              color: "#DC2626" },
                      opted_out: { label: "Opted out", bg: "#F3F4F6",              color: "#6B7280" },
                    }[c.status];

                    return (
                      <>
                        <tr
                          key={c.id}
                          onClick={() => setCrmExpanded(isExpanded ? null : c.id)}
                          style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer", background: isExpanded ? "#FAFAFA" : "#fff", transition: "background 0.1s" }}
                        >
                          {/* Customer */}
                          <td style={{ padding: "14px 14px" }}>
                            <p style={{ fontWeight: 600, color: N, fontSize: 14, margin: 0 }}>{c.display_name || "—"}</p>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>{c.phone_display}</p>
                          </td>
                          {/* Source */}
                          <td style={{ padding: "14px 14px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: "3px 10px",
                              background: c.source === "import" ? "#EFF6FF" : "rgba(0,200,150,0.08)",
                              color: c.source === "import" ? "#3B82F6" : G,
                            }}>
                              {c.source === "import" ? "Imported" : "Booking"}
                            </span>
                          </td>
                          {/* Last visit */}
                          <td style={{ padding: "14px 14px" }}>
                            {c.last_visit_at ? (
                              <>
                                <p style={{ fontSize: 13, color: N, margin: 0 }}>{new Date(c.last_visit_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                                {c.last_service && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>{c.last_service}</p>}
                              </>
                            ) : c.source === "import" ? (
                              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Imported {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                            ) : "—"}
                          </td>
                          {/* Total visits */}
                          <td style={{ padding: "14px 14px", fontSize: 14, color: N }}>
                            {c.total_visits > 0 ? c.total_visits : <span style={{ color: "#9CA3AF", fontSize: 12 }}>0{c.source === "import" ? " (imported)" : ""}</span>}
                          </td>
                          {/* Status */}
                          <td style={{ padding: "14px 14px" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: "4px 10px", background: statusBadge.bg, color: statusBadge.color }}>
                              {statusBadge.label}
                            </span>
                          </td>
                          {/* Next appointment */}
                          <td style={{ padding: "14px 14px", fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" }}>
                            {c.next_appointment ? (
                              <>
                                <p style={{ margin: 0, color: N, fontWeight: 500 }}>{new Date(c.next_appointment.appointment_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                                {c.next_appointment.service_name && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>{c.next_appointment.service_name}</p>}
                              </>
                            ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                          </td>
                          {/* Outreach */}
                          <td style={{ padding: "14px 14px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
                            {c.last_outreach ? (
                              <span>
                                {c.last_outreach.type === "review_request" ? "Review sent" : `Nudged`}{" "}
                                {new Date(c.last_outreach.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                            ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                          </td>
                          {/* Action */}
                          <td style={{ padding: "14px 14px" }} onClick={e => e.stopPropagation()}>
                            {c.opted_out ? (
                              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Opted out</span>
                            ) : c.nudged_recently ? (
                              <span title="Nudged within the last 14 days" style={{ fontSize: 12, color: "#D1D5DB", cursor: "default" }}>Nudged recently</span>
                            ) : (
                              <button
                                onClick={() => sendNudge(c.id, c.phone_display)}
                                disabled={sendingNudge === c.id}
                                style={{
                                  padding: "6px 12px", borderRadius: 8, border: `1px solid ${G}30`,
                                  background: sendingNudge === c.id ? "#F9FAFB" : `${G}0a`,
                                  color: G, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                                  cursor: sendingNudge === c.id ? "not-allowed" : "pointer",
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                }}
                              >
                                <MessageSquare size={12} />
                                {sendingNudge === c.id ? "Sending…" : "Send nudge"}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {isExpanded && (
                          <tr key={`${c.id}-expanded`}>
                            <td colSpan={8} style={{ padding: "0 14px 20px", background: "#FAFAFA", borderTop: "none" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, paddingTop: 16 }}>
                                {/* Opt-out status */}
                                {c.opted_out && (
                                  <div style={{ gridColumn: "1 / -1", background: "#FEE2E2", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                                    <XCircle size={16} style={{ color: "#DC2626", flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: "#DC2626", fontFamily: "Inter, sans-serif" }}>
                                      Opted out{c.opted_out_at ? ` on ${new Date(c.opted_out_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                                    </span>
                                  </div>
                                )}

                                {/* Notes */}
                                <div>
                                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Notes</p>
                                  <textarea
                                    value={crmNotes[c.id] ?? ""}
                                    onChange={e => setCrmNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                                    onBlur={() => saveNotes(c.id)}
                                    placeholder="Add notes about this customer…"
                                    rows={3}
                                    style={{
                                      width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB",
                                      borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 13, resize: "vertical",
                                      outline: "none", boxSizing: "border-box",
                                      color: N, background: "#fff",
                                    }}
                                  />
                                  {savingNotes === c.id && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Saving…</p>}
                                </div>

                                {/* Summary stats */}
                                <div>
                                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Summary</p>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                                      <span style={{ color: "#6B7280" }}>Source</span>
                                      <span style={{ fontWeight: 600, color: N }}>{c.source === "import" ? "Imported" : "Vomni booking"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                                      <span style={{ color: "#6B7280" }}>Total visits</span>
                                      <span style={{ fontWeight: 600, color: N }}>{c.total_visits}</span>
                                    </div>
                                    {c.last_visit_at && (
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                                        <span style={{ color: "#6B7280" }}>Last visit</span>
                                        <span style={{ fontWeight: 600, color: N }}>{new Date(c.last_visit_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                      </div>
                                    )}
                                    {c.last_outreach && (
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                                        <span style={{ color: "#6B7280" }}>Last outreach</span>
                                        <span style={{ fontWeight: 600, color: N }}>{new Date(c.last_outreach.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ padding: "16px 14px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                  {(crmPage - 1) * CRM_PER_PAGE + 1}–{(crmPage - 1) * CRM_PER_PAGE + crmCustomers.length} customers
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={crmPage === 1} onClick={() => setCrmPage(p => p - 1)} style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid #E5E7EB", background: crmPage === 1 ? "#F9FAFB" : "#fff", color: crmPage === 1 ? "#D1D5DB" : N, cursor: crmPage === 1 ? "not-allowed" : "pointer" }}>
                    <ChevronLeft size={15} />
                  </button>
                  <button disabled={crmCustomers.length < CRM_PER_PAGE} onClick={() => setCrmPage(p => p + 1)} style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid #E5E7EB", background: crmCustomers.length < CRM_PER_PAGE ? "#F9FAFB" : "#fff", color: crmCustomers.length < CRM_PER_PAGE ? "#D1D5DB" : N, cursor: crmCustomers.length < CRM_PER_PAGE ? "not-allowed" : "pointer" }}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )} {/* end crm tab */}

    </div>
  );
}
