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

export default function UKDpaPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 16 }}>
          Data Processing Agreement
        </h1>
        <P>This agreement is between Vomni (&ldquo;Vomni&rdquo;, the data processor) and your business (the data controller). It applies for the duration of your Vomni subscription and forms part of the agreement between you and Vomni under UK GDPR Article 28.</P>

        <Section title="1. What this covers">
          <P>Vomni processes personal data — specifically customer names, phone numbers, and email addresses — on your behalf, solely for the purpose of operating the Vomni platform on your instructions.</P>
        </Section>

        <Section title="2. Vomni&apos;s responsibilities">
          <P>We will:</P>
          <Item>Process personal data only for the purposes described above and only on your documented instructions.</Item>
          <Item>Ensure all personnel with access to personal data are bound by appropriate confidentiality obligations.</Item>
          <Item>Implement appropriate technical and organisational measures to protect personal data against unauthorised or unlawful processing and against accidental loss, destruction, or damage.</Item>
          <Item>Notify you without undue delay (and in any event within 72 hours where feasible) of any personal data breach affecting your customers&apos; data.</Item>
          <Item>Assist you in responding to data subject rights requests under UK GDPR.</Item>
          <Item>Assist you in meeting your obligations under UK GDPR Articles 32–36 (security, breach notification, DPIAs, and prior consultation).</Item>
          <Item>Delete or return all personal data when you close your account, at your election, unless retention is required by applicable law.</Item>
          <Item>Make available to you all information necessary to demonstrate compliance with this agreement and UK GDPR Article 28.</Item>
        </Section>

        <Section title="3. Your responsibilities">
          <P>You are responsible for:</P>
          <Item>Ensuring you have a lawful basis under UK GDPR for sharing customer contact data with Vomni.</Item>
          <Item>Informing your customers that they may receive communications after their appointment and that they can reply STOP at any time to unsubscribe.</Item>
          <Item>Notifying Vomni immediately at <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a> if any customer requests deletion of their personal data.</Item>
          <Item>Ensuring your own privacy policy references Vomni as a data processor.</Item>
          <Item>Only sharing data for genuine customers who have had a real appointment or transaction with your business.</Item>
        </Section>

        <Section title="4. Sub-processors">
          <P>You authorise Vomni to use the following sub-processors to deliver the service:</P>
          <Item><strong>Supabase</strong> — database infrastructure</Item>
          <Item><strong>Twilio</strong> — SMS delivery</Item>
          <Item><strong>Vercel</strong> — platform hosting</Item>
          <P>We will notify you of any intended changes to sub-processors and you will have the opportunity to object.</P>
        </Section>

        <Section title="5. Where data is stored">
          <P>Customer data is stored securely within jurisdictions that provide an adequate level of data protection in accordance with UK GDPR. Where data is transferred internationally, Vomni ensures appropriate safeguards are in place, including UK International Data Transfer Agreements (IDTAs) or reliance on adequacy decisions.</P>
        </Section>

        <Section title="6. Governing law">
          <P>This agreement is governed by the laws of England and Wales. Any disputes arising from this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.</P>
        </Section>

        <Section title="7. Contact">
          <P><a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a></P>
        </Section>

      </div>
      <LegalFooter />
    </div>
  );
}
