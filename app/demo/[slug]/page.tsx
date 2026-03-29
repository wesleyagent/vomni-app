"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Star,
  Search,
  Copy,
  Check,
  RefreshCw,
  Shield,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  Pie,
  Cell,
} from "recharts";
import {
  kingsCutsBusiness,
  kingsCutsCustomers,
  kingsCutsFeedback,
  kingsCutsAnalytics,
  bellaVistaBusiness,
  bellaVistaCustomers,
  bellaVistaFeedback,
  bellaVistaAnalytics,
} from "@/lib/demo-data";
import type { Business, Customer, FeedbackItem, AnalyticsData } from "@/types";

const G = "#00C896";
const N = "#0A0F1E";
const AM = "#F59E0B";
const RD = "#EF4444";

// ─── Status badges (matching real dashboard exactly) ───
const STATUS_BADGES: Record<string, { label: string; style: React.CSSProperties }> = {
  scheduled:                      { label: "Scheduled",        style: { background: "#F3F4F6", color: "#6B7280" } },
  pending:                        { label: "Pending",           style: { background: "#F3F4F6", color: "#6B7280" } },
  sent:                           { label: "Sent",              style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  sms_sent:                       { label: "SMS Sent",          style: { background: "#FEF3C7", color: "#B45309" } },
  opened:                         { label: "Opened",            style: { background: "#FEF3C7", color: "#B45309" } },
  form_opened:                    { label: "Opened",            style: { background: "#FEF3C7", color: "#B45309" } },
  form_submitted:                 { label: "Rated",             style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  clicked:                        { label: "Clicked",           style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  submitted:                      { label: "Submitted",         style: { background: "rgba(0,200,150,0.12)", color: "#00A87D" } },
  redirected:                     { label: "Redirected",        style: { background: "rgba(0,200,150,0.12)", color: "#00A87D" } },
  redirected_to_google:           { label: "Sent to Google",    style: { background: "rgba(0,200,150,0.12)", color: "#00A87D" } },
  reviewed_positive:              { label: "Positive",          style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  reviewed_negative:              { label: "Negative",          style: { background: "#FEE2E2", color: "#DC2626" } },
  private_feedback:               { label: "Private Feedback",  style: { background: "#FEE2E2", color: "#DC2626" } },
  private_feedback_from_positive: { label: "Gave Feedback",     style: { background: "#FEF3C7", color: "#B45309" } },
  failed:                         { label: "Failed",            style: { background: "#FEE2E2", color: "#DC2626" } },
  opted_out:                      { label: "Opted Out",         style: { background: "#F3F4F6", color: "#9CA3AF" } },
};

const FEEDBACK_STATUS_CONFIG: Record<string, { label: string; style: React.CSSProperties }> = {
  new:         { label: "New",         style: { background: "#FEF3C7", color: "#B45309" } },
  in_progress: { label: "In Progress", style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" } },
  resolved:    { label: "Resolved",    style: { background: "#F0FDF4", color: "#166534" } },
};

// ─── Journey track (matching real customers page) ───
const JOURNEY_STEP_INDEX: Record<string, number> = {
  pending:                        0,
  scheduled:                      0,
  sms_sent:                       1,
  sent:                           1,
  form_opened:                    2,
  opened:                         2,
  form_submitted:                 3,
  reviewed_positive:              3,
  reviewed_negative:              3,
  submitted:                      3,
  clicked:                        3,
  redirected_to_google:           4,
  private_feedback:               3,
  private_feedback_from_positive: 3,
  // legacy
  redirected:                     4,
};

function JourneyTrack({ status }: { status: string }) {
  const idx    = JOURNEY_STEP_INDEX[status] ?? 0;
  const isNeg  = status === "reviewed_negative" || status === "private_feedback" || status === "private_feedback_from_positive";

  const nodes = [
    { key: "pending",              label: "Sent"                                                       },
    { key: "sms_sent",             label: "SMS"                                                        },
    { key: "form_opened",          label: "Opened"                                                     },
    { key: "form_submitted",       label: isNeg ? "Negative" : idx >= 3 ? "Reviewed" : "Review"       },
    { key: "redirected_to_google", label: "Google"                                                     },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 160 }}>
      {nodes.map((node, i) => {
        const reached  = i <= idx;
        const isActive = i === idx;
        const dotColor = reached
          ? (isNeg && i === 3 ? RD : i === 0 ? "#9CA3AF" : i === 1 ? AM : i === 2 ? AM : G)
          : "#E5E7EB";

        return (
          <div key={node.key} style={{ display: "flex", alignItems: "center", flex: i < nodes.length - 1 ? 1 : "none" }}>
            <div style={{
              width: isActive ? 12 : 8,
              height: isActive ? 12 : 8,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
              transition: "all 0.2s",
              boxShadow: isActive ? `0 0 0 3px ${dotColor}30` : "none",
            }} />
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

// ─── Star Rating Component ───
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const colors: Record<number, string> = { 1: RD, 2: "#F97316", 3: AM, 4: "#22C55E", 5: G };
  const col = colors[Math.min(5, Math.max(1, Math.round(rating)))] ?? "#6B7280";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          style={{ fill: i <= Math.round(rating) ? col : "#E5E7EB", color: i <= Math.round(rating) ? col : "#E5E7EB" }}
        />
      ))}
      <span style={{ fontSize: 12, fontWeight: 600, color: col, marginLeft: 4 }}>{rating}/5</span>
    </div>
  );
}

// ─── Copy Button ───
function DemoCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(0,200,150,0.35)", background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: copied ? G : G, cursor: "pointer" }}
    >
      {copied ? <Check size={12} style={{ color: G }} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Demo Toast ───
function useDemoToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  const ToastUI = toast ? (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 100, padding: "13px 22px", borderRadius: 12, background: N, color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
      {toast}
    </div>
  ) : null;
  return { show, ToastUI };
}

// ─── Mini bar ───
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── Star row (for hero cards) ───
function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={18} style={{ fill: i <= Math.round(rating) ? G : "#E5E7EB", color: i <= Math.round(rating) ? G : "#E5E7EB" }} />
      ))}
    </div>
  );
}

// ─── Overview Tab ───
function OverviewTab({
  customers,
  feedback,
  analytics,
  businessSlug,
}: {
  business: Business;
  customers: Customer[];
  feedback: FeedbackItem[];
  analytics: AnalyticsData[];
  businessSlug: string;
}) {
  const lastMonth      = analytics[analytics.length - 1];
  const totalSent      = customers.length;
  const smsSent        = customers.filter(c => c.reviewRequestStatus !== "scheduled" && (c.reviewRequestStatus as string) !== "pending").length;
  const completed      = customers.filter(c => ["submitted", "redirected", "redirected_to_google", "private_feedback", "private_feedback_from_positive", "form_submitted", "clicked"].includes(c.reviewRequestStatus)).length;
  const completionRate = totalSent > 0 ? Math.round((completed / totalSent) * 100) : 0;
  const avgRating      = lastMonth?.avgRating ?? 0;
  const redirected     = customers.filter(c => c.reviewRequestStatus === "redirected_to_google" || c.reviewRequestStatus === "redirected").length;
  const negativeCaught = feedback.filter(f => f.rating <= 3).length;

  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

  // Computed shield sub-stats (matching real dashboard)
  const revenueProtected       = negativeCaught * 30 * 45;
  const searchClicksProtected  = Math.min(40, negativeCaught * 10);
  const ratingWithoutVomni     = avgRating > 0 ? Math.max(1, avgRating - negativeCaught * 0.6).toFixed(1) : "-";
  const completionColor        = completionRate >= 40 ? G : completionRate >= 22 ? AM : RD;
  const ratingPct              = (avgRating / 5) * 100;

  const funnelSteps = [
    { label: "Requests Sent",    count: totalSent,   color: N,  isFirst: true },
    { label: "SMS Opened",       count: smsSent,      color: AM, pct: pct(smsSent, totalSent) },
    { label: "Form Opened",      count: completed,   color: AM, pct: pct(completed, smsSent) },
    { label: "Rating Submitted", count: completed,   color: G,  pct: 100 },
    { label: "Sent to Google",   count: redirected,  color: G,  pct: pct(redirected, completed) },
  ];

  // Industry benchmark data
  const demoBenchmarks: Record<string, { avgRating: number; topRating: number; avgReviews: number; topReviews: number; avgCompletion: number }> = {
    "kings-cuts":  { avgRating: 4.3, topRating: 4.8, avgReviews: 54,  topReviews: 180, avgCompletion: 22 },
    "bella-vista": { avgRating: 4.1, topRating: 4.7, avgReviews: 124, topReviews: 400, avgCompletion: 22 },
  };
  const bm       = demoBenchmarks[businessSlug] ?? demoBenchmarks["kings-cuts"];
  const bizLabel = businessSlug === "kings-cuts" ? "Barbershop" : "Restaurant";

  const benchmarkCards = [
    {
      title: "Average Rating",
      yours: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "-",
      yoursNum: avgRating,
      avg: `${bm.avgRating} ★`, top: `${bm.topRating} ★`,
      color: avgRating === 0 ? "#D1D5DB" : avgRating >= bm.topRating * 0.9 ? G : avgRating >= bm.avgRating ? AM : RD,
      label: avgRating === 0 ? "No data yet" : avgRating >= bm.topRating * 0.9 ? "You're above average" : avgRating >= bm.avgRating ? "You're at average" : "You're below average",
    },
    {
      title: "Review Count",
      yours: String(redirected),
      yoursNum: redirected,
      avg: String(bm.avgReviews), top: String(bm.topReviews),
      color: redirected === 0 ? "#D1D5DB" : redirected >= bm.topReviews * 0.9 ? G : redirected >= bm.avgReviews ? AM : RD,
      label: redirected === 0 ? "No data yet" : redirected >= bm.topReviews * 0.9 ? "You're above average" : redirected >= bm.avgReviews ? "You're at average" : "You're below average",
    },
    {
      title: "Completion Rate",
      yours: `${completionRate}%`,
      yoursNum: completionRate,
      avg: `${bm.avgCompletion}%`, top: "40%",
      color: completionRate >= 40 ? G : completionRate >= bm.avgCompletion ? AM : RD,
      label: completionRate >= 40 ? "You're above average" : completionRate >= bm.avgCompletion ? "You're at average" : "You're below average",
    },
  ];

  return (
    <div style={{ padding: "32px 0", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.08)} }
        .hero-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
        .funnel-step-inner:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* Page heading */}
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: N, margin: "0 0 28px" }}>
        Your Reputation, Right Now
      </h1>

      {/* Hero Metric Cards - 4 cards, 56px numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>

        {/* Card 1: Google Reviews */}
        <div className="hero-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "28px 28px 22px", transition: "box-shadow 0.2s ease, transform 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
            Google Reviews Generated
          </p>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 800, color: G, lineHeight: 1, margin: "0 0 8px" }}>
            {redirected}
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0 }}>
            reviews sent to Google so far
          </p>
        </div>

        {/* Card 2: Negative Reviews Shielded */}
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
            {avgRating > 0 ? avgRating.toFixed(1) : "-"}
          </div>
          {avgRating > 0 && <StarRow rating={avgRating} />}
          {avgRating > 0 && (
            <div style={{ marginTop: 6 }}>
              <MiniBar value={ratingPct} max={100} color={G} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>Now: {avgRating.toFixed(1)}</span>
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
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 800, color: completionColor, lineHeight: 1, margin: "0 0 8px" }}>
            {completionRate}%
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "0 0 8px" }}>
            of customers complete their review request
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>
            Industry average: {bm.avgCompletion}%
          </p>
          <MiniBar value={completionRate} max={100} color={completionColor} />
        </div>

      </div>

      {/* Review Funnel */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "24px", marginBottom: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>
            Review Funnel
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          {funnelSteps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div className="funnel-step-inner" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "16px 12px", background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", width: "100%", transition: "box-shadow 0.2s ease" }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 800, color: step.color }}>{step.count}</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 4 }}>{step.label}</span>
                  {step.pct !== undefined && !step.isFirst && (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                      {step.pct}% conversion
                    </span>
                  )}
                </div>
              </div>
              {i < funnelSteps.length - 1 && (
                <span style={{ color: "#D1D5DB", fontSize: 18, margin: "0 4px", flexShrink: 0 }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navy Shield Card */}
      {negativeCaught === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #D1D5DB", padding: "28px 32px", marginBottom: 40, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: N, margin: "0 0 6px" }}>Negative review shield is active</h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>When a customer rates 1-3 stars, Vomni captures feedback privately instead of sending them to Google. None caught yet - that&apos;s a good sign.</p>
          </div>
          <span style={{ flexShrink: 0, padding: "5px 14px", borderRadius: 9999, background: "rgba(0,200,150,0.1)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: G }}>Active</span>
        </div>
      ) : (
        <div style={{ background: N, borderRadius: 16, padding: "32px", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
            <div style={{ animation: "pulse 2.5s ease-in-out infinite", flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,200,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 8px rgba(0,200,150,0.08)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
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
              { label: "Star rating without Vomni",   value: `${ratingWithoutVomni} ★` },
              { label: "Search clicks protected",      value: `~${searchClicksProtected}%` },
            ].map(stat => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>{stat.label}</p>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: G, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Industry Benchmark Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 4px" }}>
          How you compare to other {bizLabel}
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", margin: "0 0 16px" }}>
          Based on industry research across UK service businesses
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {benchmarkCards.map(card => (
            <div key={card.title} style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>{card.title}</p>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1, margin: "0 0 10px" }}>{card.yours}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF" }}>Industry avg: <strong style={{ color: "#374151" }}>{card.avg}</strong></span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: G }}>Top performers: <strong>{card.top}</strong></span>
              </div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: card.color }}>{card.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Customers Tab ───
const CUSTOMER_STATUS_OPTIONS = [
  { value: "all",                          label: "All" },
  { value: "pending",                      label: "Pending" },
  { value: "scheduled",                    label: "Scheduled" },
  { value: "sms_sent",                     label: "SMS Sent" },
  { value: "form_opened",                  label: "Opened" },
  { value: "form_submitted",               label: "Rated" },
  { value: "redirected_to_google",         label: "Sent to Google" },
  { value: "private_feedback",             label: "Private Feedback" },
  { value: "private_feedback_from_positive", label: "Gave Feedback" },
  { value: "failed",                       label: "Failed" },
];

function CustomersTab({ customers }: { customers: Customer[]; demoToast: (msg: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return customers
      .filter((c) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!c.name.toLowerCase().includes(q) && !c.service.toLowerCase().includes(q)) return false;
        }
        if (statusFilter !== "all" && c.reviewRequestStatus !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [customers, searchQuery, statusFilter]);

  return (
    <div style={{ padding: "32px 0", maxWidth: 1300, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>
            Customers
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
            <span style={{ fontWeight: 600, color: N }}>{customers.length}</span> customer{customers.length !== 1 ? "s" : ""}
            {" · "}
            <span style={{ fontWeight: 600, color: G }}>{customers.filter(c => c.reviewRequestStatus === "redirected_to_google" || c.reviewRequestStatus === "redirected").length}</span> sent to Google
            {" · "}
            <span style={{ fontWeight: 600, color: AM }}>{customers.filter(c => c.reviewRequestStatus === "private_feedback" || c.reviewRequestStatus === "private_feedback_from_positive" || (c.reviewRequestStatus as string) === "reviewed_negative").length}</span> negative caught
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            type="text"
            placeholder="Search name, email, service…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", background: "#fff", minWidth: 180 }}
        >
          {CUSTOMER_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { color: "#9CA3AF", label: "Pending" },
          { color: AM,        label: "SMS Sent" },
          { color: AM,        label: "Form Opened" },
          { color: G,         label: "Positive / Redirected" },
          { color: RD,        label: "Negative" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB" }}>
          <p style={{ fontSize: 15, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>No customers match your search.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["Customer", "Service", "Date", "Journey", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => {
                const badge = STATUS_BADGES[c.reviewRequestStatus] ?? STATUS_BADGES.pending;
                const dateStr = c.bookingDate ? `${c.bookingDate} ${c.bookingTime ?? ""}`.trim() : "-";
                return (
                  <tr key={c.id} style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : "none" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <p style={{ fontWeight: 500, color: N, fontSize: 14, margin: 0 }}>{c.name}</p>
                      {c.email && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>{c.email}</p>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 14, color: "#374151" }}>{c.service ?? "-"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#6B7280" }}>{dateStr}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <JourneyTrack status={c.reviewRequestStatus} />
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, borderRadius: 9999, padding: "3px 10px", ...badge.style }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Feedback AI Reply Box (demo version with tone tabs) ───
function DemoAiReplyBox({ aiReplies, aiSuggestedReply }: { aiReplies?: { apologetic: string; professional: string; personal: string }; aiSuggestedReply: string }) {
  const [activeTone, setActiveTone] = useState<"apologetic" | "professional" | "personal">("apologetic");
  const [copyLabel, setCopyLabel] = useState("Copy");

  const tones = aiReplies ?? {
    apologetic:   aiSuggestedReply,
    professional: aiSuggestedReply,
    personal:     aiSuggestedReply,
  };

  function copyToClipboard() {
    navigator.clipboard.writeText(tones[activeTone]).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy"), 2000);
    });
  }

  return (
    <div style={{ marginTop: 16, padding: 16, background: "rgba(0,200,150,0.04)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: G, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          AI Suggested Reply
        </p>
        <button
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 8, background: "transparent", cursor: "default", fontFamily: "Inter, sans-serif", fontSize: 12, color: G, opacity: 0.6 }}
        >
          <RefreshCw size={11} />
          Regenerate
        </button>
      </div>

      {/* Tone selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["apologetic", "professional", "personal"] as const).map(tone => (
          <button
            key={tone}
            onClick={() => setActiveTone(tone)}
            style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid", cursor: "pointer",
              fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500,
              background: activeTone === tone ? G : "#fff",
              color:      activeTone === tone ? "#fff" : "#6B7280",
              borderColor: activeTone === tone ? G : "#E5E7EB",
              textTransform: "capitalize",
            }}
          >
            {tone}
          </button>
        ))}
      </div>

      {/* Reply text */}
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: N, lineHeight: 1.65, margin: "0 0 12px" }}>
        {tones[activeTone]}
      </p>

      {/* Copy button */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={copyToClipboard}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(0,200,150,0.35)", background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: G, cursor: "pointer" }}
        >
          <Copy size={12} />
          {copyLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Feedback Tab ───
const TOPIC_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  wait_time:   { label: "Wait Time",   bg: "#FEF3C7", color: "#B45309" },
  quality:     { label: "Quality",     bg: "#FEE2E2", color: "#DC2626" },
  staff:       { label: "Staff",       bg: "#FEE2E2", color: "#DC2626" },
  price:       { label: "Price",       bg: "#F3F4F6", color: "#6B7280" },
  cleanliness: { label: "Cleanliness", bg: "#FEF3C7", color: "#B45309" },
  other:       { label: "Other",       bg: "#F3F4F6", color: "#6B7280" },
};

// Map feedback IDs to sentiment data for demo
const DEMO_SENTIMENT: Record<string, { topic: string; urgency: string }> = {
  "fb-1": { topic: "quality", urgency: "24_hours" },
  "fb-2": { topic: "wait_time", urgency: "this_week" },
  "fb-3": { topic: "staff", urgency: "1_hour" },
  "bv-fb-1": { topic: "quality", urgency: "24_hours" },
  "bv-fb-2": { topic: "cleanliness", urgency: "this_week" },
  "bv-fb-3": { topic: "staff", urgency: "1_hour" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  "1_hour":    { label: "Respond within 1 hour",    color: RD },
  "24_hours":  { label: "Respond within 24 hours",  color: AM },
  "this_week": { label: "Respond this week",         color: "#6B7280" },
};

const FEEDBACK_FILTER_TABS = [
  { value: "all",         label: "All" },
  { value: "new",         label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
];

function FeedbackTab({ feedback, demoToast }: { feedback: FeedbackItem[]; demoToast: (msg: string) => void }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? feedback : feedback.filter(f => f.status === filter);

  return (
    <div style={{ padding: "32px 0", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>
          Feedback Inbox
        </h1>
        <p style={{ marginTop: 4, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
          {feedback.filter(f => f.status === "new").length} new · {feedback.length} total
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #E5E7EB" }}>
        {FEEDBACK_FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{ padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: filter === tab.value ? 600 : 400, color: filter === tab.value ? G : "#6B7280", borderBottom: filter === tab.value ? `2px solid ${G}` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 9999, background: filter === tab.value ? "rgba(0,200,150,0.15)" : "#F3F4F6", color: filter === tab.value ? G : "#6B7280" }}>
                {feedback.filter(f => f.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB" }}>
          <p style={{ fontSize: 15, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>No items in this category.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map(item => {
            const cfg       = FEEDBACK_STATUS_CONFIG[item.status] ?? FEEDBACK_STATUS_CONFIG.new;
            const sentiment = DEMO_SENTIMENT[item.id];
            const topicCfg  = sentiment ? (TOPIC_CONFIG[sentiment.topic] ?? TOPIC_CONFIG.other) : null;
            const urgencyCfg = sentiment ? (URGENCY_CONFIG[sentiment.urgency] ?? null) : null;

            return (
              <div key={item.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>
                      {item.customerName}
                    </p>
                    <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0", fontFamily: "Inter, sans-serif" }}>
                      {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <StarRating rating={item.rating} />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: "5px 13px", ...cfg.style }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Sentiment pills */}
                {(topicCfg || urgencyCfg) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {topicCfg && (
                      <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500, background: topicCfg.bg, color: topicCfg.color, fontFamily: "Inter, sans-serif" }}>
                        {topicCfg.label}
                      </span>
                    )}
                    {urgencyCfg && (
                      <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${urgencyCfg.color}`, color: urgencyCfg.color, fontFamily: "Inter, sans-serif" }}>
                        {urgencyCfg.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Feedback text */}
                {item.feedback && (
                  <div style={{ marginTop: 16, padding: "14px 16px", background: "#F9FAFB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                    &ldquo;{item.feedback}&rdquo;
                  </div>
                )}

                {/* AI Reply Box with tone selector */}
                {item.aiSuggestedReply && (
                  <DemoAiReplyBox aiReplies={item.aiReplies} aiSuggestedReply={item.aiSuggestedReply} />
                )}

                {/* Action buttons */}
                {item.status !== "resolved" && (
                  <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                    {item.status === "new" && (
                      <button
                        onClick={() => demoToast("This is a demo - sign up to manage your own feedback")}
                        style={{ padding: "8px 16px", border: "1px solid #E5E7EB", borderRadius: 8, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" }}
                      >
                        Mark In Progress
                      </button>
                    )}
                    <button
                      onClick={() => demoToast("This is a demo - sign up to manage your own feedback")}
                      style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: G, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer" }}
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Analytics Tab ───
const BRAND_PIE_COLORS = ["#00C896", "#00A87D", "#F59E0B", "#F97316", "#EF4444"];

function AnalyticsTab({
  analytics,
  customers,
  businessSlug,
}: {
  analytics: AnalyticsData[];
  customers: Customer[];
  businessSlug: string;
}) {
  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    customers.forEach((c) => {
      if (c.rating) counts[c.rating - 1]++;
    });
    return counts.map((count, i) => ({ name: `${i + 1} star${count !== 1 ? "s" : ""}`, value: count })).reverse();
  }, [customers]);

  const insights =
    businessSlug === "kings-cuts"
      ? [
          { type: "positive" as const,    title: "Completion Rate Above Average",   body: "Your 66% completion rate is 26pp above the 40% industry average - excellent performance." },
          { type: "warning"  as const,    title: "3 Negative Reviews Caught",       body: "3 complaints were resolved privately this month, protecting your public Google rating." },
          { type: "positive" as const,    title: "Google Review Velocity Strong",   body: "28 Google reviews this month is well above the 10+/month target for ranking momentum." },
        ]
      : [
          { type: "warning"     as const, title: "Completion Rate Below Average",   body: "Your 29% completion rate is below the 40% benchmark. You're missing review opportunities." },
          { type: "warning"     as const, title: "3 Negative Reviews Caught",       body: "3 complaints caught privately this month - each one protects your public Google rating." },
          { type: "opportunity" as const, title: "Rating Improvement Within Reach", body: "Moving from 3.7 to 4.0 stars means +20% sales and 2x traffic - every 0.1 star counts." },
        ];

  const INSIGHT_COLORS: Record<string, { title: string; bg: string; border: string }> = {
    positive:    { title: G,         bg: "rgba(0,200,150,0.05)",  border: `${G}22` },
    warning:     { title: AM,        bg: "rgba(245,158,11,0.05)", border: `${AM}22` },
    opportunity: { title: "#0D9488", bg: "rgba(13,148,136,0.05)", border: "#0D948822" },
  };

  const ChartCard = ({ title, children, tall }: { title: string; children: React.ReactNode; tall?: boolean }) => (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", height: tall ? 420 : 320 }}>
      <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, margin: "0 0 16px" }}>{title}</h3>
      <div style={{ height: "calc(100% - 40px)" }}>{children}</div>
    </div>
  );

  const activeRatingDist = ratingDist.filter(d => d.value > 0);
  const ratingTotal      = activeRatingDist.reduce((s, d) => s + d.value, 0);

  const areaData = analytics.map((d) => ({
    ...d,
    rate: d.sent > 0 ? Math.round((d.completed / d.sent) * 100) : 0,
  }));

  return (
    <div style={{ padding: "32px 0", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>Analytics</h1>
        <p style={{ marginTop: 4, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>Charts, trends, and insights</p>
      </div>

      {/* 2×2 Chart Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

        {/* Rating Distribution - interactive donut */}
        <ChartCard title="Rating Distribution" tall>
          <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 8 }}>
            <div style={{ flex: "0 0 70%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeRatingDist}
                    cx="50%" cy="50%"
                    innerRadius="52%" outerRadius="82%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    startAngle={90} endAngle={-270}
                    stroke="none"
                  >
                    {activeRatingDist.map((_, i) => (
                      <Cell key={i} fill={BRAND_PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div style={{ background: N, color: "#fff", borderRadius: 8, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                          <span style={{ fontWeight: 600 }}>{d.name}</span>
                          <span style={{ marginLeft: 8, opacity: 0.7 }}>{d.value} review{(d.value as number) !== 1 ? "s" : ""}</span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeRatingDist.map((seg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: BRAND_PIE_COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#374151", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>{seg.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: N, fontFamily: "Inter, sans-serif" }}>
                    {ratingTotal > 0 ? Math.round((seg.value / ratingTotal) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Requests Sent - Bar */}
        <ChartCard title="Requests Sent" tall>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(0,200,150,0.06)" }} />
              <Bar dataKey="sent" fill={G} radius={[4, 4, 0, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Completion Rate % - Area */}
        <ChartCard title="Completion Rate %">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="demoFill1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={G} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={G} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Completion Rate"]} />
              <Area type="monotone" dataKey="rate" stroke={G} strokeWidth={2} fill="url(#demoFill1)" dot={{ r: 3, fill: G }} name="Completion Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Google Reviews - Area */}
        <ChartCard title="Google Reviews">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics}>
              <defs>
                <linearGradient id="demoFill2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={G} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={G} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="redirected" stroke={G} strokeWidth={2} fill="url(#demoFill2)" dot={{ r: 3, fill: G }} name="Google Reviews" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* Minimal insight cards - 3 max, no action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {insights.map((ins, i) => {
          const c = INSIGHT_COLORS[ins.type] ?? INSIGHT_COLORS.opportunity;
          return (
            <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "18px 20px" }}>
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
    </div>
  );
}

// ─── Main Demo Page ───
const TABS = ["Overview", "Customers", "Feedback", "Analytics"] as const;

export default function DemoDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
  const { show: showToast, ToastUI } = useDemoToast();

  let business: Business;
  let customers: Customer[];
  let feedback: FeedbackItem[];
  let analytics: AnalyticsData[];

  if (slug === "kings-cuts") {
    business = kingsCutsBusiness;
    customers = kingsCutsCustomers;
    feedback = kingsCutsFeedback;
    analytics = kingsCutsAnalytics;
  } else if (slug === "bella-vista") {
    business = bellaVistaBusiness;
    customers = bellaVistaCustomers;
    feedback = bellaVistaFeedback;
    analytics = bellaVistaAnalytics;
  } else {
    if (typeof window !== "undefined") {
      router.push("/demo");
    }
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Sticky Demo Banner */}
      <div
        style={{ position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: N }}
      >
        <p style={{ fontSize: 14, fontWeight: 500, color: "#fff", fontFamily: "Inter, sans-serif", margin: 0 }}>
          You&apos;re viewing a demo account - {business.name}
        </p>
        <Link
          href="/signup"
          style={{ borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, background: G, color: "#fff", textDecoration: "none", fontFamily: "Inter, sans-serif" }}
        >
          Start Getting Reviews
        </Link>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/demo" style={{ fontSize: 14, color: "#6B7280", textDecoration: "none", fontFamily: "Inter, sans-serif" }}>
            &larr; Back to Demos
          </Link>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, marginTop: 8, marginBottom: 4 }}>
            {business.name}
          </h1>
          <p style={{ marginTop: 4, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>{business.address}</p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 32, borderBottom: "1px solid #E5E7EB" }}>
          <nav style={{ display: "flex", gap: 24, overflowX: "auto", marginBottom: -1 }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  whiteSpace: "nowrap",
                  paddingBottom: 12,
                  paddingTop: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? `2px solid ${G}` : "2px solid transparent",
                  fontSize: 14,
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? G : "#6B7280",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  transition: "color 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && (
          <OverviewTab business={business} customers={customers} feedback={feedback} analytics={analytics} businessSlug={slug} />
        )}
        {activeTab === "Customers" && <CustomersTab customers={customers} demoToast={showToast} />}
        {activeTab === "Feedback" && <FeedbackTab feedback={feedback} demoToast={showToast} />}
        {activeTab === "Analytics" && (
          <AnalyticsTab analytics={analytics} customers={customers} businessSlug={slug} />
        )}
      </div>

      {ToastUI}
    </div>
  );
}
