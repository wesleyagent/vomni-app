"use client";

import { useState, useEffect, useRef } from "react";

// IPhone mockup component — defined outside main so it never re-renders with state
function IPhone({ children, slideLeft }: { children: React.ReactNode; slideLeft?: boolean }) {
  return (
    <div
      style={{
        width: "min(320px, calc(100vw - 32px))",
        height: "min(640px, calc(100vh - 180px))",
        background: "#1C1C1E",
        borderRadius: 50,
        border: "10px solid #2C2C2E",
        boxShadow:
          "0 0 0 2px #3A3A3C, 0 40px 80px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
        transform: slideLeft ? "translateX(-120%)" : "translateX(0)",
        opacity: slideLeft ? 0 : 1,
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 30,
          background: "#1C1C1E",
          borderRadius: "0 0 20px 20px",
          zIndex: 10,
        }}
      />
      {/* Screen content */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function PlatformLiveDemo() {
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [presenterMode, setPresenterMode] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const reviewTextRef = useRef<HTMLTextAreaElement>(null);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifTapped, setNotifTapped] = useState(false);
  const [dashboardAnimating, setDashboardAnimating] = useState(false);
  const [googleReviewCount, setGoogleReviewCount] = useState(28);
  const [avgRating, setAvgRating] = useState("4.3");
  const [negativeShielded, setNegativeShielded] = useState(3);
  const [showReviewCard, setShowReviewCard] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [negativeMode, setNegativeMode] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [aiTone, setAiTone] = useState<"apologetic" | "professional" | "personal">("apologetic");

  // Persistent AudioContext stored in a ref — browsers require one to exist before playing
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext();
      } catch { return null; }
    }
    return audioCtxRef.current;
  }

  function playTone(freq: number, duration: number, volume = 0.15, type: OscillatorType = "sine") {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // Resume if browser suspended it (autoplay policy)
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function playSound(type: "chime" | "click" | "success" | "notify") {
    if (!soundOn) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    if (type === "chime") {
      playTone(880, 0.15, 0.15);
      setTimeout(() => playTone(660, 0.3, 0.12), 120);
    } else if (type === "click") {
      playTone(600, 0.06, 0.1);
    } else if (type === "success") {
      playTone(523, 0.12, 0.13);
      setTimeout(() => playTone(659, 0.12, 0.13), 120);
      setTimeout(() => playTone(784, 0.25, 0.13), 240);
    } else if (type === "notify") {
      playTone(740, 0.12, 0.1);
      setTimeout(() => playTone(880, 0.25, 0.1), 110);
    }
  }

  // Initialise AudioContext on first sound toggle — must happen inside a user gesture
  function toggleSound() {
    if (!soundOn) {
      // Create/resume the context on the click itself so browser allows it
      getAudioCtx();
    }
    setSoundOn(s => !s);
  }

  // Auto-show notification after 0.8s on mount
  useEffect(() => {
    const t = setTimeout(() => setNotifVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Dashboard animation sequence when entering stage 6
  useEffect(() => {
    if (stage === 6 && !negativeMode) {
      setDashboardAnimating(true);
      setGoogleReviewCount(29);
      setAvgRating("4.4");
      const t1 = setTimeout(() => setShowReviewCard(true), 1200);
      const t2 = setTimeout(() => setShowToast(false), 100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectStars(n: number) {
    playSound("click");
    setStars(n);
    if (n <= 3) {
      setTimeout(() => setStage(3), 600);
    } else {
      setTimeout(() => setStage(4), 800);
    }
  }

  function backToStars() {
    setStars(0);
    setHoverStar(0);
    setStage(2);
  }

  function resetDemo() {
    setStage(1);
    setStars(0);
    setHoverStar(0);
    setNotifVisible(false);
    setNotifTapped(false);
    setDashboardAnimating(false);
    setGoogleReviewCount(28);
    setAvgRating("4.3");
    setNegativeShielded(3);
    setShowReviewCard(false);
    setShowAlert(false);
    setShowToast(false);
    setNegativeMode(false);
    setReviewText("");
    if (reviewTextRef.current) reviewTextRef.current.value = "";
    setPrivateNote("");
    setAiTone("apologetic");
    setTimeout(() => setNotifVisible(true), 800);
  }

  // Progress dot mapping
  const activeDot =
    stage <= 2 ? stage : stage <= 4 ? 3 : stage === 5 ? 4 : 5;

  // -------- STAGE INNER FUNCTIONS (closures over state) --------

  function Stage1() {
    return (
      <div
        className="demo-stage-wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          animation: "fadeIn 0.4s ease",
          width: "100%",
        }}
      >
        {/* Title above phone */}
        <div className="demo-stage-title" style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              margin: "0 0 8px",
            }}
          >
            See how Vomni works
          </h1>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            A customer just finished their appointment - here comes the text...
          </p>
        </div>

        <IPhone>
          {/* Lock screen */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, #1a1a3e 0%, #0a0a1e 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {/* Time */}
            <div style={{ paddingTop: 80, textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 64,
                  fontWeight: 200,
                  color: "#fff",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                14:32
              </p>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  color: "rgba(255,255,255,0.7)",
                  margin: "8px 0 0",
                }}
              >
                Monday, 27 March
              </p>
            </div>

            {/* Lock screen icons at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 40,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: 32,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                }}
              />
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                }}
              />
            </div>

            {/* Notification */}
            {notifVisible && (
              <div
                onClick={() => {
                  playSound("chime");
                  setNotifTapped(true);
                  setTimeout(() => setStage(2), 400);
                }}
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  right: 12,
                  background: "rgba(30,30,30,0.95)",
                  backdropFilter: "blur(20px)",
                  borderRadius: 16,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  animation: "slideDown 0.5s ease forwards, pulse 2s ease-in-out 0.5s infinite",
                  cursor: "pointer",
                  zIndex: 20,
                }}
              >
                {/* App icon */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #00C896, #00A87D)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#fff",
                      }}
                    >
                      Kings Cuts London
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      now
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.8)",
                      margin: "2px 0 0",
                      lineHeight: 1.4,
                    }}
                  >
                    Hi James, thanks for your cut today! How was your
                    experience? Tap to rate us 👇
                  </p>
                </div>
              </div>
            )}
          </div>
        </IPhone>

        {!notifTapped && notifVisible && (
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              animation: "fadeIn 0.6s ease 0.8s both",
              margin: 0,
            }}
          >
            Tap the notification to open
          </p>
        )}
      </div>
    );
  }

  function Stage2() {
    return (
      <div
        className="demo-stage-wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          animation: "fadeIn 0.4s ease",
          width: "100%",
        }}
      >
        <IPhone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#F2F2F7",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "50px 24px 24px",
              boxSizing: "border-box",
              gap: 24,
            }}
          >
            {/* Business logo area */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #00C896, #00A87D)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  KC
                </span>
              </div>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#0A0F1E",
                  margin: 0,
                }}
              >
                Kings Cuts London
              </p>
            </div>

            {/* Headline */}
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#0A0F1E",
                margin: 0,
                textAlign: "center",
              }}
            >
              How was your visit?
            </h2>

            {/* Stars — pointer events prevent flicker on desktop; large touch targets for mobile */}
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((i) => {
                const filled = stars > 0 ? i <= stars : i <= hoverStar;
                const color =
                  stars > 0
                    ? stars <= 3
                      ? i <= stars ? "#F5A623" : "#D1D5DB"
                      : i <= stars ? "#00C896"  : "#D1D5DB"
                    : filled ? "#00C896" : "#D1D5DB";
                return (
                  <span
                    key={i}
                    onClick={() => selectStars(i)}
                    onPointerEnter={() => setHoverStar(i)}
                    onPointerLeave={() => setHoverStar(0)}
                    style={{
                      fontSize: 40,
                      color,
                      cursor: "pointer",
                      transition: "color 0.15s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 52,
                      height: 52,
                      WebkitTapHighlightColor: "transparent",
                      userSelect: "none",
                      animation:
                        stars >= 4 && i <= stars
                          ? `starPop 0.3s ease ${(i - 1) * 0.08}s both`
                          : "none",
                    }}
                  >
                    ★
                  </span>
                );
              })}
            </div>

            {/* No buttons here — options appear after star selection */}
          </div>
        </IPhone>

        {!presenterMode && (
          <p
            className="demo-hint"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              fontStyle: "italic",
              margin: 0,
              textAlign: "center",
            }}
          >
            Click 3 stars first to show the negative flow - then use Reset to
            try 5 stars
          </p>
        )}
      </div>
    );
  }

  function Stage3() {
    return (
      <div
        className="demo-stage-wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          animation: "fadeIn 0.4s ease",
          width: "100%",
        }}
      >
        <IPhone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#fff",
              overflow: "auto",
            }}
          >
            <div
              style={{
                padding: "60px 24px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40 }}>😟</div>
                <h2
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#0A0F1E",
                    margin: "8px 0 4px",
                  }}
                >
                  Thanks for letting us know, James.
                </h2>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: "#6B7280",
                    margin: 0,
                  }}
                >
                  Would you like to tell Kings Cuts what happened?
                </p>
              </div>

              <button
                style={{
                  background: "#00C896",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 20px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Send Kings Cuts a private message
              </button>

              <textarea
                value={
                  privateNote ||
                  "The wait time was longer than expected and nobody let me know."
                }
                onChange={(e) => setPrivateNote(e.target.value)}
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  padding: "12px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: "#374151",
                  resize: "none",
                  height: 80,
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={() => {
                  setNegativeMode(true);
                  setStage(6);
                }}
                style={{
                  background: "#00C896",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Send feedback →
              </button>

              <p
                style={{
                  textAlign: "center",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#9CA3AF",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                Leave a Google review instead →
              </p>
            </div>
          </div>
        </IPhone>

        {!presenterMode && (
          <p
            className="demo-hint"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              fontStyle: "italic",
              margin: 0,
              textAlign: "center",
              maxWidth: 420,
            }}
          >
            This is what unhappy customers see - Google is still available but
            they naturally choose to message you privately first
          </p>
        )}

        {!presenterMode && (
          <button
            onClick={backToStars}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 9999,
              padding: "8px 20px",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
          >
            ← Back to try the 5-star flow
          </button>
        )}
      </div>
    );
  }

  function Stage4() {
    return (
      <div
        className="demo-stage-wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          animation: "fadeIn 0.4s ease",
          width: "100%",
        }}
      >
        <IPhone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#fff",
            }}
          >
            <div
              style={{
                padding: "60px 24px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🙏</div>
                <h2
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#0A0F1E",
                    margin: "8px 0 4px",
                  }}
                >
                  Amazing - thank you James!
                </h2>
              </div>

              {/* Star display */}
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 28,
                      color: "#00C896",
                      animation: `starPop 0.3s ease ${(i - 1) * 0.08}s both`,
                      display: "inline-block",
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => setStage(5)}
                style={{
                  background: "#00C896",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "16px 20px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                  boxShadow: "0 4px 20px rgba(0,200,150,0.4)",
                }}
              >
                Share your experience on Google ★
              </button>

              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: "#9CA3AF",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                Send us a private note instead →
              </p>
            </div>
          </div>
        </IPhone>

        {!presenterMode && (
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              fontStyle: "italic",
              margin: 0,
              textAlign: "center",
            }}
          >
            Happy customers are guided to Google - this is where your rating
            improves
          </p>
        )}
      </div>
    );
  }

  function Stage5() {
    return (
      <div
        className="demo-stage-wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          animation: "fadeIn 0.4s ease",
          width: "100%",
        }}
      >
        <IPhone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {/* Google Maps header */}
            <div
              style={{
                padding: "50px 16px 16px",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background:
                      "linear-gradient(135deg, #4285F4, #34A853)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 14,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    G
                  </span>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0A0F1E",
                      margin: 0,
                    }}
                  >
                    Kings Cuts London
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "#6B7280",
                      margin: 0,
                    }}
                  >
                    4.3 ★ · Barbershop
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  margin: 0,
                }}
              >
                Rate your experience
              </p>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    style={{ fontSize: 24, color: "#F5A623" }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            {/* Review textarea */}
            <div style={{ flex: 1, padding: "16px" }}>
              <textarea
                ref={reviewTextRef}
                defaultValue=""
                placeholder="Share your experience (optional)"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  padding: "12px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  color: "#374151",
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Post button */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <button
                onClick={() => {
                  // Capture the uncontrolled textarea value at click time — no re-render on every keystroke
                  setReviewText(reviewTextRef.current?.value ?? "");
                  playSound("success");
                  setShowToast(true);
                  setTimeout(() => {
                    setNegativeMode(false);
                    setStage(6);
                    setDashboardAnimating(true);
                    playSound("notify");
                  }, 1500);
                }}
                style={{
                  width: "100%",
                  background: "#4285F4",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Post
              </button>
            </div>

            {/* Success overlay */}
            {showToast && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    padding: "32px",
                    textAlign: "center",
                    animation: "tickPop 0.4s ease",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      background: "#00C896",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                    }}
                  >
                    <svg
                      width="28"
                      height="22"
                      viewBox="0 0 28 22"
                      fill="none"
                    >
                      <path
                        d="M2 11L10 19L26 3"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#0A0F1E",
                      margin: 0,
                    }}
                  >
                    Review posted!
                  </p>
                </div>
              </div>
            )}
          </div>
        </IPhone>

      </div>
    );
  }

  function Stage6Dashboard() {
    return (
      <div
        style={{
          animation: "slideInRight 0.6s ease",
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* Dashboard header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                margin: 0,
              }}
            >
              Kings Cuts London
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                margin: "4px 0 0",
              }}
            >
              Dashboard - live view
            </p>
          </div>

          {/* Notification bell */}
          <div style={{ position: "relative", cursor: "pointer" }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {dashboardAnimating && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#00C896",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "tickPop 0.4s ease 1s both",
                }}
              >
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  1
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {/* Google Reviews Generated */}
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 8px",
              }}
            >
              Google Reviews Generated
            </p>
            <p
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 40,
                fontWeight: 800,
                color: "#00C896",
                margin: 0,
                animation: dashboardAnimating
                  ? "countUp 0.3s ease 0.8s both"
                  : "none",
              }}
            >
              {dashboardAnimating ? googleReviewCount : 28}
            </p>
            {dashboardAnimating && !negativeMode && (
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#00C896",
                  margin: "4px 0 0",
                  animation: "fadeIn 0.4s ease 1.2s both",
                }}
              >
                +1 just now
              </p>
            )}
          </div>

          {/* Average Rating */}
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 8px",
              }}
            >
              Average Rating
            </p>
            <p
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 40,
                fontWeight: 800,
                color: "#fff",
                margin: 0,
              }}
            >
              {dashboardAnimating ? avgRating : "4.3"} ★
            </p>
            {dashboardAnimating && !negativeMode && (
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#00C896",
                  margin: "4px 0 0",
                  animation: "fadeIn 0.4s ease 1.5s both",
                }}
              >
                up from 4.3
              </p>
            )}
          </div>

          {/* Negative Reviews Shielded */}
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 8px",
              }}
            >
              Negative Reviews Shielded
            </p>
            <p
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 40,
                fontWeight: 800,
                color: "#fff",
                margin: 0,
              }}
            >
              {negativeMode ? negativeShielded : 3}
            </p>
            {negativeMode && (
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#00C896",
                  margin: "4px 0 0",
                  animation: "fadeIn 0.4s ease 0.5s both",
                }}
              >
                +1 just now
              </p>
            )}
          </div>
        </div>

        {/* Two column: activity + reviews */}
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}
        >
          {/* Recent Activity */}
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.5)",
                margin: "0 0 16px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Recent Activity
            </p>

            {/* Live positive row */}
            {dashboardAnimating && !negativeMode && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(0,200,150,0.15)",
                  border: "1px solid rgba(0,200,150,0.3)",
                  marginBottom: 8,
                  animation: "slideInRight 0.4s ease 0.4s both",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#00C896",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    James Mitchell
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      margin: 0,
                    }}
                  >
                    5 stars - Redirected to Google - just now
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    color: "#00C896",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  just now
                </span>
              </div>
            )}

            {/* Live negative row */}
            {negativeMode && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,77,77,0.1)",
                  border: "1px solid rgba(255,77,77,0.3)",
                  marginBottom: 8,
                  animation: "slideInRight 0.4s ease both",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#FF4D4D",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    ⚠ James Mitchell
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      margin: 0,
                    }}
                  >
                    2 stars - Private feedback - "The wait time was longer than
                    expected" - just now
                  </p>
                </div>
              </div>
            )}

            {/* Static older rows */}
            {[
              {
                name: "Sarah K.",
                detail: "5 stars - Redirected to Google",
                time: "2h ago",
                positive: true,
              },
              {
                name: "Marcus T.",
                detail: "4 stars - Redirected to Google",
                time: "5h ago",
                positive: true,
              },
              {
                name: "Priya S.",
                detail: "2 stars - Private feedback handled",
                time: "Yesterday",
                positive: false,
              },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: row.positive ? "#00C896" : "#FF4D4D",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    {row.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.4)",
                      margin: 0,
                    }}
                  >
                    {row.detail}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.time}
                </span>
              </div>
            ))}
          </div>

          {/* Right column: reviews or feedback inbox */}
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            {!negativeMode ? (
              <>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.5)",
                    margin: "0 0 16px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Latest Google Reviews
                </p>

                {/* Live review card */}
                {showReviewCard && (
                  <div
                    style={{
                      background: "rgba(0,200,150,0.08)",
                      border: "1px solid rgba(0,200,150,0.2)",
                      borderRadius: 12,
                      padding: "14px 16px",
                      marginBottom: 10,
                      animation: "slideInRight 0.5s ease both",
                      boxShadow: "0 0 20px rgba(0,200,150,0.15)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #00C896, #00A87D)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          JM
                        </span>
                      </div>
                      <div>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            margin: 0,
                          }}
                        >
                          James Mitchell
                        </p>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            color: "#00C896",
                            margin: 0,
                          }}
                        >
                          ★★★★★ · just now
                        </p>
                      </div>
                    </div>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.8)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      &quot;
                      {reviewText ||
                        "Great experience, will be coming back for sure"}
                      &quot;
                    </p>
                  </div>
                )}

                {/* Static older reviews */}
                {[
                  {
                    initials: "SK",
                    name: "Sarah K.",
                    text: "Always a great cut, very friendly staff",
                    rating: 5,
                    time: "2h ago",
                  },
                  {
                    initials: "MT",
                    name: "Marcus T.",
                    text: "Solid barbers, good price",
                    rating: 4,
                    time: "5h ago",
                  },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          {r.initials}
                        </span>
                      </div>
                      <div>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#fff",
                            margin: 0,
                          }}
                        >
                          {r.name}
                        </p>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 11,
                            color: "#F5A623",
                            margin: 0,
                          }}
                        >
                          {"★".repeat(r.rating)} · {r.time}
                        </p>
                      </div>
                    </div>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                        margin: 0,
                      }}
                    >
                      &quot;{r.text}&quot;
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* Negative mode: Feedback Inbox */}
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.5)",
                    margin: "0 0 16px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Feedback Inbox
                </p>

                <div
                  style={{
                    background: "rgba(255,77,77,0.08)",
                    border: "1px solid rgba(255,77,77,0.2)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 12,
                    animation: "slideInRight 0.4s ease both",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#fff",
                          margin: 0,
                        }}
                      >
                        James Mitchell
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 12,
                          color: "#FF4D4D",
                          margin: 0,
                        }}
                      >
                        ★★ · 2 stars · just now
                      </p>
                    </div>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        background: "rgba(255,77,77,0.2)",
                        color: "#FF4D4D",
                        padding: "3px 8px",
                        borderRadius: 9999,
                        fontWeight: 600,
                      }}
                    >
                      New
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.8)",
                      margin: "0 0 12px",
                      lineHeight: 1.5,
                    }}
                  >
                    &quot;The wait time was longer than expected and nobody let
                    me know.&quot;
                  </p>

                  {/* AI Reply */}
                  <div
                    style={{
                      background: "rgba(0,200,150,0.08)",
                      border: "1px solid rgba(0,200,150,0.15)",
                      borderRadius: 10,
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#00C896",
                        margin: "0 0 8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      AI Suggested Reply
                    </p>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.75)",
                        margin: "0 0 10px",
                        lineHeight: 1.6,
                      }}
                    >
                      {aiTone === "apologetic" &&
                        "Hi James, thank you for taking the time to share this with us. We're really sorry about the wait - that's not the experience we want for you. We'd love to make it up to you on your next visit. Please ask for [Owner Name] directly and we'll take care of you. - Kings Cuts"}
                      {aiTone === "professional" &&
                        "Hi James, thank you for your feedback. We apologise that the wait time wasn't communicated clearly. We're looking into how we can improve our scheduling. We hope to see you again soon. - Kings Cuts"}
                      {aiTone === "personal" &&
                        "Hey James - really sorry about that, honestly. The wait should never have been that long without someone checking in with you. That's on us. Come back and we'll sort you out personally. - Kings Cuts"}
                    </p>
                    {/* Tone buttons */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {(
                        [
                          "apologetic",
                          "professional",
                          "personal",
                        ] as const
                      ).map((tone) => (
                        <button
                          key={tone}
                          onClick={() => setAiTone(tone)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 9999,
                            border: `1px solid ${
                              aiTone === tone
                                ? "#00C896"
                                : "rgba(255,255,255,0.15)"
                            }`,
                            background:
                              aiTone === tone
                                ? "rgba(0,200,150,0.15)"
                                : "transparent",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 11,
                            fontWeight: 500,
                            color:
                              aiTone === tone
                                ? "#00C896"
                                : "rgba(255,255,255,0.5)",
                            cursor: "pointer",
                            textTransform: "capitalize",
                          }}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sub-label */}
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
            marginTop: 24,
          }}
        >
          {negativeMode
            ? "Private feedback captured - never reached Google"
            : "This is what your dashboard looks like after every positive visit"}
        </p>

        {/* Toggle to negative flow */}
        {!negativeMode && !presenterMode && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              onClick={() => {
                setNegativeMode(true);
                setNegativeShielded(4);
              }}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                background: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 9999,
                padding: "8px 20px",
                cursor: "pointer",
              }}
            >
              See what happens with negative feedback
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------- RENDER --------
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@400;700;800&display=swap');

        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,200,150,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(0,200,150,0); }
        }
        @keyframes starPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        @keyframes slideInRight {
          from { transform: translateX(60px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-60px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes countUp {
          from { opacity: 0.3; }
          to   { opacity: 1;   }
        }
        @keyframes toastSlide {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes greenFlash {
          0%   { background: rgba(0,200,150,0.3); }
          100% { background: rgba(255,255,255,0.04); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes tickPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        * { box-sizing: border-box; }
        body { margin: 0; }

        /* Mobile: tighter gaps and smaller text so phone stays on screen */
        @media (max-width: 768px) {
          .demo-stage-wrap { gap: 16px !important; }
          .demo-stage-title h1 { font-size: 22px !important; }
          .demo-stage-title p  { font-size: 13px !important; }
          .demo-hint { display: none !important; }
          .demo-topbar { padding: 0 16px !important; height: 56px !important; }
          .demo-topbar-controls button { padding: 6px 10px !important; font-size: 11px !important; }
          .demo-progress-dots { display: none; }
        }
      `}</style>

      {/* Ambient background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "linear-gradient(135deg, #0A0F1E 0%, #0d1929 50%, #0A0F1E 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 12s ease infinite",
        }}
      />

      {/* Top bar */}
      <div
        className="demo-topbar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          background: "rgba(10,15,30,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 18,
            fontWeight: 800,
            color: "#00C896",
          }}
        >
          vomni
        </span>

        {/* Progress dots */}
        <div className="demo-progress-dots" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((dot) => {
            const isActive = activeDot === dot;
            const isDone = activeDot > dot;
            return (
              <div
                key={dot}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isActive
                    ? "#00C896"
                    : isDone
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(255,255,255,0.2)",
                  transition: "all 0.4s ease",
                }}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="demo-topbar-controls" style={{ display: "flex", gap: 8 }}>
          <button
            onClick={toggleSound}
            style={{
              padding: "7px 14px",
              borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
            }}
          >
            {soundOn ? "Sound On" : "Sound Off"}
          </button>
          <button
            onClick={() => setPresenterMode((p) => !p)}
            style={{
              padding: "7px 14px",
              borderRadius: 9999,
              border: `1px solid ${
                presenterMode ? "#00C896" : "rgba(255,255,255,0.2)"
              }`,
              background: presenterMode
                ? "rgba(0,200,150,0.15)"
                : "transparent",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: presenterMode ? "#00C896" : "rgba(255,255,255,0.7)",
              cursor: "pointer",
            }}
          >
            {presenterMode ? "Presenter ON" : "Presenter Mode"}
          </button>
          {!presenterMode && (
            <button
              onClick={resetDemo}
              style={{
                padding: "7px 14px",
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              Reset Demo
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 16px 32px",
          boxSizing: "border-box",
        }}
      >
        {stage === 1 && <Stage1 />}
        {stage === 2 && <Stage2 />}
        {stage === 3 && <Stage3 />}
        {stage === 4 && <Stage4 />}
        {stage === 5 && <Stage5 />}
        {(stage === 6 || stage === 7) && <Stage6Dashboard />}
      </div>

      {/* Dashboard toast notification */}
      {dashboardAnimating && stage === 6 && !negativeMode && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 24,
            zIndex: 200,
            background: "#fff",
            borderRadius: 14,
            padding: "14px 18px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            animation: "toastSlide 0.5s ease 0.6s both",
            maxWidth: 300,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#00C896",
                flexShrink: 0,
                marginTop: 4,
              }}
            />
            <div>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0A0F1E",
                  margin: "0 0 2px",
                }}
              >
                New 5-star review on Google
              </p>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#6B7280",
                  margin: 0,
                }}
              >
                James Mitchell - just now
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Book a Demo button */}
      <a
        href="https://vomni-app.vercel.app/#book-demo"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 300,
          background: "#00C896",
          color: "#fff",
          textDecoration: "none",
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          padding: "12px 24px",
          borderRadius: 9999,
          boxShadow: "0 4px 20px rgba(0,200,150,0.4)",
        }}
      >
        Book a Demo →
      </a>
    </>
  );
}
