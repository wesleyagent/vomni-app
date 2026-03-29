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

export default function DpaPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 32 }}>
          Last updated March 2026.
        </p>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 8 }}>
          Data Processing Agreement
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          This agreement is between Vomni (the data processor) and your business (the data controller).
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What this agreement covers</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni processes personal data - specifically customer names and phone numbers - on your behalf. The sole purpose is to send automated feedback request text messages after customer appointments.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What data is processed</h2>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>Customer first names and phone numbers received from your booking confirmation emails</li>
          <li>Customer responses to feedback requests</li>
          <li>Timestamps of messages sent and received</li>
        </ul>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>How long this agreement lasts</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          This agreement remains in force for the duration of your Vomni subscription.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Vomni&apos;s responsibilities</h2>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>We process personal data only for the purpose described above</li>
          <li>All staff with access to personal data are bound by confidentiality</li>
          <li>We implement appropriate technical and security measures to protect data</li>
          <li>We will notify you without delay of any data breach affecting your customers</li>
          <li>We will assist you in responding to any data subject rights request</li>
          <li>We will delete or return all personal data when you close your account</li>
          <li>Our current sub-processors are Twilio (SMS delivery) and Supabase (data storage)</li>
        </ul>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Your responsibilities</h2>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>Ensure you have a lawful basis for sharing customer contact data with Vomni</li>
          <li>Inform customers they may receive a feedback text after their appointment. Suggested wording: &quot;After your visit you may receive a short text message asking for feedback on your experience. Reply STOP at any time to opt out.&quot;</li>
          <li>Notify Vomni immediately at hello@vomni.io if any customer asks to have their data deleted</li>
          <li>Update your privacy policy to mention Vomni as a data processor</li>
          <li>Only share data for genuine customers who have had a real appointment</li>
        </ul>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Where data is stored</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Customer data is stored on servers within the European Economic Area or in countries recognised by the UK Information Commissioner&apos;s Office as providing adequate data protection.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Governing law</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          This agreement is governed by the laws of England and Wales and is subject to UK GDPR and the Data Protection Act 2018.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Contact</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
