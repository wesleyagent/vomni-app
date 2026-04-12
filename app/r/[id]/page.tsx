"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
type Screen = "loading" | "already_used" | "rating" | "google" | "private" | "private_from_positive" | "done";

type Business = {
  name: string;
  google_review_link: string | null;
  logo_url: string | null;
  owner_name: string | null;
  weekly_google_redirects: number | null;
  weekly_redirect_cap: number | null;
  booking_slug: string | null;
  booking_enabled: boolean | null;
};

type Booking = {
  id: string;
  business_id: string;
  customer_name: string;
};

const G  = "#00C896";
const N  = "#0A0F1E";
const BD = "#E5E7EB";

// All writes go through /api/r/[booking_id] server routes (admin key, bypasses RLS)

function first(name: string | null | undefined) {
  return name?.trim().split(" ")[0] || "there";
}

// ── Sub-components defined OUTSIDE the main component to avoid remount on every render ──

function BizHeader({ business, bizName }: { business: Business | null; bizName: string }) {
  if (!business) return null;
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      {business.logo_url && (
        <img
          src={business.logo_url}
          alt={bizName}
          style={{
            height: "64px", width: "auto", objectFit: "contain",
            borderRadius: "8px", display: "block", margin: "0 auto 12px",
          }}
        />
      )}
      <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: 0 }}>
        {bizName}
      </p>
    </div>
  );
}

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

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  padding: "32px 24px 28px",
  boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
};

export default function RatingPage() {
  const { id: bookingId } = useParams() as { id: string };

  const [screen,     setScreen]     = useState<Screen>("loading");
  const [booking,    setBooking]    = useState<Booking | null>(null);
  const [business,   setBusiness]   = useState<Business | null>(null);
  const [rating,     setRating]     = useState(0);
  const [hover,      setHover]      = useState(0);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [message,    setMessage]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [doneMsg,    setDoneMsg]    = useState("");

  // ── Load via server route (bypasses RLS) ─────────────────────────────────
  useEffect(() => {
    if (!bookingId) { setScreen("rating"); return; }

    fetch(`/api/r/${bookingId}`)
      .then(res => res.json())
      .then((data) => {
        const bk  = data.booking  as Booking | null;
        const biz = data.business as Business | null;

        // Debug — check browser console for these values
        console.log("Business data:", biz);
        console.log("Google link:", biz?.google_review_link);

        // One-use link — already rated
        if (data.alreadyUsed) {
          setBusiness({ name: data.businessName, google_review_link: null, logo_url: null, owner_name: null, weekly_google_redirects: null, weekly_redirect_cap: null, booking_slug: null, booking_enabled: null });
          setScreen("already_used");
          return;
        }

        if (bk)  setBooking(bk);
        if (biz) {
          // Normalise google_review_link — add https:// if protocol missing
          if (biz.google_review_link && !biz.google_review_link.match(/^https?:\/\//i)) {
            biz.google_review_link = `https://${biz.google_review_link}`;
          }
          setBusiness(biz);
        }
        setScreen("rating");
      })
      .catch((err) => {
        console.error("Failed to load booking data:", err);
        setScreen("rating");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Star submit ───────────────────────────────────────────────────────────
  async function submitRating() {
    if (!rating || !booking) return;

    // POST to server route (admin key) — bypasses RLS for both bookings + feedback writes
    const res = await fetch(`/api/r/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, business_id: booking.business_id }),
    });
    const ratingResponse = await res.json();
    console.log("Rating write response:", ratingResponse);

    if (ratingResponse.feedbackId) setFeedbackId(ratingResponse.feedbackId);

    if (rating >= 4) {
      setScreen("google");
    } else {
      setScreen("private");
    }
  }

  // ── Google click ──────────────────────────────────────────────────────────
  function onGoogleClick() {
    if (!booking) return;

    // Fire-and-forget — server route handles both the bookings PATCH and
    // the businesses weekly_google_redirects increment (needs admin client to bypass RLS)
    fetch(`/api/r/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: booking.business_id }),
    }).catch(() => null);
  }

  // ── Private feedback submit ───────────────────────────────────────────────
  async function submitPrivate() {
    if (!message.trim() || !booking) return;
    setSending(true);

    const isFromPositive = screen === "private_from_positive";

    // PUT to server route (admin key) — handles feedback update + booking status
    const res = await fetch(`/api/r/${booking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedback_id:      feedbackId,
        feedback_text:    message.trim(),
        business_id:      booking.business_id,
        rating,
        is_from_positive: isFromPositive,
      }),
    });
    const feedbackResponse = await res.json();
    console.log("Feedback write response:", feedbackResponse);

    setSending(false);

    setDoneMsg(
      isFromPositive
        ? "Sent. Thank you for taking the time."
        : `Sent. ${business?.owner_name || "The team"} at ${business?.name || "the business"} will be in touch.`
    );
    setScreen("done");
  }

  const fname   = first(booking?.customer_name);
  const bizName = business?.name || "";

  // Velocity: true = under cap (Google is primary), false = at cap (equal prominence)
  const underCap = business
    ? (business.weekly_redirect_cap === null || (business.weekly_google_redirects ?? 0) < business.weekly_redirect_cap)
    : true;

  const labels: Record<number, string> = {
    1: "We are sorry to hear that",
    2: "That is not good enough",
    3: "Thanks for letting us know",
    4: "Great to hear!",
    5: "Amazing — thank you!",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #F7F8FA; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .star { transition: color 0.1s, transform 0.1s; cursor: pointer; background: none; border: none; padding: 0; line-height: 1; display: inline-block; }
        .star:hover  { transform: scale(1.2); }
        .star:active { transform: scale(0.9); }
        .btn { transition: opacity 0.15s, transform 0.12s; }
        .btn:not(:disabled):hover  { opacity: 0.88; transform: translateY(-1px); }
        .btn:not(:disabled):active { opacity: 1;    transform: translateY(0); }
        textarea { font-family: Inter,sans-serif; font-size: 15px; resize: vertical; outline: none; }
        textarea:focus { border-color: ${G} !important; box-shadow: 0 0 0 3px rgba(0,200,150,0.12) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px 60px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* ── LOADING ── */}
          {screen === "loading" && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
              <div style={{ width: 36, height: 36, border: "3px solid #E5E7EB", borderTopColor: G, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          )}

          {/* ── ALREADY USED ── */}
          {screen === "already_used" && (
            <div style={card}>
              <BizHeader business={business} bizName={bizName} />
              <Tick />
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 12px" }}>
                Thanks for visiting {bizName}
              </h1>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, color: "#6B7280", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                You&apos;ve already shared your feedback — we really appreciate it.
              </p>
            </div>
          )}

          {/* ── RATING ── */}
          {screen === "rating" && (
            <div style={card}>
              <BizHeader business={business} bizName={bizName} />
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
                  >
                    ★
                  </button>
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
                    onClick={submitRating}
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
              <BizHeader business={business} bizName={bizName} />
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 8px" }}>
                Thank you, {fname}! 🙏
              </h1>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, color: "#6B7280", textAlign: "center", margin: "0 0 28px", lineHeight: 1.5 }}>
                We are so glad you had a great experience.
              </p>

              {/* Google button — always visible; prominence controlled by velocity cap */}
              <a
                href={business?.google_review_link ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                onClick={onGoogleClick}
                style={{
                  display: "block",
                  width: "100%",
                  padding: underCap ? "16px" : "13px",
                  backgroundColor: underCap ? G : "transparent",
                  color: underCap ? "white" : G,
                  border: underCap ? "none" : `2px solid ${G}`,
                  textAlign: "center",
                  borderRadius: "9999px",
                  fontSize: underCap ? "16px" : "15px",
                  fontWeight: "700",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  textDecoration: "none",
                  marginTop: "24px",
                  boxSizing: "border-box",
                }}
              >
                Leave us a Google review ★
              </a>

              {/* Private option — small link when under cap, equal button when at cap */}
              {underCap ? (
                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setScreen("private_from_positive"); }}
                    style={{ fontSize: "11px", color: "#9CA3AF", textDecoration: "underline", fontFamily: "Inter, sans-serif", cursor: "pointer" }}
                  >
                    Send us a private message instead
                  </a>
                </div>
              ) : (
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setScreen("private_from_positive"); }}
                  className="btn"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "13px",
                    backgroundColor: "transparent",
                    color: N,
                    border: `2px solid ${N}`,
                    textAlign: "center",
                    borderRadius: "9999px",
                    fontSize: "15px",
                    fontWeight: "700",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    textDecoration: "none",
                    marginTop: "12px",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  Send us a private message instead
                </a>
              )}

              {/* Rebooking CTA — book again shortcut */}
              {business?.booking_enabled && business?.booking_slug && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BD}` }}>
                  <a
                    href={`/book/${business.booking_slug}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      fontFamily: "Inter,sans-serif",
                      fontSize: 14,
                      color: G,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    📅 Book your next visit →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── PRIVATE (1–3★) ── */}
          {screen === "private" && (
            <div style={card}>
              <BizHeader business={business} bizName={bizName} />
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 8px" }}>
                I&apos;d like to personally make this right.
              </h1>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 20px", lineHeight: 1.6 }}>
                Your message goes directly to my personal inbox. I aim to resolve all concerns within 24 business hours.
              </p>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Please tell me what happened and how I can fix it for you today..."
                style={{ width: "100%", minHeight: 140, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${BD}`, color: "#111827", background: "#FAFAFA", display: "block", marginBottom: 16 }}
              />

              <button
                type="button"
                className="btn"
                onClick={submitPrivate}
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
                {sending ? "Sending..." : `Send directly to ${first(business?.owner_name)} →`}
              </button>

              {/* Google review option — equal opportunity, FTC/Google compliant */}
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${BD}` }}>
                <a
                  href={business?.google_review_link ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  onClick={onGoogleClick}
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
            </div>
          )}

          {/* ── PRIVATE FROM POSITIVE (4–5★ chose private instead) ── */}
          {screen === "private_from_positive" && (
            <div style={card}>
              <BizHeader business={business} bizName={bizName} />
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 8px" }}>
                Send us a message
              </h1>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 20px", lineHeight: 1.5 }}>
                We will read every word.
              </p>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us about your experience..."
                style={{ width: "100%", minHeight: 140, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${BD}`, color: "#111827", background: "#FAFAFA", display: "block", marginBottom: 16 }}
              />

              <button
                type="button"
                className="btn"
                onClick={submitPrivate}
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
                {sending ? "Sending..." : "Send message →"}
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {screen === "done" && (
            <div style={{ ...card, textAlign: "center", padding: "52px 24px" }}>
              <Tick />
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 16, color: "#374151", margin: "0 0 24px", lineHeight: 1.7 }}>
                {doneMsg}
              </p>
              {/* Rebooking CTA — shown for 4-5 star ratings */}
              {rating >= 4 && business?.booking_enabled && business?.booking_slug && (
                <a
                  href={`/book/${business.booking_slug}`}
                  style={{
                    display: "inline-block",
                    padding: "13px 28px",
                    background: G,
                    color: "#fff",
                    borderRadius: 9999,
                    fontFamily: "Inter,sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
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
