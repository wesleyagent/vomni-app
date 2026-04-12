"use client";

import { useState } from "react";

const G = "#00C896";
const N = "#0A0F1E";

interface Props {
  businessId:    string;
  businessName:  string;
  googleMapsUrl: string | null;
  customerName:  string | null;
  bookingId:     string | null;
}

type Stage = "rating" | "feedback" | "done";

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
  const [feedbackSaved, setFeedbackSaved] = useState(false);
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
      // Non-fatal
    }
  }

  async function handleStarClick(rating: number) {
    setRating(rating);
    await saveFeedback(rating);
    if (rating <= 3) {
      // Show feedback form for low ratings — but Google button still available after
      setStage("feedback");
    } else {
      // High rating — go straight to done (Google button shown)
      setStage("done");
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    setSaving(true);
    await saveFeedback(selectedRating, feedbackText.trim());
    setSaving(false);
    setFeedbackSaved(true);
    setStage("done");
  }

  function GoogleButton() {
    if (!googleMapsUrl) return null;
    return (
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: G, color: "#fff", textDecoration: "none",
          fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700,
          padding: "14px 28px", borderRadius: 9999, marginTop: 20,
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Leave a Google Review
      </a>
    );
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

        {/* ── Step 1: Star rating ── */}
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

        {/* ── Step 2: Feedback form (1–3 stars only) ── */}
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
              Tell us what happened so we can improve — then you can also leave a Google review below.
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
                marginTop: 12, width: "100%",
                background: feedbackText.trim() && !saving ? N : "#D1D5DB",
                color: "#fff", border: "none", borderRadius: 9999,
                padding: "14px 0", fontSize: 15, fontWeight: 700,
                cursor: feedbackText.trim() && !saving ? "pointer" : "not-allowed",
                fontFamily: "'Bricolage Grotesque', sans-serif", transition: "background 0.15s",
              }}
            >
              {saving ? "Sending…" : "Send Feedback"}
            </button>

            {/* Google button always available even before submitting feedback */}
            <div style={{ marginTop: 8, borderTop: "1px solid #E5E7EB", paddingTop: 20 }}>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 4px" }}>
                Or skip straight to Google:
              </p>
              <GoogleButton />
            </div>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {stage === "done" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: selectedRating >= 4 ? "#ECFDF5" : "#F0FDF4",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              {selectedRating >= 4
                ? <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                : <span style={{ fontSize: 28 }}>🙏</span>
              }
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: N, margin: "0 0 8px" }}>
              {selectedRating >= 4 ? `Glad you enjoyed it${firstName ? `, ${firstName}` : ""}!` : "Thank you for your feedback."}
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: "0 0 4px" }}>
              {selectedRating >= 4
                ? `Would you mind sharing your experience on Google? It helps others find ${businessName}.`
                : feedbackSaved
                  ? `We've received your feedback and will look into it. You can also share your experience on Google below.`
                  : `You can share your experience on Google below.`
              }
            </p>
            <GoogleButton />
            {!googleMapsUrl && (
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 16 }}>
                We really appreciate your visit to {businessName}!
              </p>
            )}
          </>
        )}

      </div>
    </div>
  );
}
