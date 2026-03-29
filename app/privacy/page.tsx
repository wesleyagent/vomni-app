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

export default function PrivacyPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 32 }}>
          Last updated March 2026.
        </p>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We keep this simple. Here is exactly what data we collect, why we collect it, and what we do with it.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What data we collect from you (the business)</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          When you sign up for Vomni we collect your name, email address, business name, business type, and payment information. Payment details are handled securely by Stripe and never stored directly by Vomni.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What data you share with us about your customers</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          When you connect your booking email to Vomni, we receive customer names and phone numbers from your booking confirmation emails. We use this data solely to send feedback request text messages on your behalf.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>How we use that data</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Customer contact details are used for one purpose only - sending a text message after their appointment asking how it went. We do not use customer data for advertising, profiling, or any other purpose.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>How long we keep your data</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Customer phone numbers and email addresses are automatically deleted from our system 24 hours after your feedback request is sent. We keep your first name and appointment details for up to 12 months so your business can track their review history. Detailed feedback text is deleted after 90 days - we keep the star rating and general topic for analytics purposes.
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Your business account data is kept for as long as your account is active. When you close your account we delete your data within 30 days.
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, fontStyle: "italic" }}>
          We believe in keeping only what we need for as long as we need it - nothing more.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Who we share data with</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We share customer phone numbers with Twilio to deliver text messages. We use Resend for email delivery and Supabase for secure data storage. We do not sell data to anyone, ever.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Your customers&apos; rights</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Any customer can opt out of receiving messages by replying STOP to any text message from Vomni. For requests to access or delete personal data, customers can contact hello@vomni.io and we will respond within 30 days.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Your rights as a business</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          You can access, correct, or delete your account data at any time from your account settings or by emailing <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Our role</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni acts as a data processor. You (the business) are the data controller. This means you are responsible for ensuring you have the right to share customer contact data with us. We process that data securely and only for the stated purpose.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Governing law</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          This policy is governed by UK GDPR and the Data Protection Act 2018.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Questions</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Email <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
