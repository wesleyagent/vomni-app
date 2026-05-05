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

export default function UKTermsPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 16 }}>
          Terms of Service
        </h1>
        <P>These terms govern your use of the Vomni platform at vomni.io. By using Vomni you agree to these terms.</P>

        <Section title="1. What Vomni is">
          <P>Vomni is a business management platform for service businesses. We are a technology platform — not a marketing agency, legal adviser, or business outcomes guarantor.</P>
        </Section>

        <Section title="2. Your responsibilities">
          <Item>You are responsible for ensuring your use of Vomni complies with all applicable laws in the United Kingdom, including the UK GDPR, the Data Protection Act 2018, and consumer protection legislation.</Item>
          <Item>You are responsible for ensuring you have the right to share customer contact details with Vomni for the purposes of using the platform.</Item>
          <Item>You agree to use Vomni only for legitimate business purposes and only to contact customers who have had a genuine appointment or transaction with your business.</Item>
          <Item>Vomni may suspend accounts found to be misusing the platform.</Item>
        </Section>

        <Section title="3. Data processing">
          <Item>Vomni acts as a data processor on your behalf. You are the data controller for your customers&apos; data.</Item>
          <Item>You warrant that you have a lawful basis under UK GDPR to share customer contact data with Vomni.</Item>
          <Item>You agree to notify us at <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a> promptly if any of your customers request deletion of their personal data.</Item>
          <Item>For full data processing terms, please see our <a href="/uk/dpa" style={{ color: G, textDecoration: "none" }}>Data Processing Agreement</a>.</Item>
        </Section>

        <Section title="4. Third party services">
          <Item>Vomni relies on third party infrastructure to operate. We are not responsible for the availability or actions of any third party service.</Item>
          <Item>Payment processing is handled by Lemon Squeezy — their terms apply to all transactions: <a href="https://www.lemonsqueezy.com/terms" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>lemonsqueezy.com/terms</a>.</Item>
        </Section>

        <Section title="5. Consumer rights">
          <P>If you are a consumer (an individual acting outside a business context), your statutory rights under the Consumer Rights Act 2015 and other applicable UK consumer protection legislation are not affected by these terms.</P>
        </Section>

        <Section title="6. No guarantee of results">
          <P>Vomni provides tools to help you manage and grow your business. We do not guarantee any specific business outcome. Any examples or results shown on our website represent individual experiences and are not guarantees of future performance.</P>
        </Section>

        <Section title="7. Limitation of liability">
          <P>Nothing in these terms limits or excludes our liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability that cannot be excluded under English law.</P>
          <P>Subject to the above, Vomni&apos;s total liability for any claim arising from use of the platform shall not exceed the total fees paid by you in the three months preceding the claim.</P>
          <P>Vomni is not liable for any indirect, consequential, special or punitive damages including loss of revenue, loss of data, or loss of business opportunity, to the extent permitted by law.</P>
        </Section>

        <Section title="8. Payment and cancellation">
          <Item>Monthly plans can be cancelled at any time with no further charges.</Item>
          <Item>Annual plans can be cancelled at any time. No refund is provided for the remaining term unless you are within the 14-day money back guarantee period.</Item>
          <Item>The guarantee applies to first-time customers only.</Item>
          <Item>See our <a href="/uk/refunds" style={{ color: G, textDecoration: "none" }}>Refund Policy</a> for full details.</Item>
        </Section>

        <Section title="9. Changes to the service">
          <P>Vomni reserves the right to change, update, or discontinue any part of the platform. We will provide reasonable notice of material changes.</P>
        </Section>

        <Section title="10. Governing law and jurisdiction">
          <P>These terms are governed by the laws of England and Wales. Any disputes arising from or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</P>
        </Section>

        <Section title="11. Contact">
          <P><a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a></P>
        </Section>

      </div>
      <LegalFooter />
    </div>
  );
}
