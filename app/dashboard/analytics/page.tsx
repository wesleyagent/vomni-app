"use client";

import { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";
import { useBusinessContext } from "../_context";
import { getAllBookings, computeMonthly, type DBBooking, type MonthlyPoint } from "@/lib/db";
import { db } from "@/lib/db";
import { hasFeature } from "@/lib/planFeatures";
import UpgradePrompt from "@/components/UpgradePrompt";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine,
} from "recharts";

const G  = "#00C896";
const G2 = "#00A87D";
const N  = "#0A0F1E";
const AM = "#F59E0B";
const RD = "#EF4444";

// ── Insight types ─────────────────────────────────────────────────────────────

interface InsightItem {
  type: "positive" | "warning" | "opportunity";
  title: string;
  body: string;
  action?: string;
}

function generateInsights(bookings: DBBooking[], _monthly: MonthlyPoint[]): InsightItem[] {
  const insights: InsightItem[] = [];
  const total     = bookings.length;
  const completed = bookings.filter(b => b.review_status && b.review_status !== "pending").length;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;
  const redirected = bookings.filter(b =>
    b.review_status === "redirected_to_google" || b.review_status === "redirected"
  ).length;
  const rated     = bookings.filter(b => b.rating != null);
  const avg       = rated.length > 0 ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : 0;
  const negCaught = bookings.filter(b =>
    b.review_status === "private_feedback" || b.review_status === "reviewed_negative"
  ).length;

  if (rate >= 40) {
    insights.push({ type: "positive", title: "Completion Rate Above Average", body: `Your ${rate}% rate is ${rate - 40}pp above the 40% benchmark. Vomni is working well.` });
  } else if (total > 0) {
    insights.push({ type: "warning", title: "Completion Rate Below Benchmark", body: `Your ${rate}% rate is below the 40% industry average. Check SMS delivery is active.` });
  }

  if (negCaught > 0) {
    insights.push({ type: "warning", title: `${negCaught} Negative Review${negCaught !== 1 ? "s" : ""} Caught`, body: `${negCaught} complaint${negCaught !== 1 ? "s were" : " was"} resolved privately. Your public Google rating is protected.` });
  }

  if (avg >= 4.5) {
    insights.push({ type: "positive", title: "Excellent Average Rating", body: `Your ${avg.toFixed(1)} average is above the 4.5 top-tier threshold. Keep service quality consistent.` });
  } else if (avg >= 4.0) {
    insights.push({ type: "opportunity", title: "Rating Close to Top Tier", body: `Your ${avg.toFixed(1)} average is solid. Reaching 4.5+ would boost Google Maps visibility further.` });
  } else if (avg > 0) {
    insights.push({ type: "warning", title: "Rating Below 4.0", body: `Your ${avg.toFixed(1)} average needs attention. Businesses under 4.0 lose up to 70% of search clicks.` });
  }

  if (redirected >= 10) {
    insights.push({ type: "positive", title: "Google Reviews Growing", body: `${redirected} customers redirected to Google so far. Consistent momentum is compounding your ranking.` });
  }

  return insights.slice(0, 3);
}

const INSIGHT_COLORS: Record<string, { title: string; border: string; bg: string }> = {
  positive:    { title: G,        border: G,   bg: "rgba(0,200,150,0.05)" },
  warning:     { title: AM,       border: AM,  bg: "rgba(245,158,11,0.05)" },
  opportunity: { title: "#0D9488", border: "#0D9488", bg: "rgba(13,148,136,0.05)" },
};

// ── Donut Chart (Recharts - interactive) ─────────────────────────────────────

interface DonutSegment { label: string; value: number; color: string }

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: DonutSegment }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: "#0A0F1E", color: "#fff", borderRadius: 8, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
      <span style={{ fontWeight: 600 }}>{d.name}</span>
      <span style={{ marginLeft: 8, opacity: 0.7 }}>{d.value} review{d.value !== 1 ? "s" : ""}</span>
    </div>
  );
};

function DonutChart({ data }: { data: DonutSegment[] }) {
  const active = data.filter(d => d.value > 0);
  const total  = active.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
        No ratings yet
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 8 }}>
      <div style={{ flex: "0 0 70%", height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={active}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="82%"
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {active.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {active.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#374151", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
              {seg.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0F1E", fontFamily: "Inter, sans-serif" }}>
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────

const ChartCard = ({ title, children, tall }: { title: string; children: React.ReactNode; tall?: boolean }) => (
  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", height: tall ? 420 : 320 }}>
    <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, margin: "0 0 16px" }}>{title}</h3>
    <div style={{ height: "calc(100% - 40px)" }}>{children}</div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { businessId, businessName } = useBusinessContext();
  const [bookings,    setBookings]    = useState<DBBooking[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [allFeedback, setAllFeedback] = useState<{ rating: number | null }[]>([]);
  const [aiInsights,  setAiInsights]  = useState<InsightItem[]>([]);
  const [bizPlan,     setBizPlan]     = useState<string | null>(null);
  const [ratingData, setRatingData] = useState<{
    initialRating: number | null;
    currentRating: number | null;
    initialReviewCount: number | null;
    snapshots: { snapshot_date: string; rating: number; notes: string | null }[];
  }>({ initialRating: null, currentRating: null, initialReviewCount: null, snapshots: [] });

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    Promise.all([
      getAllBookings(businessId),
      db.from("feedback").select("rating").eq("business_id", businessId),
      db.from("businesses").select("business_type, ai_insights_cache, ai_insights_cached_at, plan, initial_google_rating, current_google_rating, initial_review_count").eq("id", businessId).single(),
      db.from("rating_snapshots").select("snapshot_date, rating, notes").eq("business_id", businessId).order("snapshot_date", { ascending: true }),
    ]).then(async ([bk, fb, bizRes, snapshotRes]) => {
      setBookings(bk);
      const fbData = (fb.data ?? []) as { rating: number | null }[];
      setAllFeedback(fbData);
      const biz = bizRes.data;
      if (biz) {
        setBizPlan((biz as typeof biz & { plan?: string }).plan ?? null);
        const b = biz as typeof biz & { initial_google_rating?: number | null; current_google_rating?: number | null; initial_review_count?: number | null };
        setRatingData(prev => ({
          ...prev,
          initialRating:      b.initial_google_rating ?? null,
          currentRating:      b.current_google_rating ?? null,
          initialReviewCount: b.initial_review_count ?? null,
        }));
      }
      const snaps = (snapshotRes?.data ?? []) as { snapshot_date: string; rating: number; notes: string | null }[];
      setRatingData(prev => ({ ...prev, snapshots: snaps }));
      if (biz) {
        const now     = Date.now();
        const cachedAt = biz.ai_insights_cached_at ? new Date(biz.ai_insights_cached_at).getTime() : 0;
        if (biz.ai_insights_cache && now - cachedAt < 24 * 60 * 60 * 1000) {
          setAiInsights((biz.ai_insights_cache as InsightItem[]).slice(0, 3));
        } else if (bk.length > 0) {
          try {
            const res = await fetch("/api/ai/insights", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                businessName,
                businessType: biz.business_type ?? "service business",
                completionRate: bk.filter(b => b.review_status && b.review_status !== "pending").length > 0
                  ? Math.round((bk.filter(b => b.review_status && b.review_status !== "pending").length / bk.length) * 100) : 0,
                avgRating: fbData.filter(f => f.rating).length > 0
                  ? Math.round((fbData.reduce((s, f) => s + (f.rating ?? 0), 0) / fbData.filter(f => f.rating).length) * 10) / 10 : 0,
                totalReviews: fbData.filter(f => f.rating && f.rating >= 4).length,
                analytics: [],
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const ins  = (data.insights ?? []).slice(0, 3) as InsightItem[];
              setAiInsights(ins);
              await db.from("businesses").update({ ai_insights_cache: ins, ai_insights_cached_at: new Date().toISOString() }).eq("id", businessId);
            }
          } catch { /* silent */ }
        }
      }
      setLoading(false);
    });
  }, [businessId, businessName]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!loading && bizPlan !== null && !hasFeature(bizPlan, "analytics")) {
    return (
      <div style={{ padding: "60px 32px", maxWidth: 480, margin: "0 auto" }}>
        <UpgradePrompt
          feature="Analytics"
          description="See your rating trends, review volume, completion rates and AI insights over time."
          requiredPlan="growth"
        />
      </div>
    );
  }

  const monthly = computeMonthly(bookings);

  // Rating distribution donut
  const ratingDonut: DonutSegment[] = [
    { label: "5 stars", value: allFeedback.filter(f => f.rating === 5).length, color: G },
    { label: "4 stars", value: allFeedback.filter(f => f.rating === 4).length, color: G2 },
    { label: "3 stars", value: allFeedback.filter(f => f.rating === 3).length, color: AM },
    { label: "2 stars", value: allFeedback.filter(f => f.rating === 2).length, color: "#F97316" },
    { label: "1 star",  value: allFeedback.filter(f => f.rating === 1).length, color: RD },
  ];

  if (bookings.length === 0) {
    return (
      <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>Analytics</h1>
          <p style={{ marginTop: 4, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>Charts, trends, and insights</p>
        </div>
        <div style={{ textAlign: "center", padding: "72px 40px", background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <BarChart3 size={32} style={{ color: G }} />
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 10px" }}>
            Analytics will appear once data flows in
          </h2>
          <p style={{ maxWidth: 440, margin: "0 auto", fontSize: 15, color: "#6B7280", fontFamily: "Inter, sans-serif", lineHeight: 1.65 }}>
            You&apos;ll see review trends, rating breakdowns, and AI insights as soon as your first customer goes through the review process.
          </p>
        </div>
      </div>
    );
  }

  const displayInsights = (aiInsights.length > 0 ? aiInsights : generateInsights(bookings, monthly)).slice(0, 3);

  return (
    <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>Analytics</h1>
        <p style={{ marginTop: 4, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>Charts, trends, and insights</p>
      </div>

      {/* 2×2 Chart Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

        {/* Rating Distribution - Donut */}
        <ChartCard title="Rating Distribution" tall>
          <DonutChart data={ratingDonut} />
        </ChartCard>

        {/* Requests Sent - Bar */}
        <ChartCard title="Requests Sent" tall>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(0,200,150,0.06)" }} />
              <Bar dataKey="sent" fill={G} radius={[4,4,0,0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Completion Rate % - Area */}
        <ChartCard title="Completion Rate %">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={G} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={G} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} domain={[0,100]} tickFormatter={v => `${v}`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Completion Rate"]} />
              <Area type="monotone" dataKey="completionRate" stroke={G} strokeWidth={2} fill="url(#fillGreen)" dot={{ r: 3, fill: G }} name="Completion Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Google Reviews - Area */}
        <ChartCard title="Google Reviews">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="fillGreen2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={G} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={G} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="redirected" stroke={G} strokeWidth={2} fill="url(#fillGreen2)" dot={{ r: 3, fill: G }} name="Google Reviews" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* Rating Protection Section */}
      {ratingData.initialRating != null && (() => {
        const negCaught  = allFeedback.filter(f => f.rating != null && f.rating <= 3).length;
        const posRedirects = allFeedback.filter(f => f.rating != null && f.rating >= 4).length;
        const cur        = ratingData.currentRating ?? ratingData.initialRating!;
        const totalPublic = (ratingData.initialReviewCount ?? 0) + posRedirects;
        const unprotected = totalPublic > 0
          ? Math.max(1.0, Math.min(5.0, ((cur * totalPublic) - (negCaught * 1.5)) / (totalPublic + negCaught)))
          : cur;
        const delta = cur - (ratingData.initialRating ?? cur);

        // Build snapshot chart data: start with initial, then snapshots, then current
        const chartData = [
          { date: ratingData.snapshots[0]?.snapshot_date ?? "Start", rating: ratingData.initialRating },
          ...ratingData.snapshots.map(s => ({ date: s.snapshot_date, rating: s.rating })),
          ...(ratingData.currentRating != null ? [{ date: "Now", rating: ratingData.currentRating }] : []),
        ];

        return (
          <div style={{ marginBottom: 32 }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
              <div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>Rating Protection</h2>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>How Vomni has protected and grown your Google rating</p>
              </div>
            </div>

            {/* Summary stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Starting Rating", value: `${ratingData.initialRating?.toFixed(1)} ★`, color: N },
                { label: "Protected Rating", value: `${cur.toFixed(1)} ★`, color: G },
                { label: "Rating Change", value: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`, color: delta >= 0 ? G : "#EF4444" },
                { label: "Neg. Intercepted", value: String(negCaught), color: N },
                { label: "Google Redirects", value: String(posRedirects), color: N },
              ].map((stat, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>{stat.label}</p>
                  <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Rating trend chart (if snapshots exist) */}
            {chartData.length > 1 && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", height: 260 }}>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, margin: "0 0 16px" }}>Rating Over Time</h3>
                <div style={{ height: "calc(100% - 36px)" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[Math.max(1, (ratingData.initialRating ?? 1) - 1), 5]} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}★`} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)} ★`, "Rating"]} />
                      <Line type="monotone" dataKey="rating" stroke={G} strokeWidth={2.5} dot={{ r: 4, fill: G, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Protection estimate */}
            {negCaught > 0 && (
              <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: "#0A0F1E", margin: "0 0 6px" }}>
                  🛡️ Without Vomni, your rating could be as low as {unprotected.toFixed(1)} ★
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: 0 }}>
                  By intercepting {negCaught} negative review{negCaught !== 1 ? "s" : ""} (averaging 1.5★ each) before they reached Google, Vomni has protected your public rating by an estimated <strong style={{ color: G }}>+{(cur - unprotected).toFixed(1)} stars</strong>.
                </p>
              </div>
            )}

            {/* Monthly breakdown table */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, margin: 0 }}>Monthly Breakdown</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFAFA" }}>
                    {["Month", "Neg. Intercepted", "4–5★ Redirects", "Est. Rating Impact", "Rating at Month End"].map(h => (
                      <th key={h} style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #F3F4F6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computeMonthly(bookings).map((row, i) => {
                    const negInMonth = 0;
                    const posInMonth = row.redirected;
                    const impact = posInMonth > 0 ? `+${posInMonth} redirects` : "—";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #F9FAFB" }}>
                        <td style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, fontWeight: 500, padding: "12px 16px" }}>{row.month}</td>
                        <td style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: negInMonth > 0 ? G : "#9CA3AF", padding: "12px 16px" }}>{negInMonth > 0 ? negInMonth : "—"}</td>
                        <td style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: posInMonth > 0 ? G : "#9CA3AF", fontWeight: posInMonth > 0 ? 600 : 400, padding: "12px 16px" }}>{posInMonth > 0 ? posInMonth : "—"}</td>
                        <td style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", padding: "12px 16px" }}>{impact}</td>
                        <td style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, fontWeight: 600, padding: "12px 16px" }}>
                          {ratingData.currentRating != null ? `${ratingData.currentRating.toFixed(1)} ★` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Insight Cards - minimal, 2-3 columns */}
      {displayInsights.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {displayInsights.map((ins, i) => {
            const c = INSIGHT_COLORS[ins.type] ?? INSIGHT_COLORS.opportunity;
            return (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}22`, borderRadius: 12, padding: "18px 20px" }}>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: c.title, margin: "0 0 8px" }}>
                  {ins.title}
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
                  {ins.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
