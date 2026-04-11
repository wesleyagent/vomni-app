"use client";

import { useState, useEffect, useContext } from "react";
import { BusinessContext } from "../../_context";
import { db } from "@/lib/db";
import { currencySymbol } from "@/lib/currencyUtils";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const MUTED = "#9CA3AF";
const GREY = "#F7F8FA";

interface BookingRow {
  id: string;
  status: string | null;
  service_name: string | null;
  service_price: number | null;
  appointment_at: string | null;
  rating: number | null;
  staff_id: string | null;
  created_at: string | null;
}

interface StaffRow { id: string; name: string; }

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 24px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: color ?? N, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingAnalyticsPage() {
  const ctx = useContext(BusinessContext);
  const sym = currencySymbol(ctx?.currency ?? "ILS");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    if (ctx?.businessId) loadData();
  }, [ctx?.businessId, range]);

  async function loadData() {
    setLoading(true);
    const bizId = ctx!.businessId;
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data } = await db
      .from("bookings")
      .select("id, status, service_name, service_price, appointment_at, rating, staff_id, created_at")
      .eq("business_id", bizId)
      .gte("appointment_at", since)
      .order("appointment_at", { ascending: false });

    setBookings((data ?? []) as BookingRow[]);

    const { data: staffData } = await db
      .from("staff")
      .select("id, name")
      .eq("business_id", bizId)
      .eq("is_active", true);
    setStaff((staffData ?? []) as StaffRow[]);

    setLoading(false);
  }

  // ── Computed stats ─────────────────────────────────────────────────────────
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const completed = bookings.filter(b => b.status === "completed");
  const noShows = bookings.filter(b => b.status === "no_show");
  const cancelled = bookings.filter(b => b.status === "cancelled");
  const totalDone = confirmed.length + completed.length;

  const noShowRate = totalDone > 0 ? Math.round((noShows.length / (totalDone + noShows.length)) * 100) : 0;
  const rated = bookings.filter(b => b.rating != null);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length).toFixed(1)
    : "—";

  const revenue = [...confirmed, ...completed]
    .reduce((s, b) => s + (b.service_price ?? 0), 0);

  // Most popular service
  const serviceCounts: Record<string, number> = {};
  bookings.forEach(b => {
    if (b.service_name) serviceCounts[b.service_name] = (serviceCounts[b.service_name] ?? 0) + 1;
  });
  const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Best day of week
  const dayCounts: Record<number, number> = {};
  bookings.forEach(b => {
    if (b.appointment_at) {
      const day = new Date(b.appointment_at).getDay();
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    }
  });
  const bestDayIdx = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const bestDay = bestDayIdx ? DAY_NAMES[Number(bestDayIdx[0])] : "—";

  // Per-staff stats
  const staffStats = staff.map(s => {
    const sBookings = bookings.filter(b => b.staff_id === s.id);
    const sRated = sBookings.filter(b => b.rating != null);
    const sAvgRating = sRated.length > 0
      ? (sRated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / sRated.length).toFixed(1)
      : "—";
    const sNoShows = sBookings.filter(b => b.status === "no_show").length;
    const sDone = sBookings.filter(b => ["confirmed", "completed"].includes(b.status ?? "")).length;
    return { ...s, total: sBookings.length, avgRating: sAvgRating, noShows: sNoShows, done: sDone };
  });

  // Per-service stats
  const serviceStats = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => {
      const sRated = bookings.filter(b => b.service_name === name && b.rating != null);
      const sAvg = sRated.length > 0
        ? (sRated.reduce((s, b) => s + (b.rating ?? 0), 0) / sRated.length).toFixed(1)
        : "—";
      return { name, count, avgRating: sAvg };
    });

  // Bookings by day of week chart
  const dayData = DAY_NAMES.map((name, i) => ({ name, count: dayCounts[i] ?? 0 }));
  const maxDayCount = Math.max(...dayData.map(d => d.count), 1);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>Booking Analytics</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: "4px 0 0" }}>
            {bookings.length} bookings in the last {range === "7d" ? "7 days" : range === "30d" ? "30 days" : "90 days"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["7d", "30d", "90d"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${range === r ? G : BORDER}`,
              background: range === r ? `${G}15` : "#fff", color: range === r ? G : SECONDARY,
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Bookings" value={bookings.length} sub={`${confirmed.length} confirmed`} />
        <StatCard label="No-show Rate" value={`${noShowRate}%`} sub={`${noShows.length} no-shows`} color={noShowRate > 20 ? "#EF4444" : N} />
        <StatCard label="Avg Rating" value={avgRating} sub={`${rated.length} ratings`} color={G} />
        <StatCard label="Revenue" value={`${sym}${revenue.toLocaleString()}`} sub="confirmed + completed" color={G} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

        {/* Bookings by day of week */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 20px" }}>
            Bookings by Day
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {dayData.map(d => (
              <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", background: d.name === bestDay ? G : `${G}40`, borderRadius: 4, height: `${Math.max((d.count / maxDayCount) * 80, 4)}px`, transition: "height 0.3s" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: MUTED }}>{d.name}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, marginTop: 12 }}>
            Best day: <strong style={{ color: N }}>{bestDay}</strong>
          </div>
        </div>

        {/* Status breakdown */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 20px" }}>
            Status Breakdown
          </h2>
          {[
            { label: "Confirmed", count: confirmed.length, color: G },
            { label: "Completed", count: completed.length, color: "#3B82F6" },
            { label: "No-show", count: noShows.length, color: "#F59E0B" },
            { label: "Cancelled", count: cancelled.length, color: "#EF4444" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N }}>{item.label}</span>
              </div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>{item.count}</span>
            </div>
          ))}
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, marginTop: 8 }}>
            Top service: <strong style={{ color: N }}>{topService}</strong>
          </div>
        </div>
      </div>

      {/* Per-service table */}
      {serviceStats.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 16px" }}>
            Services
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px 24px" }}>
            {["Service", "Bookings", "Avg Rating"].map(h => (
              <div key={h} style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>{h}</div>
            ))}
            {serviceStats.map(s => (
              <div key={s.name} style={{ display: "contents" }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: N, paddingBottom: 10 }}>{s.name}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N, textAlign: "right" }}>{s.count}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: s.avgRating !== "—" ? G : MUTED, textAlign: "right" }}>
                  {s.avgRating !== "—" ? `★ ${s.avgRating}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-staff table */}
      {staffStats.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 16px" }}>
            Staff Performance
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "10px 24px" }}>
            {["Staff", "Bookings", "No-shows", "Avg Rating"].map(h => (
              <div key={h} style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>{h}</div>
            ))}
            {staffStats.map(s => (
              <div key={s.id} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: G, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{s.name[0]}</div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: N }}>{s.name}</span>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N, textAlign: "right" }}>{s.total}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: s.noShows > 2 ? "#EF4444" : N, textAlign: "right" }}>{s.noShows}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: s.avgRating !== "—" ? G : MUTED, textAlign: "right" }}>
                  {s.avgRating !== "—" ? `★ ${s.avgRating}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
