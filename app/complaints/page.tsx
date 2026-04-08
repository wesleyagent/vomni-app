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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, margin: "0 0 12px" }}>
      {children}
    </p>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
      <span style={{ color: G, flexShrink: 0, marginTop: 2 }}>—</span>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, margin: 0 }}>{children}</p>
    </div>
  );
}

export default function ComplaintsPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 16 }}>
          Complaints Policy
        </h1>
        <P>We take every complaint seriously.</P>

        <Section title="How to raise a complaint">
          <P>Email <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a> with your business name, a clear description of your complaint, and what you would like us to do about it.</P>
          <P>We acknowledge every complaint within 1 working day.</P>
        </Section>

        <Section title="What happens next">
          <P>We aim to resolve every complaint within 5 working days. If it takes longer we will keep you updated. For complaints relating to data or privacy we aim to respond within 72 hours.</P>
        </Section>

        <Section title="If you are not satisfied with our response">
          <P>You can escalate to the relevant authority in your jurisdiction:</P>
          <Item>Israel: Privacy Protection Authority — <a href="https://www.gov.il" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>gov.il</a></Item>
          <Item>United Kingdom: Information Commissioner&apos;s Office — <a href="https://ico.org.uk" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>ico.org.uk</a></Item>
        </Section>

        <Section title="Our commitment">
          <P>We will always treat complaints fairly, respond promptly, and use every complaint as an opportunity to improve. If we got something wrong we will say so and put it right.</P>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #E5E7EB" }}>
          <P>Contact: <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a></P>
        </div>

      </div>
      <LegalFooter />
    </div>
  );
}
