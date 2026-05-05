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

export default function UKCookiesPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <LegalHeader />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 40, fontWeight: 800, color: N, marginBottom: 8 }}>
          Cookie Policy
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          Cookies are small files that websites save on your device to help them work properly and understand how they&apos;re used. This policy explains how Vomni uses cookies in accordance with the Privacy and Electronic Communications Regulations (PECR) and UK GDPR.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Cookies we use without asking</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          These are strictly necessary for the platform to work:
        </p>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li><strong>Session cookies</strong> — keep you logged into your dashboard</li>
          <li><strong>Security cookies</strong> — protect against cross-site request forgery (CSRF)</li>
          <li><strong>Preference cookies</strong> — remember your settings within the platform</li>
        </ul>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          These cookies are essential and do not require your consent under PECR.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Cookies we ask about</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          We use Vercel Analytics to understand how visitors use the site. This uses a privacy-preserving, cookieless measurement approach and does not track individuals across sites. We ask for your consent before enabling this.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>What we don&apos;t use</h2>
        <ul style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8, paddingLeft: 24 }}>
          <li>Advertising or retargeting cookies</li>
          <li>Third-party tracking cookies</li>
          <li>Social media tracking pixels</li>
        </ul>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Managing your cookies</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          You can control and delete cookies through your browser settings. Note that disabling essential cookies may prevent the platform from working properly. For more information about managing cookies, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noreferrer" style={{ color: G, textDecoration: "none" }}>aboutcookies.org</a>.
        </p>

        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 40 }}>Further information</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#374151", lineHeight: 1.8 }}>
          For more information about our privacy practices, see our <a href="/uk/privacy" style={{ color: G, textDecoration: "none" }}>Privacy Policy</a>. For queries about cookies, contact <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>.
        </p>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF", marginTop: 48 }}>
          Questions? <a href="mailto:hello@vomni.io" style={{ color: G, textDecoration: "none" }}>hello@vomni.io</a>
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
