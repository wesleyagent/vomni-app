"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Search, Star, Users, ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, Clock, AlertCircle, UserCheck, MessageSquare, History, Download, Receipt, ListOrdered } from "lucide-react";
import { useBusinessContext } from "../_context";
import { db, getAuthToken } from "@/lib/db";
import PaymentDrawer from "@/components/invoices/PaymentDrawer";

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


// ── Waitlist type ─────────────────────────────────────────────────────────────

type WaitlistStatus = "waiting" | "notified" | "confirmed" | "expired" | "cancelled";

interface WaitlistEntry {
  id: string;
  requested_date: string;
  requested_time: string;
  customer_name: string;
  customer_phone: string;
  position: number;
  status: WaitlistStatus;
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
  service_name: string | null;
}

const WAITLIST_STATUS: Record<WaitlistStatus, { label: string; color: string; bg: string }> = {
  waiting:   { label: "Waiting",   color: "#92400E", bg: "#FEF3C7" },
  notified:  { label: "Notified",  color: "#1D4ED8", bg: "#DBEAFE" },
  confirmed: { label: "Confirmed", color: "#065F46", bg: "#D1FAE5" },
  expired:   { label: "Expired",   color: "#6B7280", bg: "#F3F4F6" },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FEE2E2" },
};

// ── Invoice type (for Invoices sub-tab) ──────────────────────────────────────

interface FullInvoice {
  id:                  string;
  invoice_number:      string;
  document_type:       "heshbonit_mas" | "kabala";
  issued_at:           string;
  customer_name:       string;
  customer_phone:      string | null;
  service_description: string;
  subtotal:            number;
  vat_amount:          number;
  total:               number;
  payment_method:      string;
  pdf_storage_path:    string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", credit: "Credit Card", bit: "Bit", paybox: "Paybox",
};

function exportInvoicesCSV(invoices: FullInvoice[], businessName: string, dateFrom?: string, dateTo?: string) {
  const BOM = "\uFEFF";
  const headers = ["Invoice #", "Type", "Date", "Customer", "Phone", "Service", "Pre-VAT Amount", "VAT", "Total", "Payment Method"];
  const rows = invoices.map(inv => [
    inv.invoice_number,
    inv.document_type === "heshbonit_mas" ? "Tax Invoice" : "Receipt",
    new Date(inv.issued_at).toLocaleDateString("en-GB"),
    inv.customer_name,
    inv.customer_phone ?? "",
    inv.service_description,
    Number(inv.subtotal).toFixed(2),
    Number(inv.vat_amount).toFixed(2),
    Number(inv.total).toFixed(2),
    PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method,
  ]);
  const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const now    = new Date();
  const month  = dateFrom ? dateFrom.substring(0, 7) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const suffix = dateTo && dateFrom ? `${dateFrom}_${dateTo}` : month;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `invoices_${businessName}_${suffix}.csv`; a.click();
  URL.revokeObjectURL(url);
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
  service_price: number | null;
  appointment_at: string | null;
  status: "confirmed" | "completed" | "no_show" | "cancelled" | "pending";
  cancellation_reason: string | null;
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
  rescheduled: { label: "Rescheduled", icon: <CheckCircle size={12} />, style: { background: "#EFF6FF", color: "#3B82F6", border: "1px solid #BFDBFE" } },
  pending:    { label: "Pending",    icon: <Clock size={12} />,       style: { background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" } },
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { businessId, businessName, timezone } = useBusinessContext();

  const [activeTab,  setActiveTab]  = useState<"schedule" | "clients" | "history" | "invoices" | "waitlist">("schedule");

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

  // History tab state
  const [historyAppts,   setHistoryAppts]   = useState<Appointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyInvoices, setHistoryInvoices] = useState<Record<string, { invoice_number: string; id: string }>>({});
  const [historySearch,  setHistorySearch]  = useState("");
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [paymentDrawerBooking, setPaymentDrawerBooking] = useState<Appointment | null>(null);

  // Invoices sub-tab state
  const [allInvoices,   setAllInvoices]   = useState<FullInvoice[]>([]);
  const [invLoading,    setInvLoading]    = useState(false);
  const [invMonth,      setInvMonth]      = useState("");
  const [invDateFrom,   setInvDateFrom]   = useState("");
  const [invDateTo,     setInvDateTo]     = useState("");
  const [invPM,         setInvPM]         = useState("all");
  const [invDlId,       setInvDlId]       = useState<string | null>(null);
  const [invSelected,   setInvSelected]   = useState<Set<string>>(new Set());
  const [invBulkDl,     setInvBulkDl]     = useState(false);

  // Waitlist sub-tab state
  const [waitlistDate,       setWaitlistDate]       = useState(() => new Date().toISOString().substring(0, 10));
  const [waitlistEntries,    setWaitlistEntries]    = useState<WaitlistEntry[]>([]);
  const [waitlistLoading,    setWaitlistLoading]    = useState(false);
  const [waitlistCancelling, setWaitlistCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) { setApptLoading(false); return; }

    // Load appointments (Schedule tab)
    db.from("bookings")
      .select("id, customer_name, customer_email, customer_phone, service_name, appointment_at, status, cancellation_reason, review_status, rating, notes, created_at")
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

  // Load past appointments + their invoices for history tab
  const loadHistory = useCallback(async () => {
    if (!businessId) return;
    setHistoryLoading(true);
    const { data: appts } = await db
      .from("bookings")
      .select("id, customer_name, customer_email, customer_phone, service_name, appointment_at, status, cancellation_reason, review_status, rating, notes, created_at, service_price")
      .eq("business_id", businessId)
      .in("status", ["completed", "cancelled", "no_show"])
      .order("appointment_at", { ascending: false })
      .limit(200);
    setHistoryAppts((appts ?? []) as Appointment[]);

    // Fetch invoices for this business to cross-reference
    const { data: invs } = await db
      .from("invoices")
      .select("id, invoice_number, booking_id")
      .eq("business_id", businessId);
    const invMap: Record<string, { invoice_number: string; id: string }> = {};
    for (const inv of invs ?? []) {
      if (inv.booking_id) invMap[inv.booking_id] = { invoice_number: inv.invoice_number, id: inv.id };
    }
    setHistoryInvoices(invMap);
    setHistoryLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab, loadHistory]);

  // Load all invoices for the Invoices sub-tab
  const loadInvoices = useCallback(async () => {
    if (!businessId) return;
    setInvLoading(true);
    const { data } = await db
      .from("invoices")
      .select("id, invoice_number, document_type, issued_at, customer_name, customer_phone, service_description, subtotal, vat_amount, total, payment_method, pdf_storage_path")
      .eq("business_id", businessId)
      .order("issued_at", { ascending: false });
    setAllInvoices((data ?? []) as FullInvoice[]);
    setInvLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (activeTab === "invoices") loadInvoices();
  }, [activeTab, loadInvoices]);

  // Auto-set date range when month filter changes
  useEffect(() => {
    if (!invMonth) return;
    const [y, m] = invMonth.split("-").map(Number);
    setInvDateFrom(`${invMonth}-01`);
    setInvDateTo(new Date(y, m, 0).toISOString().substring(0, 10));
  }, [invMonth]);

  // Load waitlist entries
  const loadWaitlist = useCallback(async (d: string) => {
    setWaitlistLoading(true);
    try {
      const res = await fetch(`/api/dashboard/waitlist?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        setWaitlistEntries(data.entries ?? []);
      }
    } catch { /* ignore */ } finally {
      setWaitlistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "waitlist") loadWaitlist(waitlistDate);
  }, [activeTab, waitlistDate, loadWaitlist]);

  async function cancelWaitlistEntry(id: string) {
    if (!confirm("Remove this person from the waitlist?")) return;
    setWaitlistCancelling(id);
    try {
      const res = await fetch(`/api/dashboard/waitlist?id=${id}`, { method: "DELETE" });
      if (res.ok) setWaitlistEntries(prev => prev.map(e => e.id === id ? { ...e, status: "cancelled" as WaitlistStatus } : e));
    } catch { /* ignore */ } finally {
      setWaitlistCancelling(null);
    }
  }

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
    try {
      const token = await getAuthToken();
      await fetch(`/api/booking/x/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ booking_id: bookingId, status: "no_show" }),
      });
      setHistoryAppts(prev => prev.map(a => a.id === bookingId ? { ...a, status: "no_show" as const } : a));
    } finally {
      setMarkingNoShow(null);
    }
  }

  // Appointment filtering
  const filteredAppts = useMemo(() => {
    return appointments.filter(a => {
      if (a.status !== "confirmed" && a.status !== "pending") return false;
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
            { key: "schedule",  label: "Upcoming Appointments", icon: <Calendar size={15} />,     count: appointments.filter(a => a.status === "confirmed" || a.status === "pending").length },
            { key: "waitlist",  label: "Waitlist",              icon: <ListOrdered size={15} />,  count: waitlistEntries.filter(e => e.status === "waiting" || e.status === "notified").length },
            { key: "history",   label: "Past Appointments",     icon: <History size={15} />,      count: historyAppts.length },
            { key: "clients",   label: "Customers",             icon: <UserCheck size={15} />,    count: crmStats.total },
            { key: "invoices",  label: "Invoices",              icon: <Receipt size={15} />,      count: allInvoices.length },
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
              <option value="all">All upcoming</option>
              <option value="confirmed">Confirmed</option>
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
                {filteredAppts.length === 0 && apptSearch === "" && apptStatus === "all" ? "No upcoming appointments" : "No results match your filters"}
              </h3>
              <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                {filteredAppts.length === 0 && apptSearch === "" && apptStatus === "all" ? "Upcoming confirmed and pending appointments will appear here." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                      {["Customer", "Service", "Date & Time", "Status", "Review", "Rating"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apptPaged.map((a, idx) => {
                      const badgeKey = a.status === "cancelled" && a.cancellation_reason === "rescheduled" ? "rescheduled" : a.status;
                      const badge = APPT_BADGE[badgeKey] ?? APPT_BADGE.pending;
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

      {/* ── PAST APPOINTMENTS TAB ── */}
      {activeTab === "history" && (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
              <input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search name, phone, service…"
                style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {historyLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : (() => {
            const filtered = historyAppts.filter(a => {
              if (!historySearch) return true;
              const q = historySearch.toLowerCase();
              return [a.customer_name, a.customer_phone, a.service_name].some(v => v?.toLowerCase().includes(q));
            });
            if (filtered.length === 0) return (
              <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB" }}>
                <History size={36} style={{ color: "#D1D5DB", margin: "0 auto 16px" }} />
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                  No past appointments yet
                </h3>
                <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                  Past appointments will appear here once they've taken place.
                </p>
              </div>
            );
            return (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                      {["Customer", "Service", "Date", "Status", "Review", "Rating", "Invoice", ""].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, idx) => {
                      const badgeKey = a.status === "cancelled" && a.cancellation_reason === "rescheduled" ? "rescheduled" : a.status;
                      const badge = APPT_BADGE[badgeKey] ?? APPT_BADGE.pending;
                      const inv = historyInvoices[a.id];
                      const canCharge = timezone === "Asia/Jerusalem" && !inv && a.status !== "cancelled" && a.status !== "no_show";
                      return (
                        <tr
                          key={a.id}
                          onClick={canCharge ? () => { setPaymentDrawerBooking(a); setPaymentDrawerOpen(true); } : undefined}
                          style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : "none", cursor: canCharge ? "pointer" : "default" }}
                          onMouseEnter={canCharge ? e => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; } : undefined}
                          onMouseLeave={canCharge ? e => { (e.currentTarget as HTMLElement).style.background = ""; } : undefined}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <p style={{ fontWeight: 600, color: N, fontSize: 14, margin: 0 }}>{a.customer_name ?? "-"}</p>
                            {a.customer_phone && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>{a.customer_phone}</p>}
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 14, color: "#374151" }}>{a.service_name ?? "-"}</td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" }}>
                            {a.appointment_at
                              ? new Date(a.appointment_at.substring(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
                              : "-"}
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
                            {inv ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: G }}>{inv.invoice_number}</span>
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>· Invoiced</span>
                              </div>
                            ) : canCharge ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setPaymentDrawerBooking(a); setPaymentDrawerOpen(true); }}
                                style={{
                                  padding: "7px 14px", borderRadius: 10,
                                  background: G, color: "#fff", border: "none",
                                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                                  fontFamily: "'Bricolage Grotesque', sans-serif",
                                }}
                              >
                                💳 Collect Payment
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                            {a.status === "completed" && (
                              <button
                                onClick={() => markNoShow(a.id)}
                                disabled={markingNoShow === a.id}
                                style={{
                                  padding: "6px 12px", borderRadius: 8, border: "1px solid #FECACA",
                                  background: markingNoShow === a.id ? "#F9FAFB" : "#FEF2F2",
                                  color: "#DC2626", fontFamily: "Inter, sans-serif", fontSize: 12,
                                  fontWeight: 600, cursor: markingNoShow === a.id ? "not-allowed" : "pointer",
                                  display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
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
            );
          })()}
        </>
      )}

      {/* ── WAITLIST SUB-TAB ── */}
      {activeTab === "waitlist" && (() => {
        const activeCount = waitlistEntries.filter(e => e.status === "waiting" || e.status === "notified").length;
        const byTime = waitlistEntries.reduce<Record<string, WaitlistEntry[]>>((acc, e) => {
          if (!acc[e.requested_time]) acc[e.requested_time] = [];
          acc[e.requested_time].push(e);
          return acc;
        }, {});
        return (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <input type="date" value={waitlistDate} onChange={e => setWaitlistDate(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontFamily: "Inter, sans-serif", fontSize: 14, color: N, background: "#fff", outline: "none", cursor: "pointer" }} />
              <div style={{ background: activeCount > 0 ? `${G}15` : "#F7F8FA", color: activeCount > 0 ? G : "#9CA3AF", borderRadius: 9999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>
                {activeCount > 0 ? `${activeCount} active` : "No active entries"}
              </div>
              <span style={{ fontSize: 13, color: "#6B7280" }}>Customers are automatically notified when a booking is cancelled.</span>
            </div>

            {waitlistLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
              </div>
            ) : waitlistEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#F7F8FA", borderRadius: 16, border: "1px dashed #E5E7EB" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#9CA3AF", margin: 0 }}>No waitlist entries for this date.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b)).map(([time, slotEntries]) => (
                  <div key={time} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E7EB", background: "#F7F8FA", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: N }}>{time}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                        {slotEntries.filter(e => e.status === "waiting" || e.status === "notified").length} waiting
                      </span>
                    </div>
                    <div>
                      {slotEntries.map((entry, idx) => {
                        const s = WAITLIST_STATUS[entry.status] ?? WAITLIST_STATUS.waiting;
                        const isActive = entry.status === "waiting" || entry.status === "notified";
                        const expiresAt = entry.expires_at ? new Date(entry.expires_at) : null;
                        const windowExpired = expiresAt ? expiresAt < new Date() : false;
                        return (
                          <div key={entry.id} style={{ padding: "14px 20px", borderBottom: idx < slotEntries.length - 1 ? "1px solid #E5E7EB" : "none", display: "flex", alignItems: "center", gap: 14, opacity: isActive ? 1 : 0.6 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: isActive ? G : "#E5E7EB", color: isActive ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {entry.position}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{entry.customer_name}</div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                                <span>{entry.customer_phone}</span>
                                {entry.service_name && <span>· {entry.service_name}</span>}
                              </div>
                            </div>
                            {entry.status === "notified" && expiresAt && !windowExpired && (
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#D97706", background: "#FEF3C7", borderRadius: 8, padding: "4px 8px", flexShrink: 0 }}>
                                ⏰ expires {expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                            <div style={{ background: s.bg, color: s.color, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{s.label}</div>
                            {isActive && (
                              <button onClick={() => cancelWaitlistEntry(entry.id)} disabled={waitlistCancelling === entry.id}
                                style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#6B7280", cursor: "pointer", flexShrink: 0 }}>
                                {waitlistCancelling === entry.id ? "…" : "Remove"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* ── INVOICES SUB-TAB ── */}
      {activeTab === "invoices" && (() => {
        const now       = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const thisMonth  = allInvoices.filter(inv => inv.issued_at.substring(0, 10) >= monthStart);
        const totalRev   = thisMonth.reduce((s, inv) => s + Number(inv.total), 0);
        const byPM       = ["cash","credit","bit","paybox"].map(pm => ({
          pm, label: PAYMENT_LABELS[pm],
          amount: thisMonth.filter(i => i.payment_method === pm).reduce((s,i) => s + Number(i.total), 0),
          count:  thisMonth.filter(i => i.payment_method === pm).length,
        }));
        const filtered = allInvoices.filter(inv => {
          const d = inv.issued_at.substring(0, 10);
          if (invDateFrom && d < invDateFrom) return false;
          if (invDateTo   && d > invDateTo)   return false;
          if (invPM !== "all" && inv.payment_method !== invPM) return false;
          return true;
        });
        const hasFilters = invDateFrom || invDateTo || invPM !== "all";
        const GREY = "#F7F8FA";
        return (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>Invoices & Receipts</h2>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: "3px 0 0" }}>Financial document history</p>
              </div>
              <button onClick={() => exportInvoicesCSV(filtered, businessName, invDateFrom || undefined, invDateTo || undefined)} disabled={filtered.length === 0}
                style={{ padding: "9px 18px", borderRadius: 10, background: filtered.length === 0 ? GREY : `${G}18`, color: filtered.length === 0 ? "#9CA3AF" : G, border: `1px solid ${filtered.length === 0 ? "#E5E7EB" : G}`, fontSize: 13, fontWeight: 600, cursor: filtered.length === 0 ? "not-allowed" : "pointer" }}>
                ⬇ Export CSV
              </button>
            </div>

            {/* Summary cards */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderLeft: `4px solid ${G}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Total Revenue (This Month)</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: G }}>₪{totalRev.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{thisMonth.length} documents this month</div>
              </div>
              {byPM.map(({ pm, label, amount, count }) => (
                <div key={pm} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>₪{amount.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{count} documents</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>Month:</label>
                <input type="month" value={invMonth} onChange={e => setInvMonth(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: N, outline: "none" }} />
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>or</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>From:</label>
                <input type="date" value={invDateFrom} onChange={e => { setInvDateFrom(e.target.value); setInvMonth(""); }}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: N, outline: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>To:</label>
                <input type="date" value={invDateTo} onChange={e => { setInvDateTo(e.target.value); setInvMonth(""); }}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: N, outline: "none" }} />
              </div>
              <select value={invPM} onChange={e => setInvPM(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: N, outline: "none", background: "#fff" }}>
                <option value="all">All payment methods</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit Card</option>
                <option value="bit">Bit</option>
                <option value="paybox">Paybox</option>
              </select>
              {hasFilters && (
                <button onClick={() => { setInvMonth(""); setInvDateFrom(""); setInvDateTo(""); setInvPM("all"); }}
                  style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", fontSize: 13, color: "#9CA3AF", cursor: "pointer" }}>
                  Clear ✕
                </button>
              )}
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: "auto" }}>{filtered.length} documents</span>
            </div>

            {/* Table */}
            {invLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", color: "#9CA3AF", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, color: N, fontWeight: 600, marginBottom: 6 }}>No documents yet</div>
                <div style={{ fontSize: 13 }}>Documents appear here after recording a payment in the History tab</div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680, fontFamily: "Inter, sans-serif" }}>
                    <thead>
                      <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
                        <th style={{ padding: "11px 14px", width: 40 }}>
                          <input type="checkbox" checked={filtered.length > 0 && filtered.filter(i => i.pdf_storage_path).every(i => invSelected.has(i.id))}
                            onChange={() => {
                              const withPdf = filtered.filter(i => i.pdf_storage_path).map(i => i.id);
                              const allChk = withPdf.every(id => invSelected.has(id));
                              setInvSelected(allChk ? new Set() : new Set(withPdf));
                            }}
                            style={{ cursor: "pointer", width: 15, height: 15 }} />
                        </th>
                        {["Invoice #","Type","Date","Customer","Service","Total","Payment",""].map(h => (
                          <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv, i) => (
                        <tr key={inv.id} style={{ borderTop: i > 0 ? "1px solid #F3F4F6" : "none" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GREY; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                          <td style={{ padding: "12px 14px" }} onClick={e => e.stopPropagation()}>
                            {inv.pdf_storage_path ? (
                              <input type="checkbox" checked={invSelected.has(inv.id)} onChange={() => {
                                const n = new Set(invSelected);
                                if (n.has(inv.id)) n.delete(inv.id); else n.add(inv.id);
                                setInvSelected(n);
                              }} style={{ cursor: "pointer", width: 15, height: 15 }} />
                            ) : <span style={{ display: "inline-block", width: 15 }} />}
                          </td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: N }}>{inv.invoice_number}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ padding: "3px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: inv.document_type === "heshbonit_mas" ? `${G}15` : "#EEF2FF", color: inv.document_type === "heshbonit_mas" ? G : "#6366F1" }}>
                              {inv.document_type === "heshbonit_mas" ? "Tax Invoice" : "Receipt"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" as const }}>{new Date(inv.issued_at).toLocaleDateString("en-GB")}</td>
                          <td style={{ padding: "12px 14px", fontSize: 13, color: N, fontWeight: 500 }}>{inv.customer_name}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "#9CA3AF", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{inv.service_description}</td>
                          <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 700, color: N, whiteSpace: "nowrap" as const }}>₪{Number(inv.total).toFixed(2)}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ padding: "3px 8px", borderRadius: 9999, background: "#F3F4F6", color: "#374151", fontSize: 11, fontWeight: 600 }}>{PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {inv.pdf_storage_path ? (
                              <button onClick={async () => {
                                setInvDlId(inv.id);
                                try {
                                  const token = await getAuthToken();
                                  const res = await fetch(`/api/invoices/${inv.id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                  if (res.ok) { const { url } = await res.json(); window.open(url, "_blank"); }
                                } finally { setInvDlId(null); }
                              }} disabled={invDlId === inv.id}
                                style={{ padding: "6px 12px", borderRadius: 8, background: GREY, color: N, border: "1px solid #E5E7EB", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                                {invDlId === inv.id ? "…" : "⬇ PDF"}
                              </button>
                            ) : <span style={{ fontSize: 11, color: "#9CA3AF" }}>No PDF</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invSelected.size > 0 && (
                  <div style={{ padding: "12px 20px", borderTop: "1px solid #E5E7EB", background: "#F9FAFB", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{invSelected.size} selected</span>
                    <button disabled={invBulkDl} onClick={async () => {
                      setInvBulkDl(true);
                      try {
                        const token = await getAuthToken();
                        for (const id of invSelected) {
                          const res = await fetch(`/api/invoices/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                          if (res.ok) {
                            const inv = allInvoices.find(i => i.id === id);
                            const { url } = await res.json();
                            const a = document.createElement("a");
                            a.href = url; a.download = `${inv?.invoice_number ?? id}.pdf`; a.target = "_blank"; a.click();
                            await new Promise(r => setTimeout(r, 400));
                          }
                        }
                      } finally { setInvBulkDl(false); setInvSelected(new Set()); }
                    }} style={{ padding: "7px 16px", borderRadius: 8, background: N, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: invBulkDl ? "not-allowed" : "pointer" }}>
                      {invBulkDl ? "Downloading…" : `⬇ Download PDFs (${invSelected.size})`}
                    </button>
                    <button onClick={() => setInvSelected(new Set())}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* Payment Drawer */}
      {paymentDrawerBooking && (
        <PaymentDrawer
          isOpen={paymentDrawerOpen}
          booking={{
            id:             paymentDrawerBooking.id,
            customer_name:  paymentDrawerBooking.customer_name,
            customer_phone: paymentDrawerBooking.customer_phone,
            service_name:   paymentDrawerBooking.service_name,
            service_price:  paymentDrawerBooking.service_price,
          }}
          businessId={businessId}
          onClose={() => setPaymentDrawerOpen(false)}
          onSuccess={() => { setPaymentDrawerOpen(false); loadHistory(); }}
        />
      )}

    </div>
  );
}
