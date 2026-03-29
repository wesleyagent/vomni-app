"use client";

const N = "#0A0F1E";
const G = "#00C896";

const FOOTER_LINKS = [
  { label: "Pricing", href: "/#pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "DPA", href: "/dpa" },
  { label: "Acceptable Use", href: "/acceptable-use" },
  { label: "Cookies", href: "/cookies" },
  { label: "Refunds", href: "/refunds" },
  { label: "Complaints", href: "/complaints" },
];

function LegalHeader() {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: G }}>Vomni</span>
      <a href="/" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", textDecoration: "none" }}>Back to home</a>
    </div>
  );
}

function LegalFooter() {
  return (
    <footer style={{ padding: "40px 24px", textAlign: "center", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px", marginBottom: 12 }}>
        {FOOTER_LINKS.map((l, i) => (
          <span key={l.href} style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
            <a href={l.href} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", textDecoration: "none" }}>{l.label}</a>
            {i < FOOTER_LINKS.length - 1 && <span style={{ color: "#D1D5DB" }}>·</span>}
          </span>
        ))}
      </div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", margin: 0 }}>Vomni - hello@vomni.io</p>
    </footer>
  );
}

export default function ComplaintsPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 32 }}>
          Last updated March 2026.
        </p>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 8 }}>
          Complaints Policy
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We&apos;re a small team and we take every complaint seriously.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>How to raise a complaint</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Email <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a> with:
        </p>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>Your business name</li>
          <li>A clear description of your complaint</li>
          <li>What you would like us to do about it</li>
        </ul>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We acknowledge every complaint within 1 working day.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What happens next</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We aim to resolve every complaint within 5 working days. If it takes longer we will update you with a timeline. For complaints about data or privacy we aim to respond within 72 hours.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>If you&apos;re not satisfied with our response</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          You can escalate to:
        </p>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>For data protection complaints - the Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>ico.org.uk</a></li>
          <li>For general consumer complaints - Citizens Advice at <a href="https://citizensadvice.org.uk" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>citizensadvice.org.uk</a></li>
        </ul>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Our commitment</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We will always treat complaints fairly, respond promptly, and use every complaint as an opportunity to improve. If we got something wrong we will say so clearly and put it right.
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
