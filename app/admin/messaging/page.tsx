"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, RefreshCw, Smartphone, CheckCircle2, XCircle, DollarSign } from "lucide-react";

const G = "#00C896";
const N = "#0A0F1E";

interface MessagingStats {
  days: number;
  totals: {
    smsSent: number;
    smsFailed: number;
    waSent: number;
    waFailed: number;
    estimatedCostUsd: number;
  };
  smsTypes: Record<string, number>;
  waTypes: Record<string, number>;
  perBusiness: Array<{
    id: string;
    name: string;
    smsSent: number;
    smsFailed: number;
    waSent: number;
    waFailed: number;
    estimatedCostUsd: number;
  }>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
      padding: "20px 24px", minWidth: 140,
    }}>
      <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: color ?? N, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

export default function MessagingPage() {
  const [data, setData] = useState<MessagingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messaging?days=${days}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals;

  return (
    <div style={{ padding: "32px 40px", fontFamily: "Inter, sans-serif", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={20} style={{ color: G }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: N }}>Messaging Usage</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>SMS &amp; WhatsApp sends across all businesses</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 12px", fontSize: 13, outline: "none" }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: G, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data && (
        <div style={{ textAlign: "center", padding: 80, color: "#9CA3AF" }}>Loading…</div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
            <StatCard label="SMS Sent"       value={t!.smsSent}   sub={`${t!.smsFailed} failed`} color={N} />
            <StatCard label="WhatsApp Sent"  value={t!.waSent}    sub={`${t!.waFailed} failed`}  color="#25D366" />
            <StatCard label="Total Messages" value={t!.smsSent + t!.waSent} sub={`in ${data.days} days`} />
            <StatCard label="Est. Cost (USD)" value={`$${t!.estimatedCostUsd.toFixed(2)}`} sub="SMS $0.0079 · WA $0.005" color="#F59E0B" />
          </div>

          {/* Type breakdowns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {/* SMS types */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Smartphone size={16} style={{ color: G }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: N }}>SMS by Type</h3>
              </div>
              {Object.keys(data.smsTypes).length === 0 && (
                <p style={{ color: "#9CA3AF", fontSize: 13 }}>No SMS sends yet</p>
              )}
              {Object.entries(data.smsTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>{type}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: N }}>{count}</span>
                  </div>
                ))}
            </div>

            {/* WhatsApp types */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <MessageSquare size={16} style={{ color: "#25D366" }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: N }}>WhatsApp by Template</h3>
              </div>
              {Object.keys(data.waTypes).length === 0 && (
                <p style={{ color: "#9CA3AF", fontSize: 13 }}>No WhatsApp sends yet</p>
              )}
              {Object.entries(data.waTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>{type}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: N }}>{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Per-business table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 8 }}>
              <DollarSign size={15} style={{ color: G }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: N }}>Per-Business Usage</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Business", "SMS Sent", "SMS Failed", "WA Sent", "WA Failed", "Est. Cost"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 12, borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.perBusiness.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>No messages sent in this period</td>
                  </tr>
                )}
                {data.perBusiness.map(biz => (
                  <tr key={biz.id} style={{ borderBottom: "1px solid #F3F4F6" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "10px 16px", fontWeight: 600, color: N }}>{biz.name}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#10B981" }}>
                        <CheckCircle2 size={13} />{biz.smsSent}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {biz.smsFailed > 0
                        ? <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#EF4444" }}><XCircle size={13} />{biz.smsFailed}</span>
                        : <span style={{ color: "#D1D5DB" }}>0</span>
                      }
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#25D366" }}>
                        <CheckCircle2 size={13} />{biz.waSent}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {biz.waFailed > 0
                        ? <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#EF4444" }}><XCircle size={13} />{biz.waFailed}</span>
                        : <span style={{ color: "#D1D5DB" }}>0</span>
                      }
                    </td>
                    <td style={{ padding: "10px 16px", fontWeight: 600, color: "#F59E0B" }}>
                      ${biz.estimatedCostUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
