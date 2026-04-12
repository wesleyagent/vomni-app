"use client";

import { useState } from "react";

const G  = "#00C896";
const N  = "#0A0F1E";
const BD = "#E5E7EB";

interface Props {
  businessId:     string;
  businessName:   string;
  googleReviewLink: string | null;
  ownerName:      string | null;
  bookingSlug:    string | null;
  bookingEnabled: boolean;
  customerName:   string | null;  // pre-filled if passed via URL
  bookingId:      string | null;
}

type Screen = "name_phone" | "rating" | "google" | "private" | "done";

function first(name: string | null | undefined) {
  return name?.trim().split(" ")[0] || "there";
}

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  padding: "32px 24px 28px",
  boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
};

function Tick() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
      <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path d="M7 17l6.5 6.5 12.5-12.5" stroke={G} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function ReviewGatingClient({
  businessId,
  businessName,
  googleReviewLink,
  ownerName,
  bookingSlug,
  bookingEnabled,
  customerName: initialName,
  bookingId,
}: Props) {
  // Normalise google review link — add https:// if protocol is missing
  const safeGoogleLink = googleReviewLink
    ? googleReviewLink.match(/^https?:\/\//i) ? googleReviewLink : `https://${googleReviewLink}`
    : null;

  // If name was passed via URL, skip the name/phone screen
  const [screen, setScreen]     = useState<Screen>(initialName ? "rating" : "name_phone");
  const [name,   setName]       = useState(initialName ?? "");
  const [phone,  setPhone]      = useState("");
  const [hover,  setHover]      = useState(0);
  const [rating, setRating]     = useState(0);
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);
  const [doneMsg, setDoneMsg]   = useState("");

  const fname    = first(name);
  const ownerFirst = first(ownerName);

  const labels: Record<number, string> = {
    1: "We are sorry to hear that",
    2: "That is not good enough",
    3: "Thanks for letting us know",
    4: "Great to hear!",
    5: "Amazing — thank you!",
  };

  // Save feedback via API
  async function saveFeedback(r: number, text?: string) {
    try {
      await fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id:   businessId,
          booking_id:    bookingId ?? null,
          rating:        r,
          feedback_text: text ?? null,
          customer_name: name || null,
          customer_phone: phone || null,
        }),
      });
    } catch { /* non-fatal */ }
  }

  async function handleSubmitRating() {
    if (!rating) return;
    await saveFeedback(rating);
    if (rating >= 4) {
      setScreen("google");
    } else {
      setScreen("private");
    }
  }

  async function handleSubmitPrivate() {
    if (!message.trim()) return;
    setSending(true);
    await saveFeedback(rating, message.trim());
    setSending(false);
    setDoneMsg(`Sent. ${ownerName || "The team"} at ${businessName} will be in touch.`);
    setScreen("done");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #F7F8FA; }
        .star { transition: color 0.1s, transform 0.1s; cursor: pointer; background: none; border: none; padding: 0; line-height: 1; display: inline-block; }
        .star:hover  { transform: scale(1.2); }
        .star:active { transform: scale(0.9); }
        .btn { transition: opacity 0.15s, transform 0.12s; }
        .btn:not(:disabled):hover  { opacity: 0.88; transform: translateY(-1px); }
        .btn:not(:disabled):active { opacity: 1;    transform: translateY(0); }
        textarea { font-family: Inter,sans-serif; font-size: 15px; resize: vertical; outline: none; }
        textarea:focus { border-color: ${G} !important; box-shadow: 0 0 0 3px rgba(0,200,150,0.12) !important; }
        input { font-family: Inter,sans-serif; font-size: 15px; outline: none; }
        input:focus { border-color: ${G} !important; box-shadow: 0 0 0 3px rgba(0,200,150,0.12) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px 60px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* ── NAME + PHONE ── */}
          {screen === "name_phone" && (
            <div style={card}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: 0 }}>{businessName}</p>
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 6px" }}>
                How was your visit?
              </h1>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 24px" }}>
                Please enter your details so we can follow up if needed.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="First and last name"
                  autoFocus
                  style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${BD}`, color: "#111827", background: "#FAFAFA", display: "block" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Your phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+44 7700 000000"
                  style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${BD}`, color: "#111827", background: "#FAFAFA", display: "block" }}
                />
              </div>

              <button
                type="button"
                className="btn"
                onClick={() => { if (name.trim() && phone.trim()) setScreen("rating"); }}
                disabled={!name.trim() || !phone.trim()}
                style={{
                  width: "100%", padding: "15px", borderRadius: 9999,
                  background: name.trim() && phone.trim() ? G : "#D1D5DB",
                  color: "#fff", border: "none",
                  fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 600,
                  cursor: name.trim() && phone.trim() ? "pointer" : "not-allowed", minHeight: 52,
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── RATING ── */}
          {screen === "rating" && (
            <div style={card}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: 0 }}>{businessName}</p>
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 6px" }}>
                How was your visit{fname !== "there" ? `, ${fname}` : ""}?
              </h1>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 28px" }}>
                Tap the stars to rate your experience
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    className="star"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    style={{ fontSize: 44, color: (hover || rating) >= s ? G : "#D1D5DB" }}
                  >★</button>
                ))}
              </div>

              {rating > 0 && (
                <>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: rating >= 4 ? G : "#6B7280", textAlign: "center", margin: "0 0 20px" }}>
                    {labels[rating]}
                  </p>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSubmitRating}
                    style={{ width: "100%", padding: "15px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 600, cursor: "pointer", minHeight: 52 }}
                  >
                    Submit →
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── GOOGLE (4–5★) ── */}
          {screen === "google" && (
            <div style={card}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: 0 }}>{businessName}</p>
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 8px" }}>
                Thank you, {fname}! 🙏
              </h1>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, color: "#6B7280", textAlign: "center", margin: "0 0 28px", lineHeight: 1.5 }}>
                We are so glad you had a great experience.
              </p>

              {safeGoogleLink && (
                <a
                  href={safeGoogleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    display: "block", width: "100%", padding: "16px",
                    backgroundColor: G, color: "#fff", border: "none",
                    textAlign: "center", borderRadius: "9999px",
                    fontSize: "16px", fontWeight: "700",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    textDecoration: "none", boxSizing: "border-box",
                  }}
                >
                  Leave us a Google review ★
                </a>
              )}

              <div style={{ marginTop: "16px", textAlign: "center" }}>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setScreen("private"); }}
                  style={{ fontSize: "11px", color: "#9CA3AF", textDecoration: "underline", fontFamily: "Inter, sans-serif", cursor: "pointer" }}
                >
                  Send us a private message instead
                </a>
              </div>

              {bookingEnabled && bookingSlug && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BD}` }}>
                  <a
                    href={`/book/${bookingSlug}`}
                    style={{ display: "block", textAlign: "center", fontFamily: "Inter,sans-serif", fontSize: 14, color: G, fontWeight: 600, textDecoration: "none" }}
                  >
                    📅 Book your next visit →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── PRIVATE (1–3★ = make it right / 4–5★ = positive feedback) ── */}
          {screen === "private" && (
            <div style={card}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: 0 }}>{businessName}</p>
              </div>
              {rating >= 4 ? (
                <>
                  <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 8px" }}>
                    We&apos;d love to hear more! 😊
                  </h1>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 20px", lineHeight: 1.6 }}>
                    Your feedback goes directly to {ownerFirst}. Every word helps us keep doing what we love.
                  </p>
                </>
              ) : (
                <>
                  <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 8px" }}>
                    I&apos;d like to personally make this right.
                  </h1>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 20px", lineHeight: 1.6 }}>
                    Your message goes directly to my personal inbox. I aim to resolve all concerns within 24 business hours.
                  </p>
                </>
              )}

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={rating >= 4 ? "Tell us what you enjoyed or anything we could make even better..." : "Please tell me what happened and how I can fix it for you today..."}
                style={{ width: "100%", minHeight: 140, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${BD}`, color: "#111827", background: "#FAFAFA", display: "block", marginBottom: 16 }}
              />

              <button
                type="button"
                className="btn"
                onClick={handleSubmitPrivate}
                disabled={sending || !message.trim()}
                style={{
                  width: "100%", padding: "15px", borderRadius: 9999,
                  background: message.trim() ? N : "#D1D5DB",
                  color: "#fff", border: "none",
                  fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 600,
                  cursor: message.trim() ? "pointer" : "not-allowed",
                  minHeight: 52, opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "Sending..." : rating >= 4 ? `Send to ${ownerFirst} →` : `Send directly to ${ownerFirst} →`}
              </button>

              {/* Google review option — always available */}
              {safeGoogleLink && (
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${BD}` }}>
                  <a
                    href={safeGoogleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      display: "block", width: "100%", padding: "16px",
                      backgroundColor: G, color: "#fff", border: "none",
                      textAlign: "center", borderRadius: "9999px",
                      fontSize: "16px", fontWeight: "700",
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      textDecoration: "none", boxSizing: "border-box",
                    }}
                  >
                    Leave us a Google review ★
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── DONE ── */}
          {screen === "done" && (
            <div style={{ ...card, textAlign: "center", padding: "52px 24px" }}>
              <Tick />
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 16, color: "#374151", margin: "0 0 24px", lineHeight: 1.7 }}>
                {doneMsg}
              </p>
              {bookingEnabled && bookingSlug && (
                <a
                  href={`/book/${bookingSlug}`}
                  style={{ display: "inline-block", padding: "13px 28px", background: G, color: "#fff", borderRadius: 9999, fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 600, textDecoration: "none" }}
                >
                  Book your next visit →
                </a>
              )}
            </div>
          )}

          <p style={{ textAlign: "right", fontSize: 11, color: "rgba(0,0,0,0.08)", marginTop: 16, fontFamily: "Inter,sans-serif" }}>
            Powered by Vomni
          </p>

        </div>
      </div>
    </>
  );
}
