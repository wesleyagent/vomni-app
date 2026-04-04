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

export default function PrivacyPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>
          Last updated: 4 April 2026
        </p>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 16 }}>
          Privacy Policy
        </h1>
        <P>
          Vomni (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the platform at vomni.io. This policy explains what personal data we collect, why, and your rights over it.
        </P>
        <P>We operate under both Israeli and UK privacy law.</P>

        <Section title="1. Who we are">
          <P>Vomni Ltd, Tel Aviv, Israel.</P>
          <P>Contact: <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a></P>
        </Section>

        <Section title="2. Who this policy covers">
          <Item><strong>Business customers</strong> — the service businesses that subscribe to use Vomni. Vomni processes data on their behalf.</Item>
          <Item><strong>End customers</strong> — individuals who book appointments or receive communications through a business using Vomni.</Item>
        </Section>

        <Section title="3. What we collect and why">
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: N, margin: "0 0 10px" }}>From business customers:</p>
          <Item><strong>Name, email, and business details</strong> — to create and operate your account.</Item>
          <Item><strong>Payment information</strong> — handled entirely by Lemon Squeezy, our payment processor. We never store card details. Lemon Squeezy&apos;s privacy policy applies: <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>lemonsqueezy.com/privacy</a>.</Item>
          <Item><strong>Business configuration</strong> — to operate the platform as you have set it up.</Item>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: N, margin: "24px 0 10px" }}>From end customers:</p>
          <Item><strong>Name and phone number</strong> — provided at booking, used to send appointment confirmations and reminders on behalf of the business you booked with.</Item>
          <Item><strong>Email address</strong> — optional, used for email confirmations if provided.</Item>
          <Item><strong>Marketing consent</strong> — whether you opted in to receive re-engagement reminders. Optional and unchecked by default.</Item>

          <div style={{ marginTop: 16 }}><P>We do not collect payment information from end customers. We do not collect sensitive personal data.</P></div>
        </Section>

        <Section title="4. How we use your data">
          <Item>To operate the booking system and send appointment confirmations and reminders.</Item>
          <Item>To send follow-up communications after visits on behalf of the business.</Item>
          <Item>To re-engage customers who have opted in to receive such messages.</Item>
          <Item>To provide business owners with their management dashboard.</Item>
          <Item>To process subscription payments.</Item>
          <Item>To comply with legal obligations.</Item>
          <div style={{ marginTop: 16 }}>
            <P>We do not sell data. We do not use end customer data for our own marketing.</P>
          </div>
        </Section>

        <Section title="5. WhatsApp and SMS communications">
          <P>Vomni sends WhatsApp messages to end customers on behalf of businesses using our platform.</P>
          <P>We send two types of messages:</P>
          <Item><strong>Transactional</strong> — booking confirmations, appointment reminders, and post-visit follow-ups. Sent on the basis of the booking relationship.</Item>
          <Item><strong>Re-engagement reminders</strong> — only sent to customers who explicitly opted in at the time of booking.</Item>
          <div style={{ marginTop: 16 }}>
            <P>You can unsubscribe from all messages at any time by replying <strong>STOP</strong>. Your opt-out is recorded immediately and honoured permanently.</P>
            <P>Messages to customers in Israel are sent in both English and Hebrew. Messages to customers in the United Kingdom are sent in English.</P>
          </div>
        </Section>

        <Section title="6. Data security">
          <P>We apply industry-standard measures to protect all personal data. Contact information is stored in encrypted form and is never exposed in plain text. All data is transmitted over encrypted connections.</P>
          <P>We will notify affected users promptly in the event of a data breach, in accordance with Israeli and UK law.</P>
        </Section>

        <Section title="7. How long we keep your data">
          <P>We retain personal data only as long as necessary for the purpose it was collected. You can request deletion at any time.</P>
        </Section>

        <Section title="8. Your rights">
          <P>Under Israeli Privacy Protection Law (Amendment 13) and UK GDPR you have the right to:</P>
          <Item>Access the personal data we hold about you.</Item>
          <Item>Request correction of inaccurate data.</Item>
          <Item>Request deletion of your data.</Item>
          <Item>Object to your data being used for marketing — reply STOP to any message at any time.</Item>
          <Item>Receive a portable copy of your data. Business customers can export their data directly from the platform.</Item>
          <div style={{ marginTop: 16 }}>
            <P>Contact us at <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>. We will respond within 30 days.</P>
            <P>If you are in Israel: Privacy Protection Authority — <a href="https://www.gov.il" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>gov.il</a></P>
            <P>If you are in the United Kingdom: Information Commissioner&apos;s Office — <a href="https://ico.org.uk" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>ico.org.uk</a></P>
          </div>
        </Section>

        <Section title="9. Cookies">
          <P>We use only the cookies necessary to operate the platform. No advertising or tracking cookies.</P>
        </Section>

        <Section title="10. Changes">
          <P>We may update this policy from time to time. We will notify business customers of material changes by email.</P>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #E5E7EB" }}>
          <P>Contact: <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a></P>
        </div>

      </div>
      <LegalFooter />
    </div>
  );
}
