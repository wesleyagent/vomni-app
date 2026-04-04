"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Search, Star, Users, ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, Clock, AlertCircle, UserCheck, MessageSquare } from "lucide-react";
import { useBusinessContext } from "../_context";
import { db, getAuthToken } from "@/lib/db";

const G     = "#00C896";
const N     = "#0A0F1E";
const PAGE_SIZE = 15;

// ── Status definitions ─────────────────────────────────────────────────────

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
  marketing_consent: boolean;
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
  review_status: string | null;
  rating: number | null;
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
  const { businessId, timezone } = useBusinessContext();

  const [activeTab,  setActiveTab]  = useState<"schedule" | "clients">("schedule");

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
  const [syncing,      setSyncing]      = useState(false);
  const [syncResult,   setSyncResult]   = useState<{ synced: number } | null>(null);
  const [crmSearch,    setCrmSearch]    = useState("");
  const [crmError,     setCrmError]     = useState<string | null>(null);
  const autoSyncAttempted = useRef(false);
  const CRM_PER_PAGE = 20;


  // Appointments tab state
  const [appointments,   setAppointments]   = useState<Appointment[]>([]);
  const [apptLoading,    setApptLoading]    = useState(true);
  const [apptSearch,     setApptSearch]     = useState("");
  const [apptStatus,     setApptStatus]     = useState("all");
  const [apptPage,       setApptPage]       = useState(1);
  const [markingNoShow,  setMarkingNoShow]  = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) { setApptLoading(false); return; }

    // Load appointments (Schedule tab)
    db.from("bookings")
      .select("id, customer_name, customer_email, customer_phone, service_name, appointment_at, status, review_status, rating, notes, created_at")
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
    setCrmError(null);
    try {
      // Retry token fetch once — session may not be hydrated on first mount
      let token = await getAuthToken();
      if (!token) {
        await new Promise(r => setTimeout(r, 600));
        token = await getAuthToken();
      }
      if (!token) {
        setCrmError("auth");
        return;
      }
      const res = await fetch(
        `/api/crm/customers?business_id=${businessId}&filter=${crmFilter}&page=${crmPage}&per_page=${CRM_PER_PAGE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setCrmError(null);
        const json = await res.json();
        setCrmCustomers(json.customers ?? []);
        setCrmStats(json.stats ?? { total: 0, active: 0, at_risk: 0, lapsed: 0 });
        const notesMap: Record<string, string> = {};
        for (const c of json.customers ?? []) {
          notesMap[c.id] = c.notes ?? "";
        }
        setCrmNotes(prev => ({ ...prev, ...notesMap }));
        // Auto-sync imported clients if CRM is empty on first load
        if ((json.stats?.total ?? 0) === 0 && !autoSyncAttempted.current) {
          autoSyncAttempted.current = true;
          syncClients();
        }
      } else {
        const body = await res.json().catch(() => ({}));
        setCrmError(`${res.status}: ${body.error ?? "Unknown error"}`);
      }
    } catch (e) {
      setCrmError(`Network error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setCrmLoading(false);
    }
  }, [businessId, crmFilter, crmPage]);

  useEffect(() => {
    if (activeTab === "clients") fetchCrm();
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

  async function syncClients() {
    if (!businessId) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const token = await getAuthToken();
      const authHeader: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
      const res = await fetch("/api/crm/sync-clients", {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ business_id: businessId }),
      });
      const json = await res.json();
      setSyncResult({ synced: json.synced ?? 0 });
      await fetchCrm();
    } finally {
      setSyncing(false);
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

  // Client-side search filter for Clients tab
  const filteredClients = useMemo(() => {
    if (!crmSearch.trim()) return crmCustomers;
    const q = crmSearch.toLowerCase();
    return crmCustomers.filter(c =>
      c.display_name?.toLowerCase().includes(q) ||
      c.phone_display?.toLowerCase().includes(q) ||
      c.last_service?.toLowerCase().includes(q)
    );
  }, [crmCustomers, crmSearch]);

  if (apptLoading && activeTab === "schedule") {
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
            { key: "clients",  label: "Clients",  icon: <UserCheck size={15} />, count: crmStats.total },
            { key: "schedule", label: "Schedule",  icon: <Calendar size={15} />,  count: appointments.length },
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
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SCHEDULE TAB ── */}
      {activeTab === "schedule" && (
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
                      {["Customer", "Service", "Date & Time", "Status", "Review", "Rating", "Actions"].map(h => (
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
                                <p style={{ margin: 0, color: N, fontWeight: 500 }}>{new Date(a.appointment_at.substring(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>{a.appointment_at.substring(11, 16)}</p>
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
                            {a.review_status ? (() => {
                              const rb = STATUS_BADGE[a.review_status] ?? STATUS_BADGE.pending;
                              return (
                                <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: "3px 9px", ...rb.style }}>
                                  {rb.label}
                                </span>
                              );
                            })() : <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            {a.rating ? <StarRating rating={a.rating} /> : <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>}
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


      {/* ── CLIENTS TAB ── */}
      {activeTab === "clients" && (
        <>
          {/* Search + stat cards */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
              <input
                value={crmSearch}
                onChange={e => setCrmSearch(e.target.value)}
                placeholder="Search name, phone, service…"
                style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

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

          {/* Sync imported clients banner — shown when CRM is empty */}
          {crmStats.total === 0 && !crmLoading && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: "#1E40AF", margin: "0 0 2px" }}>
                  Have you imported clients?
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#3B82F6", margin: 0 }}>
                  {syncResult
                    ? syncResult.synced > 0
                      ? `✓ Synced ${syncResult.synced} clients — refreshing…`
                      : "No new clients to sync. Your clients table may be empty."
                    : "Click Sync to pull your imported clients into the CRM."}
                </p>
              </div>
              <button
                onClick={syncClients}
                disabled={syncing}
                style={{
                  padding: "9px 20px", borderRadius: 10, border: "none",
                  background: syncing ? "#93C5FD" : "#3B82F6", color: "#fff",
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                  cursor: syncing ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {syncing ? "Syncing…" : "Sync imported clients"}
              </button>
            </div>
          )}

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

          {/* Error banner */}
          {crmError && !crmLoading && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#DC2626", margin: 0 }}>
                {crmError === "auth"
                  ? "Session not ready — please wait a moment and retry."
                  : `Failed to load clients: ${crmError}`}
              </p>
              <button
                onClick={() => fetchCrm()}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #FECACA", background: "#fff", color: "#DC2626", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Table */}
          {crmLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <Users size={36} style={{ color: "#D1D5DB", margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                {crmStats.total === 0 ? "No customers yet" : "No customers match this filter"}
              </h3>
              <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                {crmStats.total === 0
                  ? "Clients appear here after their first completed appointment or import. Your client list builds itself."
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
                  {filteredClients.map((c, idx) => {
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
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <p style={{ fontWeight: 600, color: N, fontSize: 14, margin: 0 }}>{c.display_name || "—"}</p>
                              {c.opted_out && (
                                <span style={{ fontSize: 10, fontWeight: 600, background: "#F3F4F6", color: "#6B7280", borderRadius: 4, padding: "1px 5px" }}>Unsubscribed</span>
                              )}
                              {!c.opted_out && !c.marketing_consent && (
                                <span style={{ fontSize: 10, fontWeight: 600, background: "#FEF3C7", color: "#B45309", borderRadius: 4, padding: "1px 5px" }}>Reminders off</span>
                              )}
                            </div>
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
      )} {/* end clients tab */}

    </div>
  );
}
