"use client";

import { useState } from "react";

const G  = "#00C896";
const N  = "#0A0F1E";

interface Props {
  businessId:   string;
  businessName: string;
  googleMapsUrl: string | null;
  customerName:  string | null;
  bookingId:     string | null;
}

type Stage = "rating" | "feedback" | "done_positive" | "done_negative";

export default function ReviewGatingClient({
  businessId,
  businessName,
  googleMapsUrl,
  customerName,
  bookingId,
}: Props) {
  const [stage, setStage]               = useState<Stage>("rating");
  const [hoveredStar, setHoveredStar]   = useState(0);
  const [selectedRating, setRating]     = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [saving, setSaving]             = useState(false);

  const firstName = customerName?.split(" ")[0] ?? null;

  async function saveFeedback(rating: number, text?: string) {
    try {
      await fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id:   businessId,
          booking_id:    bookingId,
          rating,
          feedback_text: text ?? null,
          customer_name: customerName,
        }),
      });
    } catch {
      // Non-fatal — UX continues regardless
    }
  }

  async function handleStarClick(rating: number) {
    setRating(rating);

    if (rating >= 4) {
      // Positive — save and redirect to Google
      await saveFeedback(rating);
      if (googleMapsUrl) {
        window.location.href = googleMapsUrl;
      } else {
        setStage("done_positive");
      }
    } else {
      // Negative — show feedback form
      setStage("feedback");
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    setSaving(true);
    await saveFeedback(selectedRating, feedbackText.trim());
    setSaving(false);
    setStage("done_negative");
  }

  return (
    <div style={{
      fontFamily: "Inter, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", margin: 0, background: "#F7F8FA", padding: "24px 16px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>

        {/* Logo */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: G,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", fontSize: 20, fontWeight: 800, color: "#fff",
        }}>V</div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 32px" }}>
          Powered by Vomni
        </p>

        {/* ── Star rating ── */}
        {stage === "rating" && (
          <>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: N, margin: "0 0 8px" }}>
              How was your experience{firstName ? `, ${firstName}` : ""}?
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 32px" }}>
              at {businessName} — tap a star to rate
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    transform: hoveredStar >= star ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill={star <= (hoveredStar || selectedRating) ? "#FBBF24" : "#E5E7EB"}
                      stroke={star <= (hoveredStar || selectedRating) ? "#F59E0B" : "#D1D5DB"}
                      strokeWidth={1}
                    />
                  </svg>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Feedback form (1–3 stars) ── */}
        {stage === "feedback" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "#FEF3C7",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 28,
            }}>😕</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: N, margin: "0 0 8px" }}>
              We&apos;re sorry to hear that.
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px" }}>
              Your feedback helps us improve. What happened?
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Tell us what happened..."
              rows={4}
              autoFocus
              style={{
                width: "100%", borderRadius: 12, border: "1px solid #D1D5DB",
                padding: "12px 14px", fontSize: 14, resize: "none", boxSizing: "border-box",
                fontFamily: "Inter, sans-serif", outline: "none",
              }}
            />
            <button
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim() || saving}
              style={{
                marginTop: 12, width: "100%", background: feedbackText.trim() ? N : "#D1D5DB",
                color: "#fff", border: "none", borderRadius: 9999,
                padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: feedbackText.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Bricolage Grotesque', sans-serif", transition: "background 0.15s",
              }}
            >
              {saving ? "Sending…" : "Submit Feedback"}
            </button>
          </>
        )}

        {/* ── Done: positive (no Google Maps URL configured) ── */}
        {stage === "done_positive" && (
          <>
            <div style={{ fontSize: 56, margin: "0 0 16px" }}>🌟</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: N, margin: "0 0 8px" }}>
              Thank you{firstName ? `, ${firstName}` : ""}!
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
              We&apos;re so glad you had a great experience at {businessName}. Your kind words mean everything to us.
            </p>
          </>
        )}

        {/* ── Done: negative feedback submitted ── */}
        {stage === "done_negative" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "#ECFDF5",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: N, margin: "0 0 8px" }}>
              Thank you for your feedback.
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
              We&apos;ll look into this and be in touch. We appreciate your honesty — it helps us do better.
            </p>
          </>
        )}

      </div>
    </div>
  );
}
