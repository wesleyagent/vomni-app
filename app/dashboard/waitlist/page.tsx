"use client";

import { useState, useEffect, useContext } from "react";
import { BusinessContext } from "../_context";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const MUTED = "#9CA3AF";
const GREY = "#F7F8FA";

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
  staff_name: string | null;
}

const STATUS_LABELS: Record<WaitlistStatus, { label: string; color: string; bg: string }> = {
  waiting:   { label: "Waiting",   color: "#92400E", bg: "#FEF3C7" },
  notified:  { label: "Notified",  color: "#1D4ED8", bg: "#DBEAFE" },
  confirmed: { label: "Confirmed", color: "#065F46", bg: "#D1FAE5" },
  expired:   { label: "Expired",   color: "#6B7280", bg: "#F3F4F6" },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FEE2E2" },
};

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

export default function WaitlistPage() {
  const ctx = useContext(BusinessContext);
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function loadWaitlist(d: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/waitlist?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { loadWaitlist(date); }, [date]);

  async function handleCancel(id: string) {
    if (!confirm("Remove this person from the waitlist?")) return;
    setCancelling(id);
    try {
      const res = await fetch(`/api/dashboard/waitlist?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "cancelled" as WaitlistStatus } : e));
      }
    } catch { /* ignore */ }
    setCancelling(null);
  }

  // Group by time slot
  const byTime = entries.reduce<Record<string, WaitlistEntry[]>>((acc, e) => {
    const key = e.requested_time;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const activeCount = entries.filter(e => e.status === "waiting" || e.status === "notified").length;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: "0 0 6px" }}>
          Waitlist
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: 0 }}>
          Customers waiting for slots to open up. Automatically notified when a booking is cancelled.
        </p>
      </div>

      {/* Date picker + summary */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`,
            fontFamily: "Inter, sans-serif", fontSize: 14, color: N, background: "#fff",
            outline: "none", cursor: "pointer",
          }}
        />
        <div style={{
          background: activeCount > 0 ? `${G}15` : GREY,
          color: activeCount > 0 ? G : MUTED,
          borderRadius: 9999, padding: "6px 14px",
          fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
        }}>
          {activeCount > 0 ? `${activeCount} active` : "No active entries"}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 60, borderRadius: 12, background: GREY,
              backgroundImage: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%",
            }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: GREY, borderRadius: 16, border: `1px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: MUTED, margin: 0 }}>
            No waitlist entries for this date.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b)).map(([time, slotEntries]) => (
            <div key={time} style={{
              background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16,
              overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              {/* Time header */}
              <div style={{
                padding: "14px 20px", borderBottom: `1px solid ${BORDER}`,
                background: GREY, display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: N }}>
                  {time}
                </span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>
                  {slotEntries.filter(e => e.status === "waiting" || e.status === "notified").length} waiting
                </span>
              </div>

              {/* Entries */}
              <div>
                {slotEntries.map((entry, idx) => {
                  const s = STATUS_LABELS[entry.status] ?? STATUS_LABELS.waiting;
                  const isActive = entry.status === "waiting" || entry.status === "notified";
                  const expiresAt = entry.expires_at ? new Date(entry.expires_at) : null;
                  const windowExpired = expiresAt ? expiresAt < new Date() : false;

                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: "14px 20px",
                        borderBottom: idx < slotEntries.length - 1 ? `1px solid ${BORDER}` : "none",
                        display: "flex", alignItems: "center", gap: 14,
                        opacity: isActive ? 1 : 0.6,
                      }}
                    >
                      {/* Position badge */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: isActive ? G : BORDER,
                        color: isActive ? "#fff" : MUTED,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {entry.position}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>
                          {entry.customer_name}
                        </div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED, display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                          <span>{entry.customer_phone}</span>
                          {entry.service_name && <span>· {entry.service_name}</span>}
                          {entry.staff_name && <span>· {entry.staff_name}</span>}
                        </div>
                      </div>

                      {/* Expiry timer for notified */}
                      {entry.status === "notified" && expiresAt && !windowExpired && (
                        <div style={{
                          fontFamily: "Inter, sans-serif", fontSize: 12, color: "#D97706",
                          background: "#FEF3C7", borderRadius: 8, padding: "4px 8px", flexShrink: 0,
                        }}>
                          ⏰ expires {expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}

                      {/* Status badge */}
                      <div style={{
                        background: s.bg, color: s.color,
                        borderRadius: 8, padding: "4px 10px",
                        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {s.label}
                      </div>

                      {/* Actions */}
                      {isActive && (
                        <button
                          onClick={() => handleCancel(entry.id)}
                          disabled={cancelling === entry.id}
                          style={{
                            background: "none", border: `1px solid ${BORDER}`, borderRadius: 8,
                            padding: "6px 10px", fontFamily: "Inter, sans-serif", fontSize: 12,
                            color: SECONDARY, cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          {cancelling === entry.id ? "…" : "Remove"}
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
    </div>
  );
}
