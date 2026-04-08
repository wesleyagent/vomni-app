"use client";

import { useState, useEffect } from "react";

const G = "#00C896";
const N = "#0A0F1E";

interface Stats {
  googleReviews: number;
  negativeCaught: number;
  completionRate: number;
}

interface Props {
  plan: string | null;
  businessId: string;
  smsLimit: number;
  stats: Stats;
  onTopUpSuccess: (newLimit: number | null) => void;
  onUpgradeSuccess: (newPlan: string) => void;
}

type View = "limit" | "interstitial" | "topup-success" | "upgrade-success";

const TOP_UP_PACKAGES = [
  { credits: 20,  price: "£9",  slug: "topup-20"  },
  { credits: 50,  price: "£20", slug: "topup-50"  },
  { credits: 100, price: "£35", slug: "topup-100" },
];

const UPGRADE_FEATURES: Record<string, { headline: string; features: string[]; price: string; plan: string }> = {
  starter: {
    headline: "Keep the momentum going every month",
    plan: "Growth",
    price: "£79",
    features: [
      "Automated follow-ups after every visit",
      "Lapsed customer re-engagement via WhatsApp",
      "Full analytics + weekly email reports",
      "Priority support",
      "£79/month — cancel anytime",
    ],
  },
  growth: {
    headline: "Never worry about limits again",
    plan: "Pro",
    price: "£149",
    features: [
      "Everything in Growth",
      "Dedicated WhatsApp number",
      "Same-day support",
      "£149/month — cancel anytime",
    ],
  },
};

const CONFETTI = ["#00C896", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899"];

export default function LimitReachedModal({ plan, businessId, smsLimit, stats, onTopUpSuccess, onUpgradeSuccess }: Props) {
  const [view, setView]                     = useState<View>("limit");
  const [selectedPkg, setSelectedPkg]       = useState<typeof TOP_UP_PACKAGES[number] | null>(null);
  const [interstitialSeen, setInterstitialSeen] = useState(false);
  const [buying, setBuying]                 = useState(false);
  const [upgrading, setUpgrading]           = useState(false);
  const [successCredits, setSuccessCredits] = useState(0);
  const [successPlan, setSuccessPlan]       = useState("");

  const normalizedPlan = (!plan || plan === "monthly" || plan === "annual") ? "starter" : plan;
  const upgradeKey     = normalizedPlan === "pro" ? "growth" : normalizedPlan; // fallback
  const upgrade        = UPGRADE_FEATURES[upgradeKey] ?? UPGRADE_FEATURES.starter;
  const upgradePlanKey = upgradeKey === "starter" ? "growth" : "pro";

  async function handleTopUpClick(pkg: typeof TOP_UP_PACKAGES[number]) {
    setSelectedPkg(pkg);
    if (!interstitialSeen) {
      setView("interstitial");
    } else {
      await doTopUp(pkg);
    }
  }

  async function doTopUp(pkg: typeof TOP_UP_PACKAGES[number]) {
    setBuying(true);
    try {
      const res = await fetch("/api/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, credits: pkg.credits }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessCredits(pkg.credits);
        setView("topup-success");
        onTopUpSuccess(null);
      }
    } finally {
      setBuying(false);
    }
  }

  async function handleInterstitialTopUp() {
    setInterstitialSeen(true);
    if (selectedPkg) await doTopUp(selectedPkg);
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, plan: upgradePlanKey }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessPlan(upgrade.plan);
        setView("upgrade-success");
        onUpgradeSuccess(upgradePlanKey);
      }
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(140px) rotate(540deg); opacity: 0; }
        }
        @keyframes modalIn {
          from { transform: translate(-50%,-50%) scale(0.93); opacity: 0; }
          to   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        @keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }
        .topup-btn:hover { border-color: ${G} !important; color: ${G} !important; }
      `}</style>

      {/* Overlay */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(10,15,30,0.72)", zIndex: 200, backdropFilter: "blur(4px)", animation: "fadeOverlay 0.25s ease" }} />

      {/* Card */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(560px, calc(100vw - 32px))",
        background: "#fff", borderRadius: 16,
        boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
        zIndex: 201, padding: "36px 36px 32px",
        animation: "modalIn 0.3s ease",
        maxHeight: "92vh", overflowY: "auto",
      }}>

        {/* ── LIMIT REACHED ── */}
        {view === "limit" && (
          <>
            {/* Pill */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <span style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 9999 }}>
                This month's review requests are paused
              </span>
            </div>

            {/* Stats */}
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", textAlign: "center", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Here is what Vomni did for you this month
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
              {[
                { value: stats.googleReviews, label: "Google reviews generated" },
                { value: stats.negativeCaught, label: "Private feedback caught" },
                { value: `${stats.completionRate}%`, label: "Completion rate" },
              ].map(s => (
                <div key={s.label} style={{ background: "#F9FAFB", border: "1px solid #F0F0F0", borderRadius: 12, padding: "16px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 26, color: N }}>{s.value}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Upgrade section */}
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 24, color: N, margin: "0 0 20px", textAlign: "center" }}>
              {upgrade.headline}
            </h2>

            <div style={{ background: `${G}0D`, border: `1.5px solid ${G}40`, borderRadius: 14, padding: "20px 22px", marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {upgrade.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="8.5" cy="8.5" r="8" fill={G} fillOpacity="0.15" />
                      <path d="M5.5 8.5l2.2 2.2 3.8-3.8" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                style={{ width: "100%", padding: "15px", borderRadius: 10, border: "none", background: upgrading ? "#9CA3AF" : G, color: "#fff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, cursor: upgrading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
              >
                {upgrading ? "Upgrading..." : `Upgrade to ${upgrade.plan} — ${upgrade.price}/month →`}
              </button>
            </div>

            {/* Top-up section */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 18 }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", textAlign: "center", margin: "0 0 12px" }}>
                Need just a little more this month?
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {TOP_UP_PACKAGES.map(pkg => (
                  <button
                    key={pkg.credits}
                    className="topup-btn"
                    onClick={() => handleTopUpClick(pkg)}
                    style={{ padding: "8px 16px", border: "1.5px solid #D1D5DB", borderRadius: 9999, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", cursor: "pointer", transition: "all 0.15s" }}
                  >
                    {pkg.credits} credits — {pkg.price}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TOP-UP INTERSTITIAL ── */}
        {view === "interstitial" && selectedPkg && (
          <>
            <button
              onClick={() => setView("limit")}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginBottom: 22, padding: 0 }}
            >
              ← Back
            </button>

            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, color: N, margin: "0 0 6px" }}>
              Before you top up — worth a quick look
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", margin: "0 0 22px" }}>
              You might be better off upgrading.
            </p>

            {/* Two-column comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {/* Top-up column */}
              <div style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: 18 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 14, color: N, marginBottom: 14 }}>
                  One-off top up
                </div>
                {[
                  `${selectedPkg.credits} credits this month only`,
                  "Expires end of billing period",
                  "No additional features",
                  `${selectedPkg.price} one time`,
                ].map(f => (
                  <div key={f} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginBottom: 7, display: "flex", gap: 7 }}>
                    <span style={{ flexShrink: 0 }}>–</span>{f}
                  </div>
                ))}
              </div>

              {/* Upgrade column */}
              <div style={{ background: `${G}08`, border: `2px solid ${G}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 14, color: N }}>
                    Upgrade to {upgrade.plan}
                  </span>
                  <span style={{ background: G, color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 9999 }}>
                    Better value
                  </span>
                </div>
                {[
                  `${upgradePlanKey === "pro" ? "Unlimited" : "300"} credits every single month`,
                  `All ${upgrade.plan} features included`,
                  "Cancel anytime",
                  `${upgrade.price}/month`,
                ].map(f => (
                  <div key={f} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#374151", marginBottom: 7, display: "flex", gap: 7 }}>
                    <span style={{ color: G, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              style={{ width: "100%", padding: "15px", borderRadius: 10, border: "none", background: upgrading ? "#9CA3AF" : G, color: "#fff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, cursor: upgrading ? "not-allowed" : "pointer", marginBottom: 12, transition: "background 0.2s" }}
            >
              {upgrading ? "Upgrading..." : `Upgrade to ${upgrade.plan} — ${upgrade.price}/month →`}
            </button>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleInterstitialTopUp}
                disabled={buying}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", textDecoration: "underline" }}
              >
                {buying ? "Adding credits..." : `No thanks, I just need the ${selectedPkg.credits} credits for ${selectedPkg.price} →`}
              </button>
            </div>
          </>
        )}

        {/* ── TOP-UP SUCCESS ── */}
        {view === "topup-success" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <ConfettiRow />
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "8px auto 18px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 24, color: N, margin: "0 0 10px" }}>
              Done — {successCredits} credits added.
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.7 }}>
              Your review requests are running again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "13px 36px", borderRadius: 9999, border: "none", background: G, color: "#fff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              Back to dashboard
            </button>
          </div>
        )}

        {/* ── UPGRADE SUCCESS ── */}
        {view === "upgrade-success" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <ConfettiRow big />
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "8px auto 18px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={G}/>
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 24, color: N, margin: "0 0 10px" }}>
              Welcome to {successPlan}.
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.7 }}>
              Your review requests are running again — and now they will never stop.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "13px 36px", borderRadius: 9999, border: "none", background: G, color: "#fff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              Let's go →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function ConfettiRow({ big = false }: { big?: boolean }) {
  return (
    <div style={{ position: "relative", height: 60, overflow: "hidden", marginBottom: 4 }}>
      {CONFETTI.map((color, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${10 + i * 14}%`,
          top: 0,
          width: big ? 12 : 9,
          height: big ? 12 : 9,
          borderRadius: i % 2 === 0 ? "50%" : 2,
          background: color,
          animation: `confettiFall ${0.8 + i * 0.1}s ease-out ${i * 0.07}s forwards`,
        }} />
      ))}
    </div>
  );
}
