"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ───────────────────────────────────────────────────────────────────

interface CustomerProfile {
  id: string;
  business_id: string;
  phone: string;
  name: string | null;
  total_visits: number;
  first_visit_at: string | null;
  last_visit_at: string | null;
  avg_days_between_visits: number | null;
  predicted_next_visit_at: string | null;
  nudge_sent_at: string | null;
  nudge_count: number;
  is_lapsed: boolean;
  whatsapp_opt_in: boolean;
}

interface CrmNudge {
  id: string;
  customer_phone: string;
  nudge_type: string;
  sent_at: string;
  converted: boolean;
  converted_booking_id: string | null;
  weeks_since_last_visit: number | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [tab, setTab] = useState<"at-risk" | "lapsed" | "history">("at-risk");
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [nudges, setNudges] = useState<CrmNudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load business ID from session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      setToken(data.session.access_token);
      const email = data.session.user.email;
      if (!email) return;
      supabase.from("businesses").select("id").eq("owner_email", email).single()
        .then(({ data: biz }) => {
          if (biz) setBusinessId(biz.id);
        });
    });
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [profilesRes, nudgesRes] = await Promise.all([
      supabase.from("customer_profiles").select("*").eq("business_id", businessId).order("last_visit_at", { ascending: false }),
      supabase.from("crm_nudges").select("*").eq("business_id", businessId).order("sent_at", { ascending: false }).limit(100),
    ]);

    setProfiles((profilesRes.data ?? []) as CustomerProfile[]);
    setNudges((nudgesRes.data ?? []) as CrmNudge[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Computed stats
  const active = profiles.filter(p => !p.is_lapsed && daysSince(p.last_visit_at) !== null && (daysSince(p.last_visit_at) ?? 0) <= 60);
  const atRisk = profiles.filter(p => {
    const d = daysSince(p.last_visit_at);
    return d !== null && d >= 28 && d <= 42 && !p.is_lapsed;
  });
  const lapsed = profiles.filter(p => p.is_lapsed);
  const recentNudges = nudges.filter(n => daysSince(n.sent_at) !== null && (daysSince(n.sent_at) ?? 999) <= 30);
  const conversionRate = recentNudges.length > 0
    ? Math.round((recentNudges.filter(n => n.converted).length / recentNudges.length) * 100)
    : 0;

  // Send manual nudge
  const sendNudge = async (phone: string, type: "pattern" | "lapsed") => {
    if (!businessId || !token) return;
    setNudging(phone);
    try {
      await fetch("/api/crm/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: businessId, customer_phone: phone, nudge_type: type }),
      });
      await loadData();
    } catch (e) {
      console.error("Nudge failed:", e);
    }
    setNudging(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 16, padding: "20px 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flex: 1, minWidth: 180,
  };
  const statNum: React.CSSProperties = {
    fontSize: 32, fontWeight: 800, color: "#0A0F1E", fontFamily: "'Bricolage Grotesque', sans-serif",
  };
  const statLabel: React.CSSProperties = { fontSize: 13, color: "#6B7280", marginTop: 4 };
  const tabBtn = (t: typeof tab): React.CSSProperties => ({
    padding: "10px 20px", borderRadius: 9999, border: "none", cursor: "pointer",
    fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif",
    background: tab === t ? "#0A0F1E" : "#F3F4F6",
    color: tab === t ? "#fff" : "#6B7280",
  });
  const th: React.CSSProperties = {
    textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600,
    color: "#6B7280", borderBottom: "1px solid #E5E7EB", fontFamily: "Inter, sans-serif",
  };
  const td: React.CSSProperties = {
    padding: "12px 16px", fontSize: 14, color: "#0A0F1E", borderBottom: "1px solid #F3F4F6",
    fontFamily: "Inter, sans-serif",
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6B7280", fontFamily: "Inter, sans-serif" }}>Loading CRM data...</div>;
  }

  return (
    <div style={{ padding: "32px 24px", fontFamily: "Inter, sans-serif", maxWidth: 1200 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0A0F1E", marginBottom: 8, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
        CRM
      </h1>
      <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>
        Customer retention insights and automated nudges
      </p>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <div style={statNum}>{active.length}</div>
          <div style={statLabel}>Active customers</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "3px solid #F59E0B" }}>
          <div style={{ ...statNum, color: "#F59E0B" }}>{atRisk.length}</div>
          <div style={statLabel}>At-risk (28–42 days)</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "3px solid #EF4444" }}>
          <div style={{ ...statNum, color: "#EF4444" }}>{lapsed.length}</div>
          <div style={statLabel}>Lapsed (42+ days)</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "3px solid #00C896" }}>
          <div style={{ ...statNum, color: "#00C896" }}>{conversionRate}%</div>
          <div style={statLabel}>Nudge conversion (30d)</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={tabBtn("at-risk")} onClick={() => setTab("at-risk")}>At-Risk ({atRisk.length})</button>
        <button style={tabBtn("lapsed")} onClick={() => setTab("lapsed")}>Lapsed ({lapsed.length})</button>
        <button style={tabBtn("history")} onClick={() => setTab("history")}>Nudge History</button>
      </div>

      {/* Tables */}
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {tab === "at-risk" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Phone</th>
                <th style={th}>Last visit</th>
                <th style={th}>Avg frequency</th>
                <th style={th}>Overdue by</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#9CA3AF" }}>No at-risk customers</td></tr>
              )}
              {atRisk.map(p => {
                const days = daysSince(p.last_visit_at) ?? 0;
                const overdue = p.avg_days_between_visits ? days - p.avg_days_between_visits : null;
                const recentlyNudged = p.nudge_sent_at && daysSince(p.nudge_sent_at) !== null && (daysSince(p.nudge_sent_at) ?? 999) < 7;
                return (
                  <tr key={p.id}>
                    <td style={td}>{p.name ?? "Unknown"}</td>
                    <td style={td}>{p.phone}</td>
                    <td style={td}>{formatDate(p.last_visit_at)}</td>
                    <td style={td}>{p.avg_days_between_visits ? `${p.avg_days_between_visits}d` : "—"}</td>
                    <td style={td}>{overdue !== null && overdue > 0 ? `${overdue} days` : "—"}</td>
                    <td style={td}>
                      <button
                        disabled={!!recentlyNudged || nudging === p.phone}
                        onClick={() => sendNudge(p.phone, "pattern")}
                        style={{
                          padding: "6px 16px", borderRadius: 9999, border: "none", cursor: recentlyNudged ? "not-allowed" : "pointer",
                          background: recentlyNudged ? "#E5E7EB" : "#00C896", color: recentlyNudged ? "#9CA3AF" : "#fff",
                          fontSize: 13, fontWeight: 600,
                        }}
                      >
                        {nudging === p.phone ? "Sending..." : recentlyNudged ? "Sent" : "Send nudge"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === "lapsed" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Phone</th>
                <th style={th}>Last visit</th>
                <th style={th}>Weeks since</th>
                <th style={th}>Nudges</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lapsed.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#9CA3AF" }}>No lapsed customers</td></tr>
              )}
              {lapsed.map(p => {
                const weeks = daysSince(p.last_visit_at) !== null ? Math.floor((daysSince(p.last_visit_at) ?? 0) / 7) : 0;
                const recentlyNudged = p.nudge_sent_at && daysSince(p.nudge_sent_at) !== null && (daysSince(p.nudge_sent_at) ?? 999) < 7;
                return (
                  <tr key={p.id}>
                    <td style={td}>{p.name ?? "Unknown"}</td>
                    <td style={td}>{p.phone}</td>
                    <td style={td}>{formatDate(p.last_visit_at)}</td>
                    <td style={td}>{weeks}w</td>
                    <td style={td}>
                      <span style={{
                        background: p.nudge_count > 0 ? "#FEF3C7" : "#F3F4F6",
                        color: p.nudge_count > 0 ? "#92400E" : "#6B7280",
                        padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                      }}>
                        {p.nudge_count}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        disabled={!!recentlyNudged || nudging === p.phone || p.nudge_count >= 3}
                        onClick={() => sendNudge(p.phone, "lapsed")}
                        style={{
                          padding: "6px 16px", borderRadius: 9999, border: "none",
                          cursor: recentlyNudged || p.nudge_count >= 3 ? "not-allowed" : "pointer",
                          background: recentlyNudged || p.nudge_count >= 3 ? "#E5E7EB" : "#00C896",
                          color: recentlyNudged || p.nudge_count >= 3 ? "#9CA3AF" : "#fff",
                          fontSize: 13, fontWeight: 600,
                        }}
                      >
                        {nudging === p.phone ? "Sending..." : recentlyNudged ? "Sent" : p.nudge_count >= 3 ? "Max reached" : "Send nudge"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === "history" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Customer</th>
                <th style={th}>Type</th>
                <th style={th}>Sent</th>
                <th style={th}>Converted</th>
                <th style={th}>Booking</th>
              </tr>
            </thead>
            <tbody>
              {nudges.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#9CA3AF" }}>No nudges sent yet</td></tr>
              )}
              {nudges.map(n => {
                const cp = profiles.find(p => p.phone === n.customer_phone);
                return (
                  <tr key={n.id}>
                    <td style={td}>{cp?.name ?? n.customer_phone}</td>
                    <td style={td}>
                      <span style={{
                        background: n.nudge_type === "pattern" ? "#DBEAFE" : "#FEE2E2",
                        color: n.nudge_type === "pattern" ? "#1E40AF" : "#991B1B",
                        padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                      }}>
                        {n.nudge_type}
                      </span>
                    </td>
                    <td style={td}>{formatDate(n.sent_at)}</td>
                    <td style={td}>
                      <span style={{ color: n.converted ? "#00C896" : "#9CA3AF", fontWeight: 600 }}>
                        {n.converted ? "✓" : "✗"}
                      </span>
                    </td>
                    <td style={td}>{n.converted_booking_id ? n.converted_booking_id.slice(0, 8) + "..." : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
