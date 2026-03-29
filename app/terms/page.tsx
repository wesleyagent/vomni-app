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

export default function TermsPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 32 }}>
          Last updated March 2026.
        </p>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 8 }}>
          Terms of Service
        </h1>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>1. What Vomni is</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni is a review management platform that helps businesses collect customer feedback via automated text messages and manage their online reputation. We are a technology platform - not a marketing agency, legal adviser, or reputation management guarantor.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>2. What we are not responsible for</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <strong>Google listings and ratings</strong> - Vomni has no control over Google&apos;s platform, algorithms, policies or decisions. We make no guarantee that using Vomni will improve, maintain or protect a business&apos;s Google rating or listing. Google may change its policies at any time. Any changes to a business&apos;s Google listing, rating, or visibility are entirely outside Vomni&apos;s control and Vomni accepts no liability for them.
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <strong>Review outcomes</strong> - Vomni facilitates the sending of feedback requests. We do not guarantee any specific number of reviews, any improvement in rating, or any particular business outcome. Results vary by business type, location, appointment volume and customer behaviour.
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <strong>Third party platforms</strong> - Vomni integrates with third party services including but not limited to Google, Twilio, and Resend. Vomni is not responsible for the availability, accuracy or actions of any third party platform.
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <strong>Customer data provided by the business</strong> - The business is responsible for ensuring they have the right to share customer contact details with Vomni for the purpose of sending feedback requests. Vomni processes this data on the business&apos;s behalf as a data processor.
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <strong>Business compliance</strong> - The business is responsible for ensuring their use of Vomni complies with all applicable laws in their jurisdiction including but not limited to data protection laws, consumer protection laws, and any platform terms of service.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>3. Data processing</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni acts as a data processor on behalf of the business who is the data controller. The business warrants that they have a lawful basis to share customer contact data with Vomni and that their customers have been informed that they may receive feedback requests by text message. The business agrees to notify Vomni immediately at hello@vomni.io if any customer requests deletion of their personal data.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>4. Limitation of liability</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          To the maximum extent permitted by law Vomni&apos;s total liability to the business for any claim arising from use of the platform shall not exceed the total fees paid by the business to Vomni in the three months preceding the claim. Vomni is not liable for any indirect, consequential, special or punitive damages including loss of revenue, loss of reputation, loss of data or loss of business opportunity.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>5. No guarantee of results</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni provides tools to help businesses collect feedback and manage their reputation. We do not guarantee any specific outcome. Any case studies, testimonials or example results shown on our website represent individual experiences and are not guarantees of future results.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>6. Acceptable use</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          The business agrees to use Vomni only for legitimate business purposes and only to send feedback requests to customers who have had a genuine appointment or transaction with the business. Vomni may suspend accounts found to be misusing the platform.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>7. Payment and cancellation</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Monthly plans can be cancelled at any time. Annual plans can be cancelled at any time with no refund for the remaining term unless within the 14 day money back guarantee period. The 14 day money back guarantee applies to first time customers only.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>8. Changes to the service</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Vomni reserves the right to change, update or discontinue any part of the platform at any time with reasonable notice where possible.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>9. Governing law</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>10. Contact</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
