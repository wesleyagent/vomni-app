"use client";

const N = "#0A0F1E";
const G = "#00C896";

const FOOTER_LINKS = [
  { label: "Pricing",          href: "/#pricing" },
  { label: "Contact",          href: "/contact" },
  { label: "Privacy Policy",   href: "/uk/privacy" },
  { label: "Terms of Service", href: "/uk/terms" },
  { label: "DPA",              href: "/uk/dpa" },
  { label: "Acceptable Use",   href: "/uk/acceptable-use" },
  { label: "Cookies",          href: "/uk/cookies" },
  { label: "Refunds",          href: "/uk/refunds" },
  { label: "Complaints",       href: "/uk/complaints" },
];

function LegalHeader() {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <a href="/uk" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: G, textDecoration: "none" }}>Vomni</a>
      <a href="/uk" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", textDecoration: "none" }}>Back to home</a>
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

export default function UKRefundsPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 16 }}>
          Refund Policy
        </h1>

        <Section title="14-day money back guarantee">
          <P>New customers can request a full refund within 14 days of their first payment. No questions asked. This applies to first-time customers only.</P>
          <P>To request a refund, email <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a> with the subject line &ldquo;Refund request&rdquo; and we will process it within 5 working days.</P>
        </Section>

        <Section title="Monthly plans">
          <Item>Cancel any time from your account settings. No further charges after cancellation.</Item>
          <Item>We do not offer partial refunds for unused days in a monthly billing period.</Item>
          <Item>If you are within your 14-day guarantee period, you are entitled to a full refund regardless.</Item>
        </Section>

        <Section title="Annual plans">
          <Item>Cancel any time. No further annual renewal charges after cancellation.</Item>
          <Item>We do not offer refunds for the remaining term of an annual plan outside the 14-day guarantee period.</Item>
          <Item>If you are within your 14-day guarantee period, you are entitled to a full refund.</Item>
        </Section>

        <Section title="Your statutory rights">
          <P>Nothing in this policy affects your statutory rights under UK consumer protection legislation, including the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, where applicable.</P>
        </Section>

        <Section title="How to request a refund">
          <P>Email <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a> with your account email address and reason for the refund. We will acknowledge within 1 working day and process eligible refunds within 5 working days.</P>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #E5E7EB" }}>
          <P>Contact: <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a></P>
        </div>

      </div>
      <LegalFooter />
    </div>
  );
}
