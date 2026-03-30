"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Star, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { useBusinessContext } from "./_context";
import { getOverviewStats, getAllBookings, type DBBooking } from "@/lib/db";
import { getBenchmark } from "@/lib/benchmarks";
import { db } from "@/lib/db";
import { hasFeature } from "@/lib/planFeatures";
import UpgradePrompt from "@/components/UpgradePrompt";

const G  = "#00C896";
const N  = "#0A0F1E";
const AM = "#F59E0B";
const RD = "#EF4444";

// ── Confetti ─────────────────────────────────────────────────────────────────

function Confetti({ onClose }: { onClose: () => void }) {
  const dots = Array.from({ length: 40 }, (_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    color: ["#00C896","#0A0F1E","#F59E0B","#EF4444","#7C3AED","#F472B6"][i % 6],
    size: 6 + Math.random() * 8,
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,30,0.7)" }} onClick={onClose} />
      {dots.map((d, i) => (
        <div key={i} style={{
          position: "absolute", top: -10, left: `${d.x}%`,
          width: d.size, height: d.size, borderRadius: "50%", background: d.color,
          animation: `confettiFall ${d.duration}s ${d.delay}s ease-in forwards`,
        }} />
      ))}
      <div style={{ position: "relative", background: "#fff", borderRadius: 24, padding: "40px 48px", textAlign: "center", maxWidth: 420, margin: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: N, margin: "0 0 12px" }}>
          Milestone reached!
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.6 }}>
          Keep up the great work. Your reputation is growing.
        </p>
        <button
          onClick={onClose}
          style={{ padding: "12px 32px", borderRadius: 10, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Brilliant, thanks!
        </button>
      </div>
    </div>
  );
}

// ── Mini bar ─────────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ── Star row ─────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={18} style={{ fill: i <= Math.round(rating) ? G : "#E5E7EB", color: i <= Math.round(rating) ? G : "#E5E7EB" }} />
      ))}
    </div>
  );
}

// ── Hero metric card ─────────────────────────────────────────────────────────

function HeroCard({ label, value, sub, pill, progress }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; pill?: React.ReactNode; progress?: React.ReactNode;
}) {
  return (
    <div className="hero-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "28px 28px 22px", transition: "box-shadow 0.2s ease, transform 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
        {label}
      </p>
      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 800, color: G, lineHeight: 1, margin: "0 0 8px" }}>
        {value}
      </div>
      {sub && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "0 0 8px" }}>{sub}</p>}
      {pill}
      {progress}
    </div>
  );
}

// ── Funnel step ───────────────────────────────────────────────────────────────

function FunnelStep({ label, count, pct, color, isFirst, href, filterParam }: {
  label: string; count: number; pct?: number; color: string; isFirst?: boolean; href?: string; filterParam?: string;
}) {
  const inner = (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div className="funnel-step" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "16px 12px", background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", width: "100%", cursor: href ? "pointer" : "default", transition: "box-shadow 0.2s ease" }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 800, color }}>{count}</span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 4 }}>{label}</span>
        {pct !== undefined && !isFirst && (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
            {pct}% conversion
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={`${href}?status=${filterParam ?? ""}`} style={{ flex: 1, textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return <div style={{ flex: 1 }}>{inner}</div>;
}

// ── Benchmark bar ─────────────────────────────────────────────────────────────

function BenchmarkBar({ label, yours, avg, top, unit = "" }: { label: string; yours: number; avg: number; top: number; unit?: string }) {
  const maxVal = Math.max(yours, avg, top, 1);
  const yoursPct = (yours / maxVal) * 100;
  const avgPct   = (avg   / maxVal) * 100;
  const topPct   = (top   / maxVal) * 100;

  const yourColor = yours >= top * 0.9 ? G : yours >= avg ? AM : RD;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: yourColor }}>
          {yours}{unit}
        </span>
      </div>
      <div style={{ position: "relative", height: 8, background: "#F3F4F6", borderRadius: 99 }}>
        {/* Top performer line */}
        <div style={{ position: "absolute", left: `${topPct}%`, top: -4, bottom: -4, width: 2, background: G, opacity: 0.4, borderRadius: 1 }} />
        {/* Avg line */}
        <div style={{ position: "absolute", left: `${avgPct}%`, top: -4, bottom: -4, width: 2, background: AM, opacity: 0.5, borderRadius: 1 }} />
        {/* Yours bar */}
        <div style={{ height: "100%", width: `${yoursPct}%`, background: yourColor, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 5 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>
          Industry avg: {avg}{unit}
        </span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: G }}>
          Top performers: {top}{unit}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const { businessId, businessName } = useBusinessContext();

  const [stats,        setStats]        = useState<Awaited<ReturnType<typeof getOverviewStats>> | null>(null);
  const [allBookings,  setAllBookings]  = useState<DBBooking[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [bizType,      setBizType]      = useState<string | null>(null);
  const [startRating,  setStartRating]  = useState<number | null>(null);
  const [bizPlan,      setBizPlan]      = useState<string | null>(null);
  const [feedbackRows, setFeedbackRows] = useState<{ rating: number; created_at: string }[]>([]);
  const [velocity, setVelocity]         = useState<{ used: number; cap: number } | null>(null);
  const [ratingProtection, setRatingProtection] = useState<{
    initialRating: number | null;
    currentRating: number | null;
    initialReviewCount: number | null;
  }>({ initialRating: null, currentRating: null, initialReviewCount: null });

  const loadData = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }

    const [s, bk, fbRes] = await Promise.all([
      getOverviewStats(businessId),
      getAllBookings(businessId),
      db.from("feedback").select("rating, created_at").eq("business_id", businessId),
    ]);
    setStats(s);
    setAllBookings(bk);
    setFeedbackRows((fbRes.data ?? []) as { rating: number; created_at: string }[]);

    // Get business type + starting_rating + plan
    const { data: biz } = await db.from("businesses")
      .select("business_type, starting_rating, plan, weekly_google_redirects, weekly_redirect_cap")
      .eq("id", businessId)
      .single();

    if (biz) {
      setBizType(biz.business_type);
      setStartRating(biz.starting_rating);
      setBizPlan((biz as typeof biz & { plan?: string }).plan ?? null);
      const biz2 = biz as typeof biz & { weekly_google_redirects?: number; weekly_redirect_cap?: number };
      if (biz2.weekly_redirect_cap != null) {
        setVelocity({ used: biz2.weekly_google_redirects ?? 0, cap: biz2.weekly_redirect_cap });
      }
      const biz3 = biz as typeof biz & { initial_google_rating?: number | null; current_google_rating?: number | null; initial_review_count?: number | null };
      setRatingProtection({
        initialRating:      biz3.initial_google_rating ?? null,
        currentRating:      biz3.current_google_rating ?? null,
        initialReviewCount: biz3.initial_review_count ?? null,
      });
    }

    // Check milestones
    setLoading(false);
  }, [businessId, businessName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N }}>Welcome to Vomni!</h2>
          <Link href="/dashboard/settings" style={{ marginTop: 24, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", background: G, textDecoration: "none" }}>
            Go to Settings <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const s = stats!;
  const benchmark = getBenchmark(bizType);

  // Funnel data
  const total       = allBookings.length;
  const smsSent     = allBookings.filter(b => b.review_status && b.review_status !== "pending").length;
  const feedbackCount = feedbackRows.length;
  const negFeedback   = feedbackRows.filter(f => f.rating <= 3).length;
  const posFeedback   = feedbackRows.filter(f => f.rating >= 4).length;
  // Form opened = all who completed feedback form; Rating submitted = same
  // Statuses written by the native /r/[id] flow
  const RATED_STATUSES = ["form_submitted","redirected_to_google","private_feedback","private_feedback_from_positive","reviewed_positive","reviewed_negative","redirected"];
  const OPENED_STATUSES = ["form_opened", ...RATED_STATUSES];
  const formOpened  = allBookings.filter(b => OPENED_STATUSES.includes(b.review_status ?? "")).length;
  const rated       = allBookings.filter(b => RATED_STATUSES.includes(b.review_status ?? "")).length;
  const redirected  = Math.max(
    allBookings.filter(b => b.review_status === "redirected_to_google" || b.review_status === "redirected").length,
    posFeedback
  );

  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

  // Shield impact stats
  const negativeCaught = s.negativeCaught;
  const revenueProtected = negativeCaught * 30 * 45;
  const searchClicksProtected = Math.min(40, negativeCaught * 10);
  const ratingWithoutVomni = (() => {
    const ratedRows = allBookings.filter(b => b.rating != null);
    if (negativeCaught === 0 || ratedRows.length === 0) return s.avgRating;
    const totalRating = ratedRows.reduce((sum, b) => sum + (b.rating ?? 0), 0);
    const simulatedTotal = totalRating + negativeCaught * 1;
    return Math.round((simulatedTotal / (ratedRows.length + negativeCaught)) * 10) / 10;
  })();

  // Completion rate color vs benchmark
  const completionColor = s.completionRate >= benchmark.avgCompletionRate ? G : s.completionRate >= benchmark.avgCompletionRate * 0.75 ? AM : RD;

  // Rating progress toward 5.0
  const ratingPct = (s.avgRating / 5) * 100;
  const startingPct = startRating ? ((startRating / 5) * 100) : ratingPct;


  return (
    <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.08)} }
        @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
        .skeleton { background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size: 400px; animation: shimmer 1.4s ease infinite; border-radius: 8px; }
        .hero-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
        .funnel-step:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* Page header with last updated */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: N, margin: 0 }}>Your Reputation, Right Now</h1>
        </div>
      </div>

      {/* Empty state - no bookings at all */}
      {total === 0 && (
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: "56px 40px", marginBottom: 32, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" stroke="#00C896" strokeWidth="2.5" strokeDasharray="4 3"/>
              <path d="M18 10v8l5 3" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 10px" }}>
            Your dashboard is ready - waiting for your first booking
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#6B7280", maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.6 }}>
            Once your first customer is added, you'll see your Google reviews, rating, and funnel stats appear here automatically.
          </p>
          <Link
            href="/dashboard/settings"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: G, color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
          >
            Check your settings <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Section 1: Hero Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>

        {/* Card 1: Google Reviews */}
        <HeroCard
          label="Google Reviews Generated"
          value={total === 0 ? <span style={{ color: "#D1D5DB" }}>-</span> : redirected}
          sub={total === 0 ? <span style={{ color: "#D1D5DB", fontSize: 12 }}>no bookings yet</span> : "reviews sent to Google so far"}
        />

        {/* Card 2: Negative Shielded */}
        <div className="hero-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "28px 28px 22px", transition: "box-shadow 0.2s ease, transform 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
            Negative Reviews Shielded
          </p>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 800, color: negativeCaught > 0 ? N : "#D1D5DB", lineHeight: 1, margin: "0 0 8px" }}>
            {negativeCaught > 0 ? negativeCaught : "-"}
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: negativeCaught > 0 ? "#6B7280" : "#9CA3AF", margin: "0 0 8px" }}>
            {negativeCaught > 0 ? "complaints caught before going public" : "none caught yet - you're doing great"}
          </p>
          {negativeCaught > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, background: "rgba(0,200,150,0.1)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: G }}>
              <Shield size={12} /> Protected from Google
            </span>
          )}
        </div>

        {/* Card 3: Average Rating */}
        <div className="hero-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "28px 28px 22px", transition: "box-shadow 0.2s ease, transform 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
            Average Rating
          </p>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 800, color: G, lineHeight: 1, margin: "0 0 8px" }}>
            {s.avgRating > 0 ? s.avgRating.toFixed(1) : "-"}
          </div>
          {s.avgRating > 0 && <StarRow rating={s.avgRating} />}
          {startRating && s.avgRating > startRating && (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: G, marginTop: 6 }}>
              +{(s.avgRating - startRating).toFixed(1)} stars since joining Vomni
            </p>
          )}
          {s.avgRating > 0 && (
            <div>
              <MiniBar value={ratingPct} max={100} color={G} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>Now: {s.avgRating.toFixed(1)}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>Goal: 5.0</span>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Completion Rate */}
        <div className="hero-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "28px 28px 22px", transition: "box-shadow 0.2s ease, transform 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
            Completion Rate
          </p>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 800, color: total === 0 ? "#D1D5DB" : completionColor, lineHeight: 1, margin: "0 0 8px" }}>
            {total === 0 ? "-" : `${s.completionRate}%`}
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: total === 0 ? "#9CA3AF" : "#6B7280", margin: "0 0 8px" }}>
            {total === 0 ? "no requests sent yet" : "of customers complete their review request"}
          </p>
          {total > 0 && (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>
              Industry average: {benchmark.avgCompletionRate}%
            </p>
          )}
          {total > 0 && <MiniBar value={s.completionRate} max={100} color={completionColor} />}
        </div>
      </div>

      {/* Rating Protection Widget */}
      {ratingProtection.initialRating != null && (
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: "28px 32px", marginBottom: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={20} style={{ color: G }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: N, margin: 0 }}>Google Rating Protection</h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Your rating before and after Vomni</p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
            {/* Starting Rating */}
            <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>When you joined</p>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 800, color: N, lineHeight: 1 }}>
                {ratingProtection.initialRating?.toFixed(1)} <span style={{ fontSize: 16, color: "#9CA3AF" }}>★</span>
              </div>
              {ratingProtection.initialReviewCount != null && (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: "6px 0 0" }}>from {ratingProtection.initialReviewCount} reviews</p>
              )}
            </div>

            {/* Protected Rating */}
            <div style={{ background: "rgba(0,200,150,0.05)", borderRadius: 14, padding: "18px 20px", border: `1px solid rgba(0,200,150,0.2)` }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: G, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Protected today</p>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 800, color: G, lineHeight: 1 }}>
                {(ratingProtection.currentRating ?? ratingProtection.initialRating)?.toFixed(1)} <span style={{ fontSize: 16 }}>★</span>
              </div>
              {ratingProtection.currentRating != null && ratingProtection.initialRating != null && (() => {
                const delta = ratingProtection.currentRating - ratingProtection.initialRating;
                if (Math.abs(delta) < 0.05) return <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: "6px 0 0" }}>no change yet</p>;
                const up = delta > 0;
                return (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: up ? G : RD, margin: "6px 0 0", fontWeight: 600 }}>
                    {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} since joining
                  </p>
                );
              })()}
            </div>

            {/* Negative Intercepted */}
            <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Negative reviews intercepted</p>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 800, color: N, lineHeight: 1 }}>
                {negativeCaught}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: "6px 0 0" }}>kept off Google</p>
            </div>

            {/* Google Redirects */}
            <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>4–5★ redirects achieved</p>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 800, color: N, lineHeight: 1 }}>
                {redirected}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: "6px 0 0" }}>sent to Google</p>
            </div>
          </div>

          {/* Without Vomni estimate */}
          {negativeCaught > 0 && ratingProtection.currentRating != null && (
            <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: 0 }}>
                <span style={{ fontWeight: 600, color: RD }}>Without Vomni:</span>{" "}
                {(() => {
                  const cur = ratingProtection.currentRating!;
                  const totalPublic = (ratingProtection.initialReviewCount ?? 0) + redirected;
                  if (totalPublic === 0) return "Not enough data yet.";
                  const unprotected = ((cur * totalPublic) - (negativeCaught * 1.5)) / (totalPublic + negativeCaught);
                  const capped = Math.max(1.0, Math.min(5.0, unprotected));
                  return `your rating could be as low as ${capped.toFixed(1)} ★ — Vomni is protecting you by ${(cur - capped).toFixed(1)} stars.`;
                })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Velocity indicator */}
      {velocity && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <TrendingUp size={16} style={{ color: G, flexShrink: 0 }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>
            <strong>Google redirects this week:</strong>{" "}
            <span style={{ color: velocity.used >= velocity.cap ? "#EF4444" : velocity.used >= velocity.cap * 0.8 ? "#F59E0B" : G, fontWeight: 700 }}>
              {velocity.used}
            </span>
            <span style={{ color: "#9CA3AF" }}> of {velocity.cap}</span>
          </span>
          <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", maxWidth: 160 }}>
            <div style={{ height: "100%", borderRadius: 99, background: velocity.used >= velocity.cap ? "#EF4444" : velocity.used >= velocity.cap * 0.8 ? "#F59E0B" : G, width: `${Math.min(100, (velocity.used / velocity.cap) * 100)}%`, transition: "width 0.6s ease" }} />
          </div>
          {velocity.used >= velocity.cap && (
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#EF4444", fontWeight: 600 }}>Cap reached this week</span>
          )}
        </div>
      )}

      {/* Section 2: Review Funnel */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "24px", marginBottom: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>
            Review Funnel
          </h2>
        </div>
        {total === 0 ? (
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {["Requests Sent", "SMS Opened", "Form Opened", "Rating Submitted", "Sent to Google"].map((label, i) => (
              <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "center", flex: 1, padding: "16px 12px", background: "#F9FAFB", borderRadius: 12, border: "1px dashed #E5E7EB" }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: "#D1D5DB" }}>-</span>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{label}</div>
                </div>
                {i < 4 && <ArrowRight size={14} style={{ color: "#E5E7EB", flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
            <FunnelStep label="Requests Sent" count={total} isFirst color={N} href="/dashboard/customers" filterParam="pending" />
            <ArrowRight size={16} style={{ color: "#D1D5DB", flexShrink: 0 }} />
            <FunnelStep label="SMS Opened" count={smsSent} pct={pct(smsSent, total)} color={AM} href="/dashboard/customers" filterParam="sms_sent" />
            <ArrowRight size={16} style={{ color: "#D1D5DB", flexShrink: 0 }} />
            <FunnelStep label="Form Opened" count={formOpened} pct={pct(formOpened, smsSent)} color={AM} href="/dashboard/customers" filterParam="form_opened" />
            <ArrowRight size={16} style={{ color: "#D1D5DB", flexShrink: 0 }} />
            <FunnelStep label="Rating Submitted" count={rated} pct={pct(rated, formOpened)} color={G} href="/dashboard/customers" filterParam="reviewed_positive" />
            <ArrowRight size={16} style={{ color: "#D1D5DB", flexShrink: 0 }} />
            <FunnelStep label="Sent to Google" count={redirected} pct={pct(redirected, rated)} color={G} href="/dashboard/customers" filterParam="redirected" />
          </div>
        )}
      </div>

      {/* Section 3: Negative Reviews Shielded - Dark Navy Card OR Teaser */}
      {negativeCaught === 0 && total > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #D1D5DB", padding: "28px 32px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Shield size={24} style={{ color: G }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: N, margin: "0 0 6px" }}>
              Negative review shield is active
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
              When a customer rates their experience 1-3 stars, Vomni captures their feedback privately instead of sending them to Google. None have been caught yet - that&apos;s a good sign.
            </p>
          </div>
          <span style={{ flexShrink: 0, padding: "5px 14px", borderRadius: 9999, background: "rgba(0,200,150,0.1)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: G }}>
            Active
          </span>
        </div>
      )}
      {negativeCaught > 0 && (
        <div style={{ background: N, borderRadius: 16, padding: "32px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
            <div style={{ animation: "pulse 2.5s ease-in-out infinite", flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,200,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 8px rgba(0,200,150,0.08)` }}>
                <Shield size={28} style={{ color: G }} />
              </div>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                {negativeCaught} negative review{negativeCaught !== 1 ? "s" : ""} never reached Google
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                These complaints were caught privately by Vomni&apos;s system before they could affect your public rating.
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { label: "Estimated revenue protected", value: `£${revenueProtected.toLocaleString()}` },
              { label: "Star rating without Vomni", value: `${ratingWithoutVomni.toFixed(1)} ★` },
              { label: "Search clicks protected", value: `~${searchClicksProtected}%` },
            ].map(stat => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>{stat.label}</p>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: G, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Industry Benchmark Cards (AI Insights - Growth+ only) */}
      {hasFeature(bizPlan, "ai_insights") ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 4px" }}>
              How you compare to other {bizType ?? "service businesses"}
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", margin: 0 }}>
              Based on industry research across UK service businesses
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              {
                title: "Average Rating",
                yours: s.avgRating > 0 ? `${s.avgRating.toFixed(1)} ★` : "-",
                yoursNum: s.avgRating,
                avg: `${benchmark.avgRating} ★`,
                top: `${benchmark.topPerformerRating} ★`,
                color: s.avgRating === 0 ? "#D1D5DB" : s.avgRating >= benchmark.topPerformerRating * 0.9 ? G : s.avgRating >= benchmark.avgRating ? AM : RD,
                label: s.avgRating === 0 ? "No data yet" : s.avgRating >= benchmark.topPerformerRating * 0.9 ? "You're above average" : s.avgRating >= benchmark.avgRating ? "You're at average" : "You're below average",
              },
              {
                title: "Review Count",
                yours: String(redirected),
                yoursNum: redirected,
                avg: String(benchmark.avgReviewCount),
                top: String(benchmark.topPerformerReviews),
                color: redirected === 0 ? "#D1D5DB" : redirected >= benchmark.topPerformerReviews * 0.9 ? G : redirected >= benchmark.avgReviewCount ? AM : RD,
                label: redirected === 0 ? "No data yet" : redirected >= benchmark.topPerformerReviews * 0.9 ? "You're above average" : redirected >= benchmark.avgReviewCount ? "You're at average" : "You're below average",
              },
              {
                title: "Completion Rate",
                yours: total === 0 ? "-" : `${s.completionRate}%`,
                yoursNum: s.completionRate,
                avg: `${benchmark.avgCompletionRate}%`,
                top: "40%",
                color: total === 0 ? "#D1D5DB" : s.completionRate >= 40 ? G : s.completionRate >= benchmark.avgCompletionRate ? AM : RD,
                label: total === 0 ? "No data yet" : s.completionRate >= 40 ? "You're above average" : s.completionRate >= benchmark.avgCompletionRate ? "You're at average" : "You're below average",
              },
            ].map(card => (
              <div key={card.title} style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>{card.title}</p>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1, margin: "0 0 10px" }}>
                  {card.yours}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF" }}>Industry avg: <strong style={{ color: "#374151" }}>{card.avg}</strong></span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: G }}>Top performers: <strong>{card.top}</strong></span>
                </div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: card.color }}>{card.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24, maxWidth: 480 }}>
          <UpgradePrompt
            feature="AI Insights"
            description="Get AI-powered insights about your review trends, customer sentiment and what to fix first."
            requiredPlan="growth"
          />
        </div>
      )}


    </div>
  );
}
