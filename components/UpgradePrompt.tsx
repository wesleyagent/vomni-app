"use client";
const N = "#0A0F1E";
const G = "#00C896";

interface UpgradePromptProps {
  feature: string;
  description: string;
  requiredPlan: "growth" | "pro";
}

export default function UpgradePrompt({ feature, description, requiredPlan }: UpgradePromptProps) {
  const planLabel = requiredPlan === "pro" ? "Pro" : "Growth";
  const planColor = requiredPlan === "pro" ? "#F5A623" : G;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #E5E7EB",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
      padding: "32px 28px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "#F3F4F6",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="9" width="14" height="10" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/>
          <path d="M6.5 9V6a3.5 3.5 0 017 0v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div>
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 4px" }}>
          {feature}
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 12px", borderRadius: 9999,
        background: `${planColor}18`,
        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
        color: planColor,
      }}>
        Available on {planLabel}
      </div>
      <a
        href="/pricing"
        style={{
          marginTop: 4,
          display: "inline-block",
          background: G, color: "#fff",
          borderRadius: 9999, padding: "10px 24px",
          fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Upgrade to {planLabel}
      </a>
    </div>
  );
}
