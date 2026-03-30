"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { PLAN_FEATURES } from "@/lib/planFeatures";

const N = "#0A0F1E";
const G = "#00C896";

// Variant IDs from Lemon Squeezy
const VARIANTS = {
  starter: { monthly: 1460262, yearly: 1460268 },
  growth:  { monthly: 1460272, yearly: 1460276 },
  pro:     { monthly: 1460277, yearly: 1460278 },
} as const;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PricingPage() {
  const [period, setPeriod]       = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading]     = useState<string | null>(null); // which plan is loading
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Try to get logged-in user's email so we can pre-fill checkout
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);

  async function handleCheckout(plan: "starter" | "growth" | "pro") {
    setLoading(plan);
    try {
      const variantId = VARIANTS[plan][period];
      const res = await fetch("/api/lemonsqueezy/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ variantId, email: userEmail ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        console.error("[pricing] checkout API error:", json);
        throw new Error(json.error ?? "No checkout URL returned");
      }
      // Use location.assign for reliable mobile redirect (router.push blocks on external URLs)
      window.location.assign(json.url);
    } catch (err) {
      console.error("[pricing] checkout error:", err);
      alert("Something went wrong starting checkout.\n\nPlease try again or email hello@vomni.io and we'll get you set up in minutes.");
    } finally {
      setLoading(null);
    }
  }

  const yearlySavings = {
    starter: PLAN_FEATURES.starter.price_monthly * 12 - PLAN_FEATURES.starter.price_annual,
    growth:  PLAN_FEATURES.growth.price_monthly  * 12 - PLAN_FEATURES.growth.price_annual,
    pro:     PLAN_FEATURES.pro.price_monthly     * 12 - PLAN_FEATURES.pro.price_annual,
  };

  return (
    <div style={{ minHeight: "100vh", background: N, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .pricing-hero-h1 { font-size: 36px !important; }
          .pricing-section { padding: 56px 0 80px !important; }
          .pricing-inner { padding: 0 16px !important; }
          .pricing-cards { flex-direction: column !important; align-items: stretch !important; }
          .pricing-card { max-width: 100% !important; }
          .pricing-header { padding: 0 16px !important; }
        }
      `}</style>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 40 }}>
        <div className="pricing-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 64, maxWidth: 1200, margin: "0 auto" }}>
          <Link href="/" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 22, color: G, textDecoration: "none", letterSpacing: "-0.5px" }}>
            vomni
          </Link>
          <Link href="/" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", textDecoration: "none", fontWeight: 500 }}>
            Back to home
          </Link>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="pricing-section" style={{ padding: "100px 0 120px" }}>
        <div className="pricing-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h1 className="pricing-hero-h1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: "#fff", textAlign: "center", margin: "0 0 16px" }}>
            Simple, honest pricing.
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "rgba(255,255,255,0.5)", textAlign: "center", margin: "0 0 16px" }}>
            No setup fees. No long contracts. Cancel whenever.
          </p>
          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: G, textAlign: "center", margin: "0 0 40px" }}>
            Zero commissions. Zero per-booking fees. Zero hidden costs. Ever.
          </p>

          {/* ── Billing toggle ───────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.08)", borderRadius: 9999, padding: 4, gap: 0 }}>
              <button
                onClick={() => setPeriod("monthly")}
                style={{
                  padding: "10px 28px", borderRadius: 9999, border: "none", cursor: "pointer",
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                  background: period === "monthly" ? "#fff" : "transparent",
                  color: period === "monthly" ? N : "rgba(255,255,255,0.6)",
                  transition: "all 0.15s",
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod("yearly")}
                style={{
                  padding: "10px 28px", borderRadius: 9999, border: "none", cursor: "pointer",
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                  background: period === "yearly" ? "#fff" : "transparent",
                  color: period === "yearly" ? N : "rgba(255,255,255,0.6)",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                Yearly
                <span style={{ background: G, color: "#fff", borderRadius: 9999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                  SAVE UP TO 30%
                </span>
              </button>
            </div>
          </div>

          {/* ── Plan cards ───────────────────────────────────────────────── */}
          <div className="pricing-cards" style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 24, flexWrap: "wrap" }}>

            {/* STARTER */}
            <div style={{ background: "#fff", borderRadius: 24, padding: 40, flex: "1 1 280px", maxWidth: 340, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#9CA3AF", margin: "0 0 12px" }}>STARTER</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 60, fontWeight: 900, color: N, lineHeight: 1 }}>
                  £{period === "monthly" ? PLAN_FEATURES.starter.price_monthly : PLAN_FEATURES.starter.price_annual}
                </span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#6B7280" }}>
                  /{period === "monthly" ? "month" : "year"}
                </span>
              </div>
              {period === "yearly" ? (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: G, fontWeight: 600, margin: "6px 0 0" }}>
                  Save £{yearlySavings.starter} vs monthly
                </p>
              ) : (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: G, fontWeight: 600, margin: "6px 0 0" }}>
                  or £{PLAN_FEATURES.starter.price_annual}/year — save £{yearlySavings.starter}
                </p>
              )}
              <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {["Booking system included", "Up to 2 staff members", "Reputation management", "Up to 1 location", "Email support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="#E5E7EB"/>
                      <path d="M5 8l2 2 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280" }}>{f}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 16 }}>
                Perfect for: new or small businesses
              </p>
              <button
                onClick={() => handleCheckout("starter")}
                disabled={loading === "starter"}
                style={{
                  display: "block", width: "100%", marginTop: 24,
                  background: loading === "starter" ? "#D1D5DB" : "#F3F4F6",
                  color: N, borderRadius: 9999, padding: "16px 0",
                  fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
                  textAlign: "center", border: "none",
                  cursor: loading === "starter" ? "not-allowed" : "pointer",
                }}
              >
                {loading === "starter" ? "Loading…" : "Get Started"}
              </button>
            </div>

            {/* GROWTH - MOST POPULAR */}
            <div style={{ background: "#fff", borderRadius: 24, padding: 40, flex: "1 1 280px", maxWidth: 340, border: "2.5px solid #00C896", position: "relative", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: G, color: "#fff", borderRadius: 9999, padding: "6px 20px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                MOST POPULAR
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: G, margin: "0 0 12px" }}>GROWTH</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 60, fontWeight: 900, color: N, lineHeight: 1 }}>
                  £{period === "monthly" ? PLAN_FEATURES.growth.price_monthly : PLAN_FEATURES.growth.price_annual}
                </span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#6B7280" }}>
                  /{period === "monthly" ? "month" : "year"}
                </span>
              </div>
              {period === "yearly" ? (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: G, fontWeight: 600, margin: "6px 0 0" }}>
                  Save £{yearlySavings.growth} vs monthly
                </p>
              ) : (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: G, fontWeight: 600, margin: "6px 0 0" }}>
                  or £{PLAN_FEATURES.growth.price_annual}/year — save £{yearlySavings.growth}
                </p>
              )}
              <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {["Everything in Starter", "Up to 5 staff members", "Up to 3 locations", "AI insights and suggested replies", "Competitor benchmarking", "Weekly reports", "Priority support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="rgba(0,200,150,0.15)"/>
                      <path d="M5 8l2 2 4-4" stroke="#00C896" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151" }}>{f}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 16 }}>
                Perfect for: established businesses serious about reputation
              </p>
              <button
                onClick={() => handleCheckout("growth")}
                disabled={loading === "growth"}
                style={{
                  display: "block", width: "100%", marginTop: 24,
                  background: loading === "growth" ? "#9CA3AF" : G,
                  color: "#fff", borderRadius: 9999, padding: "16px 0",
                  fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
                  textAlign: "center", border: "none",
                  cursor: loading === "growth" ? "not-allowed" : "pointer",
                }}
              >
                {loading === "growth" ? "Loading…" : "Get Started — Most Popular"}
              </button>
            </div>

            {/* PRO */}
            <div style={{ background: "#0A0F1E", borderRadius: 24, padding: 40, flex: "1 1 280px", maxWidth: 340, display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#F5A623", margin: "0 0 12px" }}>PRO</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 60, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                  £{period === "monthly" ? PLAN_FEATURES.pro.price_monthly : PLAN_FEATURES.pro.price_annual.toLocaleString()}
                </span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>
                  /{period === "monthly" ? "month" : "year"}
                </span>
              </div>
              {period === "yearly" ? (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#F5A623", fontWeight: 600, margin: "6px 0 0" }}>
                  Save £{yearlySavings.pro} vs monthly
                </p>
              ) : (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#F5A623", fontWeight: 600, margin: "6px 0 0" }}>
                  or £{PLAN_FEATURES.pro.price_annual.toLocaleString()}/year — save £{yearlySavings.pro}
                </p>
              )}
              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {["Everything in Growth", "Unlimited staff", "Unlimited locations", "Dedicated SMS number", "White label — remove Vomni branding", "Monthly strategy call", "Same day support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="rgba(245,166,35,0.2)"/>
                      <path d="M5 8l2 2 4-4" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>
                Perfect for: high-volume businesses
              </p>
              <button
                onClick={() => handleCheckout("pro")}
                disabled={loading === "pro"}
                style={{
                  display: "block", width: "100%", marginTop: 24,
                  background: loading === "pro" ? "#9CA3AF" : "#F5A623",
                  color: N, borderRadius: 9999, padding: "16px 0",
                  fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
                  textAlign: "center", border: "none",
                  cursor: loading === "pro" ? "not-allowed" : "pointer",
                }}
              >
                {loading === "pro" ? "Loading…" : "Get Started — Pro"}
              </button>
            </div>

          </div>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 }}>
            Not seeing more reviews in your first 14 days? Full refund. No forms. No questions.
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 12 }}>
            Having trouble with checkout?{" "}
            <a href="mailto:hello@vomni.io" style={{ color: "rgba(0,200,150,0.6)", textDecoration: "none" }}>
              Email hello@vomni.io
            </a>{" "}
            and we&apos;ll get you set up in minutes.
          </p>
        </div>
      </section>

      {/* Competitor Comparison Table */}
      <section style={{ padding: "0 0 80px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 48px" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", textAlign: "center", margin: "0 0 40px" }}>
            How Vomni compares
          </h2>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
              <thead>
                <tr>
                  {["", "Vomni Growth", "Fresha Team", "Booksy"].map((h, i) => (
                    <th key={i} style={{
                      padding: "16px 20px", textAlign: i === 0 ? "left" : "center",
                      fontWeight: 700, fontSize: 14,
                      color: i === 1 ? G : "rgba(255,255,255,0.5)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Monthly cost", "£79", "£79+", "£30+"],
                  ["Commission on new clients", "None", "20%", "None"],
                  ["Per staff charge", "None", "£10/staff", "£20/staff"],
                  ["Reputation management", "Included", "Not included", "Not included"],
                  ["Hebrew support", "Native", "Limited", "Limited"],
                  ["Hidden fees", "None", "Yes", "Yes"],
                ].map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: "14px 20px", textAlign: ci === 0 ? "left" : "center",
                        fontSize: 14, color: ci === 1 && (cell === "None" || cell === "Included" || cell === "Native" || cell === "£79") ? G : "rgba(255,255,255,0.6)",
                        fontWeight: ci === 0 ? 500 : 400,
                        borderBottom: ri < 5 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "32px 48px", textAlign: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>
          &copy; {new Date().getFullYear()} Vomni. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
