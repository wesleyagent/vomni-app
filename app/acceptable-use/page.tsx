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

export default function AcceptableUsePage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 8 }}>
          Acceptable Use Policy
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni is designed to help real businesses build genuine relationships with their real customers. These rules exist to protect everyone - businesses, customers, and the platform.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What Vomni is for</h2>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>Sending automated feedback requests to real customers after genuine appointments</li>
          <li>Collecting honest feedback - positive and negative</li>
          <li>Helping businesses understand and improve their customer experience</li>
          <li>Managing private feedback conversations with customers</li>
        </ul>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What Vomni must never be used for</h2>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>Sending messages to people who have never been a customer of the business</li>
          <li>Sending messages to anyone who has asked to opt out</li>
          <li>Any attempt to artificially inflate ratings through fake or incentivised reviews</li>
          <li>Sending messages on behalf of a business you do not own or operate</li>
          <li>Collecting feedback for businesses outside the sectors Vomni supports</li>
          <li>Any activity that violates Google&apos;s review policies, UK consumer protection law, or data protection legislation</li>
          <li>Harassing customers or sending repeated messages after an opt out</li>
        </ul>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What happens if these rules are broken</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We take misuse seriously. Accounts found to be in breach of this policy may be suspended without refund. In serious cases we will report misuse to the relevant authorities.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Why these rules exist</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni&apos;s value depends on trust - trust from businesses, trust from their customers, and trust from platforms like Google. These rules protect that trust for everyone.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Questions or concerns</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
