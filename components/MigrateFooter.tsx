const N  = "#0A0F1E";
const TM = "#9CA3AF";

export default function Footer() {
  return (
    <footer style={{ background: N, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "48px 0" }}>
      <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", textAlign: "center" }}>
        <a href="https://vomni.io" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", display: "block", marginBottom: 24 }}>Vomni</span>
        </a>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", marginBottom: 8 }}>
          <a href="https://vomni.io/#pricing" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Pricing</a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <a href="/migrate" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Migrate</a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <a href="https://vomni.io/contact" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Contact</a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <a href="https://vomni.io/privacy" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Privacy Policy</a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <a href="https://vomni.io/terms" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Terms of Service</a>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", marginBottom: 20 }}>
          <a href="https://vomni.io/cookies" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Cookies</a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <a href="https://vomni.io/refunds" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Refunds</a>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM, margin: 0 }}>Vomni · hello@vomni.io</p>
      </div>
    </footer>
  );
}
