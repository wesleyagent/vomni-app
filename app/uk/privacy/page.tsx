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

export default function UKPrivacyPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 16 }}>
          Privacy Policy
        </h1>
        <P>
          Vomni (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the platform at vomni.io. This policy explains what personal data we collect, why, and your rights over it under UK GDPR and the UK Data Protection Act 2018.
        </P>

        <Section title="1. Who we are">
          <P>Vomni</P>
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
          <Item><strong>Google Calendar data</strong> — if you choose to connect your Google Calendar, we use calendar.events to create booking events in your calendar and calendar.readonly to read your existing calendar solely to display your real-time availability and prevent double-bookings. We do not read, store, or use your calendar data for any other purpose. Google Calendar data is accessed in real time and is not retained after each request.</Item>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: N, margin: "24px 0 10px" }}>From end customers:</p>
          <Item><strong>Name and phone number</strong> — provided at booking, used to send appointment confirmations and reminders on behalf of the business you booked with.</Item>
          <Item><strong>Email address</strong> — optional, used for email confirmations if provided.</Item>
          <Item><strong>Marketing consent</strong> — whether you opted in to receive re-engagement reminders. Optional and unchecked by default.</Item>

          <div style={{ marginTop: 16 }}><P>We do not collect payment information from end customers. We do not collect sensitive personal data.</P></div>
        </Section>

        <Section title="4. Our lawful basis for processing">
          <Item><strong>Contract performance</strong> — processing necessary to deliver the booking and communications service to business customers and their clients.</Item>
          <Item><strong>Legitimate interests</strong> — transactional follow-up messages sent shortly after a genuine appointment.</Item>
          <Item><strong>Consent</strong> — re-engagement messages to end customers who have explicitly opted in.</Item>
        </Section>

        <Section title="5. How we use your data">
          <Item>To operate the booking system and display real-time availability to customers.</Item>
          <Item>To send appointment confirmations and reminders.</Item>
          <Item>To send follow-up communications after visits on behalf of the business.</Item>
          <Item>To re-engage customers who have opted in to receive such messages.</Item>
          <Item>To provide business owners with their management dashboard.</Item>
          <Item>To process subscription payments.</Item>
          <Item>To comply with legal obligations.</Item>
          <div style={{ marginTop: 16 }}>
            <P>We do not sell data. We do not use end customer data for our own marketing.</P>
          </div>
        </Section>

        <Section title="6. How we share, transfer, or disclose your data">
          <P>We do not sell your personal data to any third party.</P>
          <P>Google Calendar data accessed through OAuth is used exclusively to display appointment availability to end customers booking through Vomni. It is not shared with, sold to, or disclosed to any third party.</P>
          <P>We share data only in the following limited circumstances:</P>
          <Item><strong>Lemon Squeezy</strong> — our payment processor. Handles subscription billing only.</Item>
          <Item><strong>Supabase</strong> — our database infrastructure provider. Google Calendar data is not stored in our database.</Item>
          <Item><strong>Twilio</strong> — used to send SMS messages to end customers on behalf of businesses. Only the end customer&apos;s phone number and message content are transmitted.</Item>
          <Item><strong>Legal requirements</strong> — we may disclose data if required by UK law or to protect the rights and safety of our users.</Item>
          <div style={{ marginTop: 16 }}>
            <P>All third-party service providers are contractually bound to process data only as instructed and in accordance with UK GDPR.</P>
          </div>
        </Section>

        <Section title="7. International transfers">
          <P>Some of our sub-processors may process data outside the UK. Where this occurs, we ensure appropriate safeguards are in place (such as the UK International Data Transfer Agreement or adequacy decisions) in compliance with UK GDPR Chapter V.</P>
        </Section>

        <Section title="8. Data retention and deletion">
          <P>Google Calendar data is accessed in real time to display availability and is not stored by Vomni. Disconnecting your Google Calendar from Vomni immediately revokes our access.</P>
          <P>We retain business account data for as long as your subscription is active. Upon account deletion, your data is permanently removed within 30 days.</P>
          <P>We retain end customer data only as long as necessary for the purpose it was collected. Business customers can delete end customer records directly from the platform at any time.</P>
          <P>You can request deletion of any data we hold by contacting <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>.</P>
        </Section>

        <Section title="9. SMS communications">
          <P>Vomni sends SMS messages to end customers on behalf of businesses using our platform.</P>
          <P>We send two types of messages:</P>
          <Item><strong>Transactional</strong> — booking confirmations, appointment reminders, and post-visit follow-ups. Sent on the basis of the booking relationship.</Item>
          <Item><strong>Re-engagement reminders</strong> — only sent to customers who explicitly opted in at the time of booking.</Item>
          <div style={{ marginTop: 16 }}>
            <P>You can unsubscribe from all messages at any time by replying <strong>STOP</strong>. Your opt-out is recorded immediately and honoured permanently.</P>
          </div>
        </Section>

        <Section title="10. Data security">
          <P>We apply industry-standard technical and organisational measures to protect all personal data. Contact information is stored in encrypted form and is never exposed in plain text. All data is transmitted over encrypted connections.</P>
          <P>In the event of a personal data breach we will notify the Information Commissioner&apos;s Office (ICO) within 72 hours where required, and will notify affected individuals without undue delay where the breach is likely to result in a high risk to their rights and freedoms.</P>
        </Section>

        <Section title="11. Your rights under UK GDPR">
          <P>You have the right to:</P>
          <Item>Access the personal data we hold about you (Subject Access Request).</Item>
          <Item>Request correction of inaccurate or incomplete data.</Item>
          <Item>Request erasure of your data (&ldquo;right to be forgotten&rdquo;).</Item>
          <Item>Object to processing based on legitimate interests.</Item>
          <Item>Restrict processing in certain circumstances.</Item>
          <Item>Data portability — receive a copy of your data in a structured, machine-readable format.</Item>
          <Item>Withdraw consent at any time where processing is based on consent — reply STOP to any message.</Item>
          <div style={{ marginTop: 16 }}>
            <P>To exercise any of these rights, contact us at <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>. We will respond within 30 days (one calendar month as required by UK GDPR).</P>
            <P>You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO): <a href="https://ico.org.uk" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>ico.org.uk</a> — 0303 123 1113.</P>
          </div>
        </Section>

        <Section title="12. Cookies">
          <P>We use only the cookies necessary to operate the platform. No advertising or tracking cookies. See our <a href="/uk/cookies" style={{ color: G, textDecoration: "none" }}>Cookie Policy</a> for details.</P>
        </Section>

        <Section title="13. Changes">
          <P>We may update this policy from time to time. We will notify business customers of material changes by email at least 30 days before they take effect.</P>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #E5E7EB" }}>
          <P>Contact: <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a></P>
        </div>

      </div>
      <LegalFooter />
    </div>
  );
}
