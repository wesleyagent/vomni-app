"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, MessageSquare, CheckCircle2, Clock, Copy, RefreshCw } from "lucide-react";
import { useBusinessContext } from "../_context";
import { getAllFeedback, updateFeedbackStatus, fmtDate, type DBFeedback, db } from "@/lib/db";
import { hasFeature } from "@/lib/planFeatures";
import UpgradePrompt from "@/components/UpgradePrompt";

const G  = "#00C896";
const N  = "#0A0F1E";
const AM = "#F59E0B";
const RD = "#EF4444";

const STATUS_CONFIG: Record<string, { label: string; style: React.CSSProperties; icon: React.ReactNode }> = {
  new:         { label: "New",         style: { background: "#FEF3C7", color: "#B45309"   }, icon: <MessageSquare size={12} /> },
  in_progress: { label: "In Progress", style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" }, icon: <Clock size={12} /> },
  resolved:    { label: "Resolved",    style: { background: "#F0FDF4", color: "#166534"   }, icon: <CheckCircle2 size={12} /> },
};

const FILTER_TABS = [
  { value: "all",         label: "All" },
  { value: "new",         label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
];

const TOPIC_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  wait_time:   { label: "Wait Time",   bg: "#FEF3C7", color: "#B45309" },
  quality:     { label: "Quality",     bg: "#FEE2E2", color: "#DC2626" },
  staff:       { label: "Staff",       bg: "#FEE2E2", color: "#DC2626" },
  price:       { label: "Price",       bg: "#F3F4F6", color: "#6B7280" },
  cleanliness: { label: "Cleanliness", bg: "#FEF3C7", color: "#B45309" },
  other:       { label: "Other",       bg: "#F3F4F6", color: "#6B7280" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  "1_hour":    { label: "Respond within 1 hour",    color: RD },
  "24_hours":  { label: "Respond within 24 hours",  color: AM },
  "this_week": { label: "Respond this week",         color: "#6B7280" },
};

interface ExtFeedback extends DBFeedback {
  sentiment_topic?: string | null;
  sentiment_intensity?: string | null;
  sentiment_urgency?: string | null;
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ fontSize: 12, color: "#D1D5DB" }}>No rating</span>;
  const colors: Record<number, string> = { 1: "#EF4444", 2: "#F97316", 3: "#F59E0B", 4: "#22C55E", 5: "#00C896" };
  const col = colors[Math.min(5, Math.max(1, Math.round(rating)))] ?? "#6B7280";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} style={{ fill: i <= rating ? col : "#E5E7EB", color: i <= rating ? col : "#E5E7EB" }} />
      ))}
      <span style={{ fontSize: 12, fontWeight: 600, color: col, marginLeft: 4 }}>{rating}/5</span>
    </div>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <>
      <style>{`@keyframes toastIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 100, padding: "13px 22px", borderRadius: 12, background: type === "success" ? G : RD, color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", animation: "toastIn 0.25s ease", display: "flex", alignItems: "center", gap: 8 }}>
        {type === "success" ? "✓" : "✕"} {message}
      </div>
    </>
  );
}

// ── Three-Tone AI Reply Box ────────────────────────────────────────────────

interface AiReplyBoxProps {
  item: ExtFeedback;
  businessName: string;
  businessType?: string;
  onSave: (id: string, reply: string) => void;
}

function AiReplyBox({ item, businessName, businessType, onSave }: AiReplyBoxProps) {
  const [tones,       setTones]       = useState<{ apologetic: string; professional: string; personal: string } | null>(null);
  const [activeTone,  setActiveTone]  = useState<"apologetic" | "professional" | "personal">("apologetic");
  const [generating,  setGenerating]  = useState(false);
  const [copyLabel,   setCopyLabel]   = useState("Copy");
  const [error,       setError]       = useState("");

  const generate = useCallback(async () => {
    if (!item.feedback_text) return;
    setGenerating(true);
    setError("");
    try {
      const { data: { session } } = await db.auth.getSession();
      const res = await fetch("/api/ai/feedback-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          feedbackText: item.feedback_text,
          rating:       item.rating,
          customerName: item.customer_name ?? "the customer",
          businessName,
          businessType: businessType ?? "service business",
          threeTones:   true,
        }),
      });
      const data = await res.json();
      if (data.apologetic || data.professional || data.personal) {
        const t = { apologetic: data.apologetic, professional: data.professional, personal: data.personal };
        setTones(t);
        const firstReply = t[activeTone] || t.apologetic;
        onSave(item.id, firstReply);
        await db.from("feedback").update({ ai_reply: firstReply }).eq("id", item.id);
      } else {
        setError("Could not generate reply.");
      }
    } catch {
      setError("Network error - please try again.");
    }
    setGenerating(false);
  }, [item, businessName, businessType, activeTone, onSave]);

  // Pre-populate from saved reply
  useEffect(() => {
    if (!tones && item.ai_reply) {
      setTones({ apologetic: item.ai_reply, professional: item.ai_reply, personal: item.ai_reply });
    } else if (!tones && !item.ai_reply && item.feedback_text) {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectTone(tone: "apologetic" | "professional" | "personal") {
    setActiveTone(tone);
    if (tones?.[tone]) {
      onSave(item.id, tones[tone]);
      await db.from("feedback").update({ ai_reply: tones[tone] }).eq("id", item.id);
    }
  }

  function copyToClipboard() {
    const text = tones?.[activeTone];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy"), 2000);
    });
  }

  if (!item.feedback_text) return null;

  const activeText = tones?.[activeTone] ?? "";

  return (
    <div style={{ marginTop: 16, padding: 16, background: "rgba(0,200,150,0.04)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: G, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          AI Suggested Reply
        </p>
        <button
          onClick={generate}
          disabled={generating}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 8, background: "transparent", cursor: generating ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", fontSize: 12, color: G, opacity: generating ? 0.6 : 1 }}
        >
          <RefreshCw size={11} style={{ animation: generating ? "spin 0.8s linear infinite" : "none" }} />
          {generating ? "Generating…" : "Regenerate"}
        </button>
      </div>

      {/* Tone selector */}
      {tones && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {(["apologetic", "professional", "personal"] as const).map(tone => (
            <button
              key={tone}
              onClick={() => selectTone(tone)}
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
      )}

      {/* Reply text */}
      {generating && !tones ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>Generating suggested reply…</span>
        </div>
      ) : error ? (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: RD, margin: "0 0 8px" }}>{error}</p>
      ) : activeText ? (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: N, lineHeight: 1.65, margin: "0 0 12px" }}>
          {activeText}
        </p>
      ) : null}

      {/* Copy button */}
      {activeText && !generating && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={copyToClipboard}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: `1px solid rgba(0,200,150,0.35)`, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: G, cursor: "pointer" }}
          >
            <Copy size={12} />
            {copyLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { businessId, businessName } = useBusinessContext();

  const [items,       setItems]       = useState<ExtFeedback[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all");
  const [toast,       setToast]       = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [updating,    setUpdating]    = useState<string | null>(null);
  const [bizType,     setBizType]     = useState<string | undefined>(undefined);
  const [bizPlan,     setBizPlan]     = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }

    Promise.all([
      getAllFeedback(businessId),
      db.from("businesses").select("business_type, plan").eq("id", businessId).single(),
    ]).then(([data, bizRes]) => {
      setItems(data as ExtFeedback[]);
      setBizType(bizRes.data?.business_type ?? undefined);
      setBizPlan((bizRes.data as (typeof bizRes.data & { plan?: string }) | null)?.plan ?? null);
      setLoading(false);

      // Trigger sentiment analysis for items without it
      const needsSentiment = (data as ExtFeedback[]).filter(i => i.feedback_text && !i.sentiment_topic);
      db.auth.getSession().then(({ data: { session } }) => {
      needsSentiment.forEach(item => {
        fetch("/api/ai/sentiment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            feedback_id:   item.id,
            feedback_text: item.feedback_text,
            business_type: bizRes.data?.business_type ?? "service business",
          }),
        }).then(res => res.json()).then(result => {
          if (result.topic) {
            setItems(prev => prev.map(i => i.id === item.id
              ? { ...i, sentiment_topic: result.topic, sentiment_intensity: result.intensity, sentiment_urgency: result.urgency }
              : i
            ));
          }
        }).catch(() => { /* silent */ });
      });
      }); // end getSession
    });
  }, [businessId]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function changeStatus(id: string, newStatus: string) {
    setUpdating(id);
    await updateFeedbackStatus(id, newStatus);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    showToast(newStatus === "resolved" ? "Marked as resolved" : "Marked as in progress");
    setUpdating(null);
  }

  function handleAiReplySave(id: string, reply: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ai_reply: reply } : i));
  }

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>
          Feedback Inbox
        </h1>
        <p style={{ marginTop: 4, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
          {items.filter(i => i.status === "new").length} new · {items.length} total
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #E5E7EB" }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{ padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: filter === tab.value ? 600 : 400, color: filter === tab.value ? G : "#6B7280", borderBottom: filter === tab.value ? `2px solid ${G}` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 9999, background: filter === tab.value ? "rgba(0,200,150,0.15)" : "#F3F4F6", color: filter === tab.value ? G : "#6B7280" }}>
                {items.filter(i => i.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          {items.length === 0 ? (
            <>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <MessageSquare size={28} style={{ color: G }} />
              </div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                No feedback yet
              </h3>
              <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                When customers rate their experience, their feedback will appear here. You&apos;ll also see AI-suggested replies and sentiment analysis.
              </p>
            </>
          ) : (
            <>
              <MessageSquare size={32} style={{ color: "#D1D5DB", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>No items in this category.</p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map(item => {
            const cfg         = STATUS_CONFIG[item.status ?? "new"] ?? STATUS_CONFIG.new;
            const topicCfg    = item.sentiment_topic ? TOPIC_CONFIG[item.sentiment_topic] ?? TOPIC_CONFIG.other : null;
            const urgencyCfg  = item.sentiment_urgency ? URGENCY_CONFIG[item.sentiment_urgency] ?? null : null;

            return (
              <div key={item.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s ease" }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>
                      {item.customer_name ?? "Unknown customer"}
                    </p>
                    <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0", fontFamily: "Inter, sans-serif" }}>{fmtDate(item.created_at)}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <StarDisplay rating={item.rating} />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: "5px 13px", ...cfg.style }}>
                      {cfg.icon} {cfg.label}
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
                {item.feedback_text && (
                  <div style={{ marginTop: 16, padding: "14px 16px", background: "#F9FAFB", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                    &ldquo;{item.feedback_text}&rdquo;
                  </div>
                )}

                {/* AI Reply Box */}
                {item.feedback_text && (
                  hasFeature(bizPlan, "ai_replies") ? (
                    <AiReplyBox
                      item={item}
                      businessName={businessName}
                      businessType={bizType}
                      onSave={handleAiReplySave}
                    />
                  ) : (
                    <div style={{ marginTop: 16 }}>
                      <UpgradePrompt
                        feature="AI Suggested Replies"
                        description="Let AI draft the perfect response to unhappy customers - edit and send in one click."
                        requiredPlan="growth"
                      />
                    </div>
                  )
                )}

                {/* Action buttons */}
                {item.status !== "resolved" && (
                  <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                    {item.status === "new" && (
                      <button
                        disabled={updating === item.id}
                        onClick={() => changeStatus(item.id, "in_progress")}
                        style={{ padding: "8px 16px", border: "1px solid #E5E7EB", borderRadius: 8, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "#374151", cursor: updating === item.id ? "not-allowed" : "pointer" }}
                      >
                        {updating === item.id ? "…" : "Mark In Progress"}
                      </button>
                    )}
                    <button
                      disabled={updating === item.id}
                      onClick={() => changeStatus(item.id, "resolved")}
                      style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: G, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "#fff", cursor: updating === item.id ? "not-allowed" : "pointer" }}
                    >
                      {updating === item.id ? "…" : "Mark Resolved"}
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
