import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Data — Vomni",
  description: "Vomni's plain-language data ownership policy. Your customers are yours, always.",
};

const G = "#00C896";
const N = "#0A0F1E";

export default function DataOwnershipPage() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#fff", minHeight: "100vh" }}>
      <nav style={{ padding: "0 24px", height: 60, display: "flex", alignItems: "center", borderBottom: "1px solid #F3F4F6" }}>
        <a href="/" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, textDecoration: "none" }}>vomni</a>
      </nav>

      <div style={{ padding: "64px 24px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 9999, background: "#F0FDF9", border: "1px solid #A7F3D0" }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: G }}>Data Ownership Policy</span>
        </div>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, color: N, margin: "16px 0 24px", lineHeight: 1.2 }}>
          Your customers are yours. Always.
        </h1>

        <p style={{ fontSize: 17, color: "#374151", lineHeight: 1.8, margin: "0 0 32px" }}>
          When a customer books through Vomni, their name, phone number, email, and appointment history belong to you — not to us.
        </p>

        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: "#DC2626", margin: "0 0 16px" }}>We will never:</h3>
          {[
            "Sell your customer data to anyone",
            "Use your customers to market other businesses to them",
            "Charge you commission when your own customers book with you",
            "Show your customers competitor listings",
            "Hold your data hostage if you cancel your subscription",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 4 ? 12 : 0 }}>
              <span style={{ fontSize: 16, lineHeight: 1.5 }}>❌</span>
              <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.5 }}>{item}</p>
            </div>
          ))}
        </div>

        <div style={{ background: "#F0FDF9", border: "1px solid #A7F3D0", borderRadius: 14, padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: G, margin: "0 0 16px" }}>You will always:</h3>
          {[
            "Be able to export your full client list at any time, in one click",
            "Own every booking, every review, every piece of customer data",
            "Be able to take your data with you if you ever leave Vomni",
            "Know exactly how your data is stored and used",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 3 ? 12 : 0 }}>
              <span style={{ fontSize: 16, lineHeight: 1.5 }}>✅</span>
              <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.5 }}>{item}</p>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 32 }}>
          <p style={{ fontSize: 16, color: N, lineHeight: 1.8, fontStyle: "italic" }}>
            &quot;This is not in the small print. It is our core promise. Vomni exists to serve your business — not to become your business.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
