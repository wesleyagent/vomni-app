"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, RefreshCw, ChevronDown, ChevronRight, Activity, DollarSign, Zap, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { getBenchmark } from "@/lib/benchmarks";

const G  = "#00C896";
const N  = "#0A0F1E";
const AM = "#F59E0B";
const RD = "#EF4444";

interface BizRow {
  id: string;
  name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  plan: string | null;
  status: string | null;
  onboarding_step: number | null;
  business_type: string | null;
  notification_email: string | null;
  created_at: string;
  onboarding_gdpr_accepted: boolean | null;
  onboarding_gdpr_accepted_at: string | null;
}

interface BizStats {
  businessId: string;
  reviewsThisMonth: number;
  completionRate: number;
  lastActivity: string | null;
}

interface FeedItem {
  id: string;
  type: "review_sent" | "negative_caught" | "booking_added";
  bizName: string;
  message: string;
  created_at: string;
}

function getPlanMonthlyValue(plan: string | null): number {
  if (plan === "starter") return 35;
  if (plan === "pro") return 149;
  if (plan === "annual") return Math.round(699 / 12); // legacy annual = growth annual
  return 79; // growth default
}

function fmtDate(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return "-"; }
}

function fmtAgo(ts: string | null) {
  if (!ts) return "Never";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtSince(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function healthColor(biz: BizRow, stats: BizStats | undefined): { color: string; label: string; reason: string } {
  if (!stats) return { color: "#9CA3AF", label: "Unknown", reason: "No data" };
  const bench = getBenchmark(biz.business_type);
  const joinedDays = Math.floor((Date.now() - new Date(biz.created_at).getTime()) / 86400000);
  const lastActivityDays = stats.lastActivity
    ? Math.floor((Date.now() - new Date(stats.lastActivity).getTime()) / 86400000)
    : 999;

  if (
    (joinedDays >= 5 && stats.reviewsThisMonth === 0) ||
    stats.completionRate < 15 ||
    lastActivityDays >= 7
  ) return { color: RD, label: "At Risk", reason: stats.completionRate < 15 ? "Completion rate < 15%" : lastActivityDays >= 7 ? "No activity in 7+ days" : "No reviews yet" };

  if (stats.completionRate < bench.avgCompletionRate || lastActivityDays > 7) {
    return { color: AM, label: "Watch", reason: "Below industry benchmark" };
  }
  return { color: G, label: "Healthy", reason: "Above benchmark" };
}

function HealthBadge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, fontFamily: "Inter, sans-serif", background: `${color}18`, color, border: `1px solid ${color}30` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

// ── Tab components ───────────────────────────────────────────────────────────

function DashboardTab({ businesses, statsMap }: { businesses: BizRow[]; statsMap: Record<string, BizStats> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sendingCheckin, setSendingCheckin] = useState<string | null>(null);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const activeThisMonth = businesses.filter(b => b.status === "active" && b.plan).length;
  const newThisMonth    = businesses.filter(b => b.created_at >= monthStart).length;
  const newLastMonth    = businesses.filter(b => b.created_at >= lastMonth && b.created_at <= lastMonthEnd).length;

  const incomeThisMonth = businesses
    .filter(b => b.status === "active" && b.plan)
    .reduce((sum, b) => sum + getPlanMonthlyValue(b.plan), 0);

  const atRisk = businesses.filter(b => {
    const s = statsMap[b.id];
    const h = healthColor(b, s);
    return h.label === "At Risk";
  });

  // Sort: red first
  const sorted = [...businesses].sort((a, b) => {
    const ha = healthColor(a, statsMap[a.id]).label;
    const hb = healthColor(b, statsMap[b.id]).label;
    if (ha === "At Risk" && hb !== "At Risk") return -1;
    if (hb === "At Risk" && ha !== "At Risk") return 1;
    return 0;
  });

  async function sendCheckin(biz: BizRow) {
    setSendingCheckin(biz.id);
    try {
      await fetch("/api/admin/send-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: biz.id, ownerName: biz.owner_name, email: biz.notification_email || biz.owner_email }),
      });
    } catch { /* silent */ }
    setSendingCheckin(null);
  }

  return (
    <div>
      {/* Top Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Paying This Month",   value: activeThisMonth, valueColor: N },
          { label: "Income This Month",   value: `£${incomeThisMonth.toLocaleString()}`, valueColor: G },
          { label: "New This Month",      value: newThisMonth,   sub: `Last month: ${newLastMonth}`, valueColor: AM },
          { label: "At Risk",             value: atRisk.length,  sub: atRisk.length > 0 ? "Need attention" : "All healthy", valueColor: atRisk.length > 0 ? RD : G },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
            <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
            <p style={{ margin: "8px 0 0", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: s.valueColor, lineHeight: 1 }}>{s.value}</p>
            {s.sub && <p style={{ margin: "6px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF" }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* At Risk Panel */}
      {atRisk.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: RD, margin: "0 0 12px" }}>
            {atRisk.length} customer{atRisk.length !== 1 ? "s" : ""} need attention
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {atRisk.map(biz => {
              const s = statsMap[biz.id];
              const h = healthColor(biz, s);
              return (
                <div key={biz.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderRadius: 10, border: "1px solid #FCA5A5" }}>
                  <div>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{biz.name}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: RD, marginLeft: 10 }}>{h.reason}</span>
                  </div>
                  <button
                    onClick={() => sendCheckin(biz)}
                    disabled={sendingCheckin === biz.id}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: RD, cursor: sendingCheckin === biz.id ? "not-allowed" : "pointer" }}
                  >
                    {sendingCheckin === biz.id ? "Sending…" : "Send check-in email"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Health Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={18} style={{ color: G }} />
          <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 600, color: N }}>Customer Health</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                {["Business", "Type", "Plan", "Joined", "Reviews/Mo", "Completion", "Last Activity", "Health", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(biz => {
                const s    = statsMap[biz.id];
                const h    = healthColor(biz, s);
                const bench = getBenchmark(biz.business_type);
                const crColor = s && s.completionRate >= bench.avgCompletionRate ? G : s && s.completionRate >= bench.avgCompletionRate * 0.75 ? AM : RD;
                const isExpanded = expanded === biz.id;

                return (
                  <>
                    <tr
                      key={biz.id}
                      onClick={() => setExpanded(isExpanded ? null : biz.id)}
                      style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer", background: isExpanded ? "#F9FAFB" : "#fff" }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: N }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <Link
                            href={`/admin/businesses/${biz.id}`}
                            onClick={e => e.stopPropagation()}
                            style={{ color: N, textDecoration: "none", fontWeight: 600, borderBottom: "1px dashed #D1D5DB" }}
                            onMouseEnter={e => (e.currentTarget.style.color = G)}
                            onMouseLeave={e => (e.currentTarget.style.color = N)}
                          >
                            {biz.name ?? "-"}
                          </Link>
                          {biz.onboarding_gdpr_accepted ? (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <title>{`GDPR accepted on ${biz.onboarding_gdpr_accepted_at ? new Date(biz.onboarding_gdpr_accepted_at).toLocaleDateString("en-GB") : "unknown date"}`}</title>
                              <path d="M8 1L2 3.5V7.5C2 11 4.5 13.5 8 15C11.5 13.5 14 11 14 7.5V3.5L8 1Z" fill="#00C896" fillOpacity="0.15" stroke="#00C896" strokeWidth="1.5"/>
                              <path d="M5.5 8L7 9.5L10.5 6" stroke="#00C896" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <title>GDPR not yet accepted</title>
                              <path d="M8 2L1.5 13H14.5L8 2Z" fill="#F59E0B" fillOpacity="0.15" stroke="#F59E0B" strokeWidth="1.5"/>
                              <path d="M8 6v3" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                              <circle cx="8" cy="11.5" r="0.75" fill="#F59E0B"/>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6B7280" }}>{biz.business_type ?? "-"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
                          background: biz.plan === "pro" ? "rgba(245,166,35,0.15)" : biz.plan === "growth" ? "rgba(0,200,150,0.12)" : "#F3F4F6",
                          color: biz.plan === "pro" ? "#F5A623" : biz.plan === "growth" ? "#00C896" : "#6B7280",
                        }}>
                          {biz.plan === "pro" ? "Pro ★" : biz.plan === "growth" ? "Growth" : biz.plan === "starter" ? "Starter" : (biz.plan ?? "-")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6B7280", whiteSpace: "nowrap" }}>{fmtSince(biz.created_at)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, color: N }}>{s?.reviewsThisMonth ?? "-"}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {s ? (
                          <span style={{ fontWeight: 700, color: crColor }}>{s.completionRate}%</span>
                        ) : "-"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{fmtAgo(s?.lastActivity ?? null)}</td>
                      <td style={{ padding: "12px 16px" }}><HealthBadge color={h.color} label={h.label} /></td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={e => { e.stopPropagation(); sendCheckin(biz); }}
                          disabled={sendingCheckin === biz.id}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #E5E7EB", background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 11, color: "#374151", cursor: sendingCheckin === biz.id ? "not-allowed" : "pointer" }}
                        >
                          {sendingCheckin === biz.id ? "Sent" : "Check-in"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${biz.id}-expanded`} style={{ borderBottom: "1px solid #E5E7EB" }}>
                        <td colSpan={9} style={{ padding: "16px 24px 20px", background: "#FAFAFA" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div>
                              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Contact</p>
                              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, margin: "0 0 4px" }}>{biz.owner_name}</p>
                              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: 0 }}>{biz.owner_email}</p>
                            </div>
                            <div>
                              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Stats</p>
                              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, margin: "0 0 4px" }}>
                                Reviews this month: <strong>{s?.reviewsThisMonth ?? 0}</strong>
                              </p>
                              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, margin: 0 }}>
                                Completion rate: <strong>{s?.completionRate ?? 0}%</strong>
                              </p>
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
        </div>
      </div>
    </div>
  );
}

function RevenueTab({ businesses }: { businesses: BizRow[] }) {
  const now = new Date();

  // Build month-by-month data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

    const newBizzes    = businesses.filter(b => new Date(b.created_at) >= d && new Date(b.created_at) <= dEnd);
    const activeBizzes = businesses.filter(b => b.status === "active" && b.plan && new Date(b.created_at) <= dEnd);
    const income       = activeBizzes.reduce((sum, b) => sum + getPlanMonthlyValue(b.plan), 0);

    return { label, newCount: newBizzes.length, cancelled: 0, total: activeBizzes.length, income };
  });

  const starterBizzes   = businesses.filter(b => b.status === "active" && b.plan === "starter");
  const growthBizzes    = businesses.filter(b => b.status === "active" && (b.plan === "growth" || b.plan === "monthly"));
  const proBizzes       = businesses.filter(b => b.status === "active" && b.plan === "pro");
  const legacyAnnual    = businesses.filter(b => b.status === "active" && b.plan === "annual");
  const totalIncome     = businesses.filter(b => b.status === "active" && b.plan).reduce((sum, b) => sum + getPlanMonthlyValue(b.plan), 0);

  return (
    <div>
      {/* This month breakdown */}
      <div style={{ background: N, borderRadius: 16, padding: "28px 32px", marginBottom: 24, display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <DollarSign size={26} style={{ color: G }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>
            Your Vomni income this month
          </p>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 54, fontWeight: 900, color: G, lineHeight: 1, letterSpacing: "-1.5px" }}>
            £{totalIncome.toLocaleString()}
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" }}>
            {starterBizzes.length + growthBizzes.length + proBizzes.length + legacyAnnual.length} paying subscribers
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 16px" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Starter</p>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, color: "#fff", fontWeight: 700, margin: 0 }}>
              {starterBizzes.length} × £35 = <span style={{ color: G }}>£{starterBizzes.length * 35}</span>
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 16px" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Growth</p>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, color: "#fff", fontWeight: 700, margin: 0 }}>
              {growthBizzes.length} × £79 = <span style={{ color: G }}>£{growthBizzes.length * 79}</span>
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 16px" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Pro</p>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, color: "#fff", fontWeight: 700, margin: 0 }}>
              {proBizzes.length} × £149 = <span style={{ color: G }}>£{proBizzes.length * 149}</span>
            </p>
          </div>
          {legacyAnnual.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 16px" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Legacy annual</p>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, color: "#fff", fontWeight: 700, margin: 0 }}>
                {legacyAnnual.length} × £{Math.round(699 / 12)} = <span style={{ color: G }}>£{legacyAnnual.length * Math.round(699 / 12)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Month by month table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB" }}>
          <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 600, color: N }}>Monthly Breakdown</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              {["Month", "New", "Total Active", "Income"].map(h => (
                <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "12px 20px", fontWeight: 500, color: N }}>{m.label}</td>
                <td style={{ padding: "12px 20px", color: m.newCount > 0 ? G : "#6B7280", fontWeight: m.newCount > 0 ? 700 : 400 }}>+{m.newCount}</td>
                <td style={{ padding: "12px 20px", color: "#374151" }}>{m.total}</td>
                <td style={{ padding: "12px 20px", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, color: N }}>£{m.income}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTab({ businesses }: { businesses: BizRow[] }) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();

    // Subscribe to real-time updates
    const channel = db.channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload) => {
        const b = businesses.find(biz => biz.id === payload.new.business_id);
        const newItem: FeedItem = {
          id: payload.new.id,
          type: payload.new.review_status === "redirected" ? "review_sent" : payload.new.review_status === "reviewed_negative" ? "negative_caught" : "booking_added",
          bizName: b?.name ?? "Unknown business",
          message: payload.new.review_status === "redirected"
            ? `${payload.new.customer_name} sent a Google review`
            : payload.new.review_status === "reviewed_negative"
            ? `${payload.new.customer_name} left private negative feedback`
            : `New booking from ${payload.new.customer_name}`,
          created_at: payload.new.created_at,
        };
        setFeed(prev => [newItem, ...prev.slice(0, 49)]);
      })
      .subscribe();

    return () => { db.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses]);

  async function loadFeed() {
    setLoading(true);
    try {
      const { data } = await db
        .from("bookings")
        .select("id, business_id, customer_name, review_status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      const items: FeedItem[] = (data ?? []).map((row: { id: string; business_id: string; customer_name: string | null; review_status: string | null; created_at: string }) => {
        const biz = businesses.find(b => b.id === row.business_id);
        return {
          id: row.id,
          type: row.review_status === "redirected" ? "review_sent" : row.review_status === "reviewed_negative" ? "negative_caught" : "booking_added",
          bizName: biz?.name ?? "Unknown",
          message: row.review_status === "redirected"
            ? `${row.customer_name ?? "Customer"} sent a Google review`
            : row.review_status === "reviewed_negative"
            ? `${row.customer_name ?? "Customer"} left private negative feedback`
            : `New booking from ${row.customer_name ?? "Customer"}`,
          created_at: row.created_at,
        };
      });
      setFeed(items);
    } catch { /* silent */ }
    setLoading(false);
  }

  const typeColor = { review_sent: G, negative_caught: RD, booking_added: "#6B7280" };
  const typeDot   = { review_sent: G, negative_caught: RD, booking_added: "#D1D5DB" };

  if (loading) return (
    <div style={{ display: "flex", height: 200, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Activity size={18} style={{ color: G }} />
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>Live Activity Feed</h2>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: G, animation: "pulse 1.5s ease-in-out infinite", display: "inline-block" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: G, textTransform: "uppercase", letterSpacing: "0.06em" }}>Live</span>
        </span>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        {feed.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF" }}>
            No activity yet. Activity will appear here as bookings come in.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {feed.map((item, idx) => (
              <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderTop: idx > 0 ? "1px solid #F9FAFB" : "none" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: typeDot[item.type], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: N, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: typeColor[item.type] }}>{item.bizName}</span> - {item.message}
                  </p>
                </div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>{fmtAgo(item.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Tab: Messages (contact submissions) ──────────────────────────────────────

interface ContactRow {
  id: string;
  name: string;
  email: string;
  business: string | null;
  message: string;
  status: string;
  created_at: string;
}

function MessagesTab() {
  const [rows, setRows]       = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db/contact_submissions?select=*&order=created_at.desc&limit=100");
      const data = res.ok ? await res.json() : [];
      setRows(data);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function markRead(id: string) {
    await fetch(`/api/admin/db/contact_submissions?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "read" }),
    });
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: "read" } : r));
  }

  const statusColor = (s: string) =>
    s === "new" ? "#F59E0B" : s === "replied" ? G : "#9CA3AF";

  if (loading) return (
    <div style={{ display: "flex", height: 200, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Mail size={18} style={{ color: G }} />
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>Contact submissions</h2>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF" }}>{rows.length} total</span>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF" }}>
            No messages yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["Name", "Email", "Business", "Date", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <>
                  <tr
                    key={row.id}
                    onClick={() => { setExpanded(e => e === row.id ? null : row.id); if (row.status === "new") markRead(row.id); }}
                    style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer", background: expanded === row.id ? "#F9FAFB" : "#fff" }}
                  >
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: N }}>{row.name}</td>
                    <td style={{ padding: "14px 16px", color: "#6B7280" }}>{row.email}</td>
                    <td style={{ padding: "14px 16px", color: "#6B7280" }}>{row.business ?? "—"}</td>
                    <td style={{ padding: "14px 16px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{fmtDate(row.created_at)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: statusColor(row.status), background: `${statusColor(row.status)}18`, padding: "3px 10px", borderRadius: 9999, textTransform: "capitalize" }}>{row.status}</span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#9CA3AF", fontSize: 12 }}>{expanded === row.id ? "▲" : "▼"}</td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-exp`}>
                      <td colSpan={6} style={{ padding: "0 16px 16px 16px", background: "#F9FAFB" }}>
                        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: 16 }}>
                          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9CA3AF" }}>Message</p>
                          <p style={{ margin: "0 0 16px", fontSize: 14, color: N, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{row.message}</p>
                          <a
                            href={`mailto:${row.email}?subject=Re: your Vomni enquiry`}
                            style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "8px 18px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                          >
                            Reply via email →
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [businesses, setBusinesses] = useState<BizRow[]>([]);
  const [statsMap,   setStatsMap]   = useState<Record<string, BizStats>>({});
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<"dashboard" | "revenue" | "activity" | "messages">("dashboard");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch("/api/admin/businesses");
      const body = await res.json();
      if (!res.ok) {
        setLoadError(`API error ${res.status}: ${body?.error ?? "unknown"}`);
        setLoading(false);
        return;
      }
      const bizzes = body as BizRow[];
      setBusinesses(bizzes);

    // Load stats for each business via admin proxy
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const statEntries = await Promise.all(bizzes.map(async biz => {
      const [monthRes, lastRes] = await Promise.all([
        fetch(`/api/admin/db/bookings?select=id,review_status,created_at&business_id=${biz.id}`),
        fetch(`/api/admin/db/bookings?select=id,review_status,created_at&business_id=${biz.id}&order=created_at.desc&limit=1`),
      ]);

      const allMonth: { review_status: string | null; created_at: string }[] = monthRes.ok ? await monthRes.json() : [];
      const lastRow:  { review_status: string | null; created_at: string }[] = lastRes.ok  ? await lastRes.json()  : [];

      // Filter to this month client-side (admin proxy doesn't support gte yet)
      const month = allMonth.filter(b => b.created_at >= monthStart);

      const reviewsThisMonth = month.filter(b => b.review_status === "redirected").length;
      const completed = month.filter(b => b.review_status && b.review_status !== "pending").length;
      const completionRate = month.length > 0 ? Math.round((completed / month.length) * 100) : 0;
      const lastActivity = lastRow[0]?.created_at ?? null;

      return [biz.id, { businessId: biz.id, reviewsThisMonth, completionRate, lastActivity }] as [string, BizStats];
    }));

      setStatsMap(Object.fromEntries(statEntries));
    } catch (err) {
      setLoadError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const TABS = [
    { key: "dashboard", label: "Dashboard", icon: Users },
    { key: "revenue",   label: "Revenue",   icon: DollarSign },
    { key: "activity",  label: "Activity",  icon: Zap },
    { key: "messages",  label: "Messages",  icon: Mail },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA", padding: "32px 24px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.08)} }`}</style>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: N, margin: 0 }}>Admin</h1>
            <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280" }}>
              {businesses.length} business{businesses.length !== 1 ? "es" : ""} registered · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "#374151", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s" }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} /> Refresh
          </button>
        </div>

        {/* Error banner */}
        {loadError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 18px", marginBottom: 20, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#DC2626" }}>
            Failed to load businesses: {loadError}
          </div>
        )}

        {/* Last 30 days at a glance - always visible */}
        {!loading && (
          <div style={{ background: N, borderRadius: 16, padding: "20px 28px", marginBottom: 28, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Last 30 days</p>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                Quick summary
              </div>
            </div>
            {[
              {
                label: "Active customers",
                value: businesses.filter(b => b.status === "active").length,
                color: G,
              },
              {
                label: "At risk",
                value: businesses.filter(b => {
                  const s = statsMap[b.id];
                  if (!s) return false;
                  const joinedDays = Math.floor((Date.now() - new Date(b.created_at).getTime()) / 86400000);
                  const lastActivityDays = s.lastActivity ? Math.floor((Date.now() - new Date(s.lastActivity).getTime()) / 86400000) : 999;
                  return (joinedDays >= 5 && s.reviewsThisMonth === 0) || s.completionRate < 15 || lastActivityDays >= 7;
                }).length,
                color: "#EF4444",
              },
              {
                label: "Monthly revenue",
                value: `£${businesses.filter(b => b.status === "active" && b.plan).reduce((sum, b) => sum + (b.plan === "annual" ? 50 : 70), 0)}`,
                color: G,
              },
              {
                label: "New this month",
                value: businesses.filter(b => b.created_at >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).length,
                color: "#F59E0B",
              },
            ].map(stat => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 20px" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "0 0 4px" }}>{stat.label}</p>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: stat.color, margin: 0, lineHeight: 1 }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E5E7EB", marginBottom: 32, background: "#fff", borderRadius: "14px 14px 0 0", border: "1px solid #E5E7EB", overflow: "hidden" }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{ padding: "16px 28px", border: "none", borderBottom: active ? `2px solid ${G}` : "2px solid transparent", background: active ? "rgba(0,200,150,0.04)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: active ? "'Bricolage Grotesque', sans-serif" : "Inter, sans-serif", fontSize: 14, fontWeight: active ? 700 : 500, color: active ? G : "#6B7280", marginBottom: -1 }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ display: "flex", height: 200, alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && <DashboardTab businesses={businesses} statsMap={statsMap} />}
            {activeTab === "revenue"   && <RevenueTab   businesses={businesses} />}
            {activeTab === "activity"  && <ActivityTab  businesses={businesses} />}
            {activeTab === "messages"  && <MessagesTab />}
          </>
        )}
      </div>
    </div>
  );
}
