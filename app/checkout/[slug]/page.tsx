import { notFound } from "next/navigation";

const G = "#00C896";
const N = "#0A0F1E";

const CHECKOUT_CONFIG: Record<string, { title: string; price: string; description: string; type: "upgrade" }> = {
  "growth":    { title: "Upgrade to Growth",    price: "£79/mo",  description: "AI insights and suggested replies, full analytics dashboard, weekly performance email.", type: "upgrade" },
  "pro":       { title: "Upgrade to Pro",       price: "£149/mo", description: "Dedicated SMS number, priority support, full analytics and weekly reports.",           type: "upgrade" },
};

export default async function CheckoutPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ business_id?: string }>;
}) {
  const { slug }        = await params;
  const { business_id } = await searchParams;
  const config          = CHECKOUT_CONFIG[slug];
  if (!config) notFound();

  const emailSubject = encodeURIComponent(config.title);
  const emailBody    = encodeURIComponent(
    `Hi,\n\nI'd like to proceed with: ${config.title} (${config.price})\n\nBusiness ID: ${business_id ?? "unknown"}\n\nThanks`
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40, textAlign: "center" }}>

        {/* Logo */}
        <a href="/dashboard" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 22, color: N, textDecoration: "none", letterSpacing: "-0.5px", display: "inline-block", marginBottom: 32 }}>
          vomni
        </a>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", background: config.type === "upgrade" ? `${G}15` : "#F3F4F6", borderRadius: 9999, padding: "4px 14px", marginBottom: 24 }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: G, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Plan Upgrade
          </span>
        </div>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 28, color: N, margin: "0 0 12px" }}>
          {config.title}
        </h1>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 40, color: G, margin: "0 0 16px" }}>
          {config.price}
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "0 0 36px", lineHeight: 1.7 }}>
          {config.description}
        </p>

        {/* Coming soon notice */}
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, color: "#92400E", marginBottom: 6 }}>
            Payment coming soon
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#A16207", margin: 0, lineHeight: 1.6 }}>
            Contact hello@vomni.io to upgrade today and we will set you up manually.
          </p>
        </div>

        {/* CTA */}
        <a
          href={`mailto:hello@vomni.io?subject=${emailSubject}&body=${emailBody}`}
          style={{ display: "block", padding: "14px 24px", borderRadius: 12, background: G, color: "#fff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, textDecoration: "none", marginBottom: 16 }}
        >
          Email us to upgrade →
        </a>

        <a href="/dashboard" style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", textDecoration: "none" }}>
          ← Back to dashboard
        </a>

        {business_id && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#D1D5DB", marginTop: 24, marginBottom: 0 }}>
            Business ID: {business_id}
          </p>
        )}
      </div>
    </div>
  );
}
