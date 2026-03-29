"use client";

import { useState, useEffect } from "react";
import { Plus, TrendingUp, Users, Target, BarChart3 } from "lucide-react";

const G = "#00C896";
const N = "#0A0F1E";
const BG = "#F7F8FA";

type Activity = {
  id: string;
  channel: string;
  city: string;
  business_type: string;
  business_name: string;
  status: string;
  notes: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  sent:       { bg: "#F3F4F6", color: "#6B7280" },
  replied:    { bg: "#EFF6FF", color: "#3B82F6" },
  demo_booked:{ bg: "rgba(0,200,150,0.15)", color: "#059669" },
  customer:   { bg: "rgba(0,200,150,0.22)", color: "#047857" },
  no_reply:   { bg: "#F9FAFB", color: "#9CA3AF" },
  rejected:   { bg: "#FEF2F2", color: "#EF4444" },
};

const STATUS_LABELS: Record<string, string> = {
  sent:        "Sent",
  replied:     "Replied",
  demo_booked: "Demo Booked",
  customer:    "Customer",
  no_reply:    "No Reply",
  rejected:    "Rejected",
};

const emptyForm = {
  channel: "email",
  city: "",
  business_type: "barber",
  business_name: "",
  status: "sent",
  notes: "",
};

function fmtDate(ts: string) {
  try {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return "-";
  }
}

function Badge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

type GroupRow = { name: string; outreach: number; replies: number; demos: number };

function groupActivities(activities: Activity[], field: keyof Activity): GroupRow[] {
  const map: Record<string, GroupRow> = {};
  for (const a of activities) {
    const key = (a[field] as string) || "Unknown";
    if (!map[key]) map[key] = { name: key, outreach: 0, replies: 0, demos: 0 };
    map[key].outreach++;
    if (["replied", "demo_booked", "customer"].includes(a.status)) map[key].replies++;
    if (["demo_booked", "customer"].includes(a.status)) map[key].demos++;
  }
  return Object.values(map).sort((a, b) => b.outreach - a.outreach);
}

export default function GrowthIntelligencePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"channel" | "city" | "business_type">("channel");

  async function fetchActivities() {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/admin/db/outreach_activities?order=created_at.desc&limit=50"
      );
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivities();
  }, []);

  // Stats
  const total = activities.length;
  const replies = activities.filter((a) =>
    ["replied", "demo_booked", "customer"].includes(a.status)
  ).length;
  const demos = activities.filter((a) =>
    ["demo_booked", "customer"].includes(a.status)
  ).length;
  const replyRate = total > 0 ? ((replies / total) * 100).toFixed(1) : "0.0";

  const tabField: Record<typeof activeTab, keyof Activity> = {
    channel: "channel",
    city: "city",
    business_type: "business_type",
  };
  const groupRows = groupActivities(activities, tabField[activeTab]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/admin/db/outreach_activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm(emptyForm);
      setFormOpen(false);
      fetchActivities();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
    color: N,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#6B7280",
    marginBottom: 4,
    fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "32px 24px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', Inter, sans-serif", fontSize: 28, fontWeight: 700, color: N, margin: 0 }}>
            Growth Intelligence
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>
            Track outreach activity and pipeline performance
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Outreach", value: total, icon: <Users size={18} color={G} />, sub: "all activities" },
            { label: "Replies", value: replies, icon: <TrendingUp size={18} color="#3B82F6" />, sub: "replied / demo / customer" },
            { label: "Demos Booked", value: demos, icon: <Target size={18} color="#059669" />, sub: "demo booked + customers" },
            { label: "Reply Rate", value: `${replyRate}%`, icon: <BarChart3 size={18} color="#F59E0B" />, sub: "replies ÷ total" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "20px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {s.label}
                </span>
                {s.icon}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: N, fontFamily: "'Bricolage Grotesque', Inter, sans-serif", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Performance Breakdown */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 0 24px" }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', Inter, sans-serif", fontSize: 17, fontWeight: 700, color: N, margin: "0 0 16px 0" }}>
              Performance Breakdown
            </h2>
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #F3F4F6" }}>
              {(["channel", "city", "business_type"] as const).map((tab) => {
                const labels = { channel: "By Channel", city: "By City", business_type: "By Business Type" };
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "8px 18px",
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? G : "#6B7280",
                      background: "none",
                      border: "none",
                      borderBottom: active ? `2px solid ${G}` : "2px solid transparent",
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                      marginBottom: -1,
                    }}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Name", "Outreach", "Replies", "Demos", "Reply Rate %"].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 24px",
                        textAlign: col === "Name" ? "left" : "right",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                      No data yet
                    </td>
                  </tr>
                )}
                {groupRows.map((row, i) => {
                  const rr = row.outreach > 0 ? ((row.replies / row.outreach) * 100).toFixed(1) : "0.0";
                  return (
                    <tr
                      key={row.name}
                      style={{ borderTop: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}
                    >
                      <td style={{ padding: "11px 24px", fontSize: 13, fontWeight: 600, color: N, textTransform: "capitalize" }}>
                        {row.name}
                      </td>
                      <td style={{ padding: "11px 24px", fontSize: 13, color: "#374151", textAlign: "right" }}>{row.outreach}</td>
                      <td style={{ padding: "11px 24px", fontSize: 13, color: "#3B82F6", textAlign: "right", fontWeight: 600 }}>{row.replies}</td>
                      <td style={{ padding: "11px 24px", fontSize: 13, color: "#059669", textAlign: "right", fontWeight: 600 }}>{row.demos}</td>
                      <td style={{ padding: "11px 24px", fontSize: 13, color: N, textAlign: "right", fontWeight: 700 }}>{rr}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log New Activity */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 24, overflow: "hidden" }}>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", cursor: "pointer" }}
            onClick={() => setFormOpen((v) => !v)}
          >
            <h2 style={{ fontFamily: "'Bricolage Grotesque', Inter, sans-serif", fontSize: 17, fontWeight: 700, color: N, margin: 0 }}>
              Log New Activity
            </h2>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: formOpen ? "#F3F4F6" : G,
                color: formOpen ? "#374151" : "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Plus size={14} />
              {formOpen ? "Cancel" : "Log Activity"}
            </button>
          </div>

          {formOpen && (
            <form onSubmit={handleSubmit} style={{ padding: "0 24px 24px 24px", borderTop: "1px solid #F3F4F6" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
                {/* Channel */}
                <div>
                  <label style={labelStyle}>Channel</label>
                  <select
                    style={inputStyle}
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                    required
                  >
                    {["email", "instagram", "cold_call", "whatsapp", "referral"].map((v) => (
                      <option key={v} value={v}>{v.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label style={labelStyle}>City</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g. London"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                  />
                </div>

                {/* Business Type */}
                <div>
                  <label style={labelStyle}>Business Type</label>
                  <select
                    style={inputStyle}
                    value={form.business_type}
                    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                    required
                  >
                    {["barber", "salon", "restaurant", "dentist", "tattoo", "other"].map((v) => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Business Name */}
                <div>
                  <label style={labelStyle}>Business Name</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g. Classic Cuts Barbershop"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    style={inputStyle}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    required
                  >
                    {["sent", "replied", "demo_booked", "customer", "no_reply", "rejected"].map((v) => (
                      <option key={v} value={v}>{STATUS_LABELS[v] ?? v}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    style={{ ...inputStyle, resize: "vertical", minHeight: 38 }}
                    placeholder="Any context or follow-up notes…"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={1}
                  />
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: G,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 24px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {submitting ? "Logging…" : "Log Activity"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Recent Activity Table */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', Inter, sans-serif", fontSize: 17, fontWeight: 700, color: N, margin: 0 }}>
              Recent Activity
            </h2>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>Last 50 entries</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Date", "Business", "Type", "City", "Channel", "Status", "Notes"].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} style={{ padding: "28px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && activities.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "28px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                      No activities logged yet. Use the form above to log your first outreach.
                    </td>
                  </tr>
                )}
                {activities.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ borderTop: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}
                  >
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
                      {fmtDate(a.created_at)}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: N, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.business_name || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151", textTransform: "capitalize" }}>
                      {a.business_type || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>
                      {a.city || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151", textTransform: "capitalize" }}>
                      {(a.channel || "—").replace("_", " ")}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <Badge status={a.status} />
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#6B7280", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
