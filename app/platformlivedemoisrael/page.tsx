"use client";

import { useState, useEffect, useRef } from "react";

function IPhone({ children, slideLeft }: { children: React.ReactNode; slideLeft?: boolean }) {
  return (
    <div
      style={{
        width: 320,
        height: 640,
        background: "#1C1C1E",
        borderRadius: 50,
        border: "10px solid #2C2C2E",
        boxShadow: "0 0 0 2px #3A3A3C, 0 40px 80px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
        transform: slideLeft ? "translateX(-120%)" : "translateX(0)",
        opacity: slideLeft ? 0 : 1,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 30, background: "#1C1C1E", borderRadius: "0 0 20px 20px", zIndex: 10 }} />
      <div style={{ width: "100%", height: "100%", background: "#000", overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

export default function PlatformLiveDemoIsrael() {
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
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch { return null; }
    }
    return audioCtxRef.current;
  }

  function playTone(freq: number, duration: number, volume = 0.15, type: OscillatorType = "sine") {
    const ctx = getAudioCtx();
    if (!ctx) return;
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
    if (type === "chime") { playTone(880, 0.15, 0.15); setTimeout(() => playTone(660, 0.3, 0.12), 120); }
    else if (type === "click") { playTone(600, 0.06, 0.1); }
    else if (type === "success") { playTone(523, 0.12, 0.13); setTimeout(() => playTone(659, 0.12, 0.13), 120); setTimeout(() => playTone(784, 0.25, 0.13), 240); }
    else if (type === "notify") { playTone(740, 0.12, 0.1); setTimeout(() => playTone(880, 0.25, 0.1), 110); }
  }

  function toggleSound() {
    if (!soundOn) getAudioCtx();
    setSoundOn(s => !s);
  }

  useEffect(() => {
    const t = setTimeout(() => setNotifVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (stage === 6 && !negativeMode) {
      setDashboardAnimating(true);
      setGoogleReviewCount(29);
      setAvgRating("4.4");
      const t1 = setTimeout(() => setShowReviewCard(true), 1200);
      const t2 = setTimeout(() => setShowToast(false), 100);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectStars(n: number) {
    playSound("click");
    setStars(n);
    if (n <= 3) setTimeout(() => setStage(3), 600);
    else setTimeout(() => setStage(4), 800);
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

  const activeDot = stage <= 2 ? stage : stage <= 4 ? 3 : stage === 5 ? 4 : 5;

  // ── STAGES ──────────────────────────────────────────────────────────────

  function Stage1() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, animation: "fadeIn 0.4s ease" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Heebo', 'Inter', sans-serif", fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 8px", direction: "rtl" }}>
            ראו איך Vomni עובד
          </h1>
          <p style={{ fontFamily: "'Heebo', 'Inter', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)", margin: 0, direction: "rtl" }}>
            לקוח זה רק סיים את התור — הנה ההודעה מגיעה...
          </p>
        </div>

        <IPhone>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg, #1a1a3e 0%, #0a0a1e 100%)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            <div style={{ paddingTop: 80, textAlign: "center" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 64, fontWeight: 200, color: "#fff", margin: 0, lineHeight: 1 }}>14:32</p>
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.7)", margin: "8px 0 0" }}>שני, 27 במרץ</p>
            </div>
            <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }} />
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }} />
            </div>
            {notifVisible && (
              <div
                onClick={() => { playSound("chime"); setNotifTapped(true); setTimeout(() => setStage(2), 400); }}
                style={{ position: "absolute", top: 12, left: 12, right: 12, background: "rgba(30,30,30,0.95)", backdropFilter: "blur(20px)", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10, animation: "slideDown 0.5s ease forwards, pulse 2s ease-in-out 0.5s infinite", cursor: "pointer", zIndex: 20, direction: "rtl" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00C896, #00A87D)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>Kings Cuts תל אביב</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>עכשיו</span>
                  </div>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "2px 0 0", lineHeight: 1.4 }}>
                    שלום יוסי, תודה על הביקור היום! מה היה הניסיון שלך? לחץ לדירוג 👇
                  </p>
                </div>
              </div>
            )}
          </div>
        </IPhone>

        {!notifTapped && notifVisible && (
          <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", animation: "fadeIn 0.6s ease 0.8s both", margin: 0, direction: "rtl" }}>
            לחצו על ההתראה לפתיחה
          </p>
        )}
      </div>
    );
  }

  function Stage2() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, animation: "fadeIn 0.4s ease" }}>
        <IPhone>
          <div style={{ width: "100%", height: "100%", background: "#F2F2F7", display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 24px 24px", boxSizing: "border-box", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #00C896, #00A87D)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 800, color: "#fff" }}>KC</span>
              </div>
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 15, fontWeight: 700, color: "#0A0F1E", margin: 0 }}>Kings Cuts תל אביב</p>
            </div>
            <h2 style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 20, fontWeight: 700, color: "#0A0F1E", margin: 0, textAlign: "center", direction: "rtl" }}>
              איך היה הביקור?
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => {
                const filled = stars > 0 ? i <= stars : i <= hoverStar;
                const color = stars > 0 ? (stars <= 3 ? (i <= stars ? "#F5A623" : "#D1D5DB") : (i <= stars ? "#00C896" : "#D1D5DB")) : (filled ? "#00C896" : "#D1D5DB");
                return (
                  <span key={i} onClick={() => selectStars(i)} onMouseEnter={() => setHoverStar(i)} onMouseLeave={() => setHoverStar(0)}
                    style={{ fontSize: 36, color, cursor: "pointer", transition: "color 0.2s ease, transform 0.15s ease", display: "inline-block", animation: stars >= 4 && i <= stars ? `starPop 0.3s ease ${(i - 1) * 0.08}s both` : "none" }}>★</span>
                );
              })}
            </div>
          </div>
        </IPhone>
        {!presenterMode && (
          <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", fontStyle: "italic", margin: 0, textAlign: "center", direction: "rtl" }}>
            לחצו 3 כוכבים כדי לראות את הזרימה השלילית — ואז אפסו כדי לנסות 5 כוכבים
          </p>
        )}
      </div>
    );
  }

  function Stage3() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, animation: "fadeIn 0.4s ease" }}>
        <IPhone>
          <div style={{ width: "100%", height: "100%", background: "#fff", overflow: "auto" }}>
            <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: 16, direction: "rtl" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40 }}>😟</div>
                <h2 style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 20, fontWeight: 700, color: "#0A0F1E", margin: "8px 0 4px" }}>תודה שיידעת אותנו, יוסי.</h2>
                <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0 }}>האם תרצה לספר ל-Kings Cuts מה קרה?</p>
              </div>
              <button style={{ background: "#00C896", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                שלח הודעה פרטית ל-Kings Cuts
              </button>
              <textarea
                value={privateNote || "זמן ההמתנה היה ארוך מהמצופה ואף אחד לא הודיע לי."}
                onChange={(e) => setPrivateNote(e.target.value)}
                style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: "12px", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "#374151", resize: "none", height: 80, outline: "none", width: "100%", boxSizing: "border-box", direction: "rtl" }}
              />
              <button onClick={() => { setNegativeMode(true); setStage(6); }} style={{ background: "#00C896", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                ← שלח משוב
              </button>
              <p style={{ textAlign: "center", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "#9CA3AF", cursor: "pointer", margin: 0 }}>
                ← השאר ביקורת Google במקום
              </p>
            </div>
          </div>
        </IPhone>
        {!presenterMode && (
          <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", fontStyle: "italic", margin: 0, textAlign: "center", maxWidth: 420, direction: "rtl" }}>
            זה מה שלקוחות לא מרוצים רואים — Google עדיין זמין אבל הם בוחרים טבעית לשלוח הודעה פרטית תחילה
          </p>
        )}
        {!presenterMode && (
          <button onClick={backToStars} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 9999, padding: "8px 20px", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            חזרה לנסות זרימת 5 כוכבים →
          </button>
        )}
      </div>
    );
  }

  function Stage4() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, animation: "fadeIn 0.4s ease" }}>
        <IPhone>
          <div style={{ width: "100%", height: "100%", background: "#fff" }}>
            <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center", direction: "rtl" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🙏</div>
                <h2 style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 20, fontWeight: 700, color: "#0A0F1E", margin: "8px 0 4px" }}>מדהים — תודה יוסי!</h2>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} style={{ fontSize: 28, color: "#00C896", animation: `starPop 0.3s ease ${(i - 1) * 0.08}s both`, display: "inline-block" }}>★</span>
                ))}
              </div>
              <button onClick={() => setStage(5)} style={{ background: "#00C896", color: "#fff", border: "none", borderRadius: 12, padding: "16px 20px", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%", boxShadow: "0 4px 20px rgba(0,200,150,0.4)" }}>
                שתף את הניסיון שלך ב-Google ★
              </button>
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "#9CA3AF", cursor: "pointer", margin: 0 }}>
                ← שלח הערה פרטית במקום
              </p>
            </div>
          </div>
        </IPhone>
        {!presenterMode && (
          <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", fontStyle: "italic", margin: 0, textAlign: "center", direction: "rtl" }}>
            לקוחות מרוצים מופנים ל-Google — כאן הדירוג שלך משתפר
          </p>
        )}
      </div>
    );
  }

  function Stage5() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, animation: "fadeIn 0.4s ease" }}>
        <IPhone>
          <div style={{ width: "100%", height: "100%", background: "#fff", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ padding: "50px 16px 16px", borderBottom: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4285F4, #34A853)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "Inter, sans-serif" }}>G</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "#0A0F1E", margin: 0 }}>Kings Cuts תל אביב</p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", margin: 0 }}>4.3 ★ · ספרייה</p>
                </div>
              </div>
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, direction: "rtl" }}>דרג את הניסיון שלך</p>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ fontSize: 24, color: "#F5A623" }}>★</span>)}
              </div>
            </div>
            <div style={{ flex: 1, padding: "16px" }}>
              <textarea
                ref={reviewTextRef}
                defaultValue=""
                placeholder="שתף את הניסיון שלך (אופציונלי)"
                style={{ width: "100%", height: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, color: "#374151", resize: "none", outline: "none", boxSizing: "border-box", direction: "rtl" }}
              />
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB" }}>
              <button
                onClick={() => {
                  setReviewText(reviewTextRef.current?.value ?? "");
                  playSound("success");
                  setShowToast(true);
                  setTimeout(() => { setNegativeMode(false); setStage(6); setDashboardAnimating(true); playSound("notify"); }, 1500);
                }}
                style={{ width: "100%", background: "#4285F4", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                פרסם
              </button>
            </div>
            {showToast && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                <div style={{ background: "#fff", borderRadius: 20, padding: "32px", textAlign: "center", animation: "tickPop 0.4s ease" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#00C896", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <svg width="28" height="22" viewBox="0 0 28 22" fill="none"><path d="M2 11L10 19L26 3" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 16, fontWeight: 700, color: "#0A0F1E", margin: 0 }}>ביקורת פורסמה!</p>
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
      <div style={{ animation: "slideInRight 0.6s ease", width: "100%", maxWidth: 1100, margin: "0 auto", direction: "rtl" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "'Heebo', 'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>Kings Cuts תל אביב</h2>
            <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>לוח בקרה — תצוגה חיה</p>
          </div>
          <div style={{ position: "relative", cursor: "pointer" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {dashboardAnimating && (
              <div style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#00C896", display: "flex", alignItems: "center", justifyContent: "center", animation: "tickPop 0.4s ease 1s both" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "#fff" }}>1</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "20px 24px" }}>
            <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>ביקורות Google שנוצרו</p>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: "#00C896", margin: 0, animation: dashboardAnimating ? "countUp 0.3s ease 0.8s both" : "none" }}>
              {dashboardAnimating ? googleReviewCount : 28}
            </p>
            {dashboardAnimating && !negativeMode && (
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "#00C896", margin: "4px 0 0", animation: "fadeIn 0.4s ease 1.2s both" }}>+1 עכשיו</p>
            )}
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "20px 24px" }}>
            <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>דירוג ממוצע</p>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: "#fff", margin: 0 }}>
              {dashboardAnimating ? avgRating : "4.3"} ★
            </p>
            {dashboardAnimating && !negativeMode && (
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "#00C896", margin: "4px 0 0", animation: "fadeIn 0.4s ease 1.5s both" }}>עלה מ-4.3</p>
            )}
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "20px 24px" }}>
            <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>ביקורות שליליות שנחסמו</p>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: "#fff", margin: 0 }}>
              {negativeMode ? negativeShielded : 3}
            </p>
            {negativeMode && (
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "#00C896", margin: "4px 0 0", animation: "fadeIn 0.4s ease 0.5s both" }}>+1 עכשיו</p>
            )}
          </div>
        </div>

        {/* Two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Recent activity */}
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "20px 24px" }}>
            <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>פעילות אחרונה</p>
            {dashboardAnimating && !negativeMode && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(0,200,150,0.15)", border: "1px solid rgba(0,200,150,0.3)", marginBottom: 8, animation: "slideInRight 0.4s ease 0.4s both" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00C896", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>יוסי לוי</p>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>5 כוכבים — הופנה ל-Google — עכשיו</p>
                </div>
                <span style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, color: "#00C896", fontWeight: 600, whiteSpace: "nowrap" }}>עכשיו</span>
              </div>
            )}
            {negativeMode && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.3)", marginBottom: 8, animation: "slideInRight 0.4s ease both" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF4D4D", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>⚠ יוסי לוי</p>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>2 כוכבים — משוב פרטי — "זמן ההמתנה היה ארוך" — עכשיו</p>
                </div>
              </div>
            )}
            {[
              { name: "שרה כ.", detail: "5 כוכבים — הופנה ל-Google", time: "לפני שעתיים", positive: true },
              { name: "מרקוס ת.", detail: "4 כוכבים — הופנה ל-Google", time: "לפני 5 שעות", positive: true },
              { name: "פריה ס.", detail: "2 כוכבים — משוב פרטי טופל", time: "אתמול", positive: false },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.positive ? "#00C896" : "#FF4D4D", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{row.name}</p>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>{row.detail}</p>
                </div>
                <span style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{row.time}</span>
              </div>
            ))}
          </div>

          {/* Right col */}
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "20px 24px" }}>
            {!negativeMode ? (
              <>
                <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>ביקורות Google אחרונות</p>
                {showReviewCard && (
                  <div style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 10, animation: "slideInRight 0.5s ease both", boxShadow: "0 0 20px rgba(0,200,150,0.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #00C896, #00A87D)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#fff" }}>יל</span>
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>יוסי לוי</p>
                        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#00C896", margin: 0 }}>★★★★★ · עכשיו</p>
                      </div>
                    </div>
                    <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.5 }}>
                      &quot;{reviewText || "ניסיון מעולה, בטוח אחזור"}&quot;
                    </p>
                  </div>
                )}
                {[
                  { initials: "שכ", name: "שרה כ.", text: "תמיד תספורת מעולה, צוות ידידותי מאוד", rating: 5, time: "לפני שעתיים" },
                  { initials: "מת", name: "מרקוס ת.", text: "ספרים מקצועיים, מחיר טוב", rating: 4, time: "לפני 5 שעות" },
                ].map((r, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{r.initials}</span>
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#fff", margin: 0 }}>{r.name}</p>
                        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#F5A623", margin: 0 }}>{"★".repeat(r.rating)} · {r.time}</p>
                      </div>
                    </div>
                    <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>&quot;{r.text}&quot;</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>תיבת דואר משוב</p>
                <div style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, animation: "slideInRight 0.4s ease both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>יוסי לוי</p>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#FF4D4D", margin: 0 }}>★★ · 2 כוכבים · עכשיו</p>
                    </div>
                    <span style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, background: "rgba(255,77,77,0.2)", color: "#FF4D4D", padding: "3px 8px", borderRadius: 9999, fontWeight: 600 }}>חדש</span>
                  </div>
                  <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 12px", lineHeight: 1.5 }}>
                    &quot;זמן ההמתנה היה ארוך מהמצופה ואף אחד לא הודיע לי.&quot;
                  </p>
                  <div style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.15)", borderRadius: 10, padding: "12px" }}>
                    <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#00C896", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>תשובה מוצעת על ידי AI</p>
                    <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.75)", margin: "0 0 10px", lineHeight: 1.6 }}>
                      {aiTone === "apologetic" && "שלום יוסי, תודה שלקחת את הזמן לשתף אותנו. אנחנו מצטערים מאוד על ההמתנה — זה לא הניסיון שרצינו שתחווה. נשמח לפצות אותך בביקורך הבא. אנא בקש את [שם הבעלים] ישירות ונדאג לך. — Kings Cuts"}
                      {aiTone === "professional" && "שלום יוסי, תודה על המשוב שלך. אנחנו מתנצלים שזמן ההמתנה לא הועבר בצורה ברורה. אנחנו בוחנים כיצד לשפר את לוח הזמנים שלנו. אנחנו מקווים לראותך שוב בקרוב. — Kings Cuts"}
                      {aiTone === "personal" && "היי יוסי — ממש מצטערים, ברצינות. ההמתנה לא הייתה צריכה להיות כל כך ארוכה. זה עלינו. בוא שוב ונדאג לך אישית. — Kings Cuts"}
                    </p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["apologetic", "professional", "personal"] as const).map((tone) => (
                        <button key={tone} onClick={() => setAiTone(tone)} style={{ padding: "5px 10px", borderRadius: 9999, border: `1px solid ${aiTone === tone ? "#00C896" : "rgba(255,255,255,0.15)"}`, background: aiTone === tone ? "rgba(0,200,150,0.15)" : "transparent", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 11, fontWeight: 500, color: aiTone === tone ? "#00C896" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                          {tone === "apologetic" ? "מתנצל" : tone === "professional" ? "מקצועי" : "אישי"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 24 }}>
          {negativeMode ? "משוב פרטי נלכד — מעולם לא הגיע ל-Google" : "כך נראה לוח הבקרה שלך לאחר כל ביקור חיובי"}
        </p>
        {!negativeMode && !presenterMode && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => { setNegativeMode(true); setNegativeShielded(4); }} style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9999, padding: "8px 20px", cursor: "pointer" }}>
              ראה מה קורה עם משוב שלילי
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@400;700;800&display=swap');

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
      `}</style>

      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "linear-gradient(135deg, #0A0F1E 0%, #0d1929 50%, #0A0F1E 100%)", backgroundSize: "400% 400%", animation: "gradientShift 12s ease infinite" }} />

      {/* Top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 64, background: "rgba(10,15,30,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", zIndex: 100, direction: "rtl" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 800, color: "#00C896" }}>vomni</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((dot) => {
            const isActive = activeDot === dot;
            const isDone = activeDot > dot;
            return (
              <div key={dot} style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#00C896" : isDone ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", transition: "all 0.4s ease" }} />
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleSound} style={{ padding: "7px 14px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            {soundOn ? "קול מופעל" : "קול כבוי"}
          </button>
          <button onClick={() => setPresenterMode(p => !p)} style={{ padding: "7px 14px", borderRadius: 9999, border: `1px solid ${presenterMode ? "#00C896" : "rgba(255,255,255,0.2)"}`, background: presenterMode ? "rgba(0,200,150,0.15)" : "transparent", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: presenterMode ? "#00C896" : "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            {presenterMode ? "מצגת פועלת" : "מצב מצגת"}
          </button>
          {!presenterMode && (
            <button onClick={resetDemo} style={{ padding: "7px 14px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              איפוס הדמו
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 32px 48px" }}>
        {stage === 1 && <Stage1 />}
        {stage === 2 && <Stage2 />}
        {stage === 3 && <Stage3 />}
        {stage === 4 && <Stage4 />}
        {stage === 5 && <Stage5 />}
        {(stage === 6 || stage === 7) && <Stage6Dashboard />}
      </div>

      {/* Toast */}
      {dashboardAnimating && stage === 6 && !negativeMode && (
        <div style={{ position: "fixed", top: 80, right: 24, zIndex: 200, background: "#fff", borderRadius: 14, padding: "14px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "toastSlide 0.5s ease 0.6s both", maxWidth: 300, direction: "rtl" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00C896", flexShrink: 0, marginTop: 4 }} />
            <div>
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#0A0F1E", margin: "0 0 2px" }}>ביקורת 5 כוכבים חדשה ב-Google</p>
              <p style={{ fontFamily: "'Heebo', Inter, sans-serif", fontSize: 12, color: "#6B7280", margin: 0 }}>יוסי לוי — עכשיו</p>
            </div>
          </div>
        </div>
      )}

      {/* Book demo CTA */}
      <a href="https://vomni.io/#book-demo" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, background: "#00C896", color: "#fff", textDecoration: "none", fontFamily: "'Heebo', Inter, sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 9999, boxShadow: "0 4px 20px rgba(0,200,150,0.4)" }}>
        ← הזמן הדגמה
      </a>
    </>
  );
}
