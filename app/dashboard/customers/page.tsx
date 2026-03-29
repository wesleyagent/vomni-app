"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Star, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useBusinessContext } from "../_context";
import { getAllBookings, fmtDate, type DBBooking } from "@/lib/db";

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

// ── Page ───────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { businessId } = useBusinessContext();

  const [bookings,  setBookings]  = useState<DBBooking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page,      setPage]      = useState(1);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    getAllBookings(businessId).then(data => {
      setBookings(data);
      setLoading(false);
    });
  }, [businessId]);

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
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>
            Customers
          </h1>
          {bookings.length > 0 ? (
            <p style={{ marginTop: 6, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
              <span style={{ fontWeight: 600, color: N }}>{bookings.length}</span> customer{bookings.length !== 1 ? "s" : ""}
              {" · "}
              <span style={{ fontWeight: 600, color: G }}>{bookings.filter(b => b.review_status === "redirected_to_google" || b.review_status === "redirected").length}</span> sent to Google
              {" · "}
              <span style={{ fontWeight: 600, color: "#F59E0B" }}>{bookings.filter(b => b.review_status === "private_feedback" || b.review_status === "reviewed_negative").length}</span> negative caught
            </p>
          ) : (
            <p style={{ marginTop: 4, fontSize: 14, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }}>
              No customers yet
            </p>
          )}
        </div>
      </div>

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
    </div>
  );
}
