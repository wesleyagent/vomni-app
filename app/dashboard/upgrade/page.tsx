"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { BusinessContext } from "../_context";

const G = "#00C896";
const N = "#0A0F1E";

const PLANS = [
  {
    name: "Starter",
    monthlyVariant: 1516792,
    yearlyVariant: 1516801,
    monthlyPrice: 35,
    yearlyPrice: 299,
    features: [
      "Booking page, live in 5 minutes",
      "Automated WhatsApp review requests after every visit",
      "Basic dashboard",
      "Email support",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    monthlyVariant: 1516802,
    yearlyVariant: 1516809,
    monthlyPrice: 79,
    yearlyPrice: 699,
    features: [
      "Everything in Starter",
      "Automated follow-ups after every visit",
      "Lapsed customer re-engagement via WhatsApp",
      "Full analytics + weekly email reports",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Pro",
    monthlyVariant: 1516812,
    yearlyVariant: 1516813,
    monthlyPrice: 149,
    yearlyPrice: 1499,
    features: [
      "Everything in Growth",
      "Dedicated WhatsApp number",
      "Same-day support",
    ],
    highlight: false,
  },
];

export default function UpgradePage() {
  const ctx = useContext(BusinessContext);
  const router = useRouter();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);

  async function handleChoose(variantId: number) {
    if (!ctx?.email || loading !== null) return;
    setLoading(variantId);
    try {
      const res = await fetch("/api/lemonsqueezy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          email: ctx.email,
          businessId: ctx.businessId,
          isUpgrade: true,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      /* silently fail */
    }
    setLoading(null);
  }

  return (
    <div style={{ padding: "48px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important; }
        .plan-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .choose-btn:hover:not(:disabled) { opacity: 0.88; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontFamily: "Inter, sans-serif", fontSize: 14, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, margin: "0 auto 24px" }}
        >
          ← Back to dashboard
        </button>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 700, color: N, margin: "0 0 12px" }}>
          Choose your plan
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#6B7280", margin: "0 0 32px" }}>
          Subscribe to keep growing your Google reviews
        </p>

        {/* Monthly / Yearly Toggle */}
        <div style={{ display: "inline-flex", background: "#F3F4F6", borderRadius: 9999, padding: 4, gap: 4 }}>
          <button
            onClick={() => setYearly(false)}
            style={{
              padding: "8px 24px",
              borderRadius: 9999,
              border: "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              background: !yearly ? "#fff" : "transparent",
              color: !yearly ? N : "#6B7280",
              boxShadow: !yearly ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            style={{
              padding: "8px 24px",
              borderRadius: 9999,
              border: "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              background: yearly ? "#fff" : "transparent",
              color: yearly ? N : "#6B7280",
              boxShadow: yearly ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            Yearly
            <span style={{ marginLeft: 6, background: "rgba(0,200,150,0.12)", color: G, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 9999 }}>
              Save ~30%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "start" }}>
        {PLANS.map(plan => {
          const variantId = yearly ? plan.yearlyVariant : plan.monthlyVariant;
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isLoading = loading === variantId;

          return (
            <div
              key={plan.name}
              className="plan-card"
              style={{
                background: "#fff",
                border: plan.highlight ? `2px solid ${G}` : "1px solid #E5E7EB",
                borderRadius: 16,
                padding: "32px 28px",
                position: "relative",
                boxShadow: plan.highlight ? "0 8px 32px rgba(0,200,150,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: G,
                  color: "#fff",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 16px",
                  borderRadius: 9999,
                  whiteSpace: "nowrap",
                }}>
                  Most Popular
                </div>
              )}

              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                {plan.name}
              </h2>

              <div style={{ marginBottom: 24 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 700, color: N }}>
                  £{price}
                </span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF", marginLeft: 4 }}>
                  /{yearly ? "year" : "month"}
                </span>
                {yearly && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: G, marginTop: 4, fontWeight: 600 }}>
                    (£{Math.round(price / 12)}/mo billed annually)
                  </div>
                )}
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151" }}>
                    <span style={{ color: G, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="choose-btn"
                onClick={() => handleChoose(variantId)}
                disabled={loading !== null}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 9999,
                  border: plan.highlight ? "none" : `2px solid ${G}`,
                  background: plan.highlight ? G : "transparent",
                  color: plan.highlight ? "#fff" : G,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading !== null ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
                    Loading…
                  </>
                ) : (
                  `Choose ${plan.name} →`
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", marginTop: 32 }}>
        Cancel anytime.
      </p>
    </div>
  );
}
