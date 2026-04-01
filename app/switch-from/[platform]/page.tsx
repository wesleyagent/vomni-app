import { notFound } from "next/navigation";
import { PLATFORMS, getComparisonRows } from "@/lib/platform-comparison";
import CostCalculator from "./CostCalculator";

export async function generateStaticParams() {
  return Object.keys(PLATFORMS).map(p => ({ platform: p }));
}

export function generateMetadata({ params }: { params: { platform: string } }) {
  const p = PLATFORMS[params.platform];
  if (!p) return { title: "Switch to Vomni" };
  return {
    title: `Switch from ${p.name} to Vomni — Zero commission, better reviews`,
    description: `Move from ${p.name} to Vomni in 20 minutes. Import all your clients, keep your data, pay less.`,
  };
}

export default function SwitchFromPage({ params }: { params: { platform: string } }) {
  const platform = PLATFORMS[params.platform];
  if (!platform) notFound();
  const rows = getComparisonRows(platform);

  const G = "#00C896";
  const N = "#0A0F1E";

  const subheadlines: Record<string, string> = {
    fresha: "Stop paying 20-30% commission on your own customers. Take your clients with you.",
    booksy: "Stop paying £29.99/month + £20 per staff member. Move to one flat fee.",
    vagaro: "Keep all your client data and move to a platform that works for you.",
    square: "Bring your client list and upgrade your review system at the same time.",
    treatwell: "Stop sharing your customers with competitors. Own your data on Vomni.",
    calmark: "Switch in 20 minutes. All your clients, all your history, zero downtime.",
    styleseat: "Upgrade to a platform with built-in Google review automation.",
    mindbody: "Cut your monthly costs and bring every client with you.",
    other: "Bring your clients with you — no data lost, no downtime, no stress.",
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#fff", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6", position: "sticky", top: 0, background: "#fff", zIndex: 40 }}>
        <a href="/" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, textDecoration: "none" }}>vomni</a>
        <a
          href="/signup"
          style={{ padding: "9px 22px", borderRadius: 9999, background: G, color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
        >
          Start free trial
        </a>
      </nav>

      {/* Hero */}
      <div style={{ padding: "72px 24px 56px", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 9999, background: "#F0FDF9", border: "1px solid #A7F3D0", marginBottom: 24 }}>
          <span style={{ fontSize: 18 }}>{platform.logo}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: G }}>Switching from {platform.name}</span>
        </div>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, color: N, margin: "0 0 20px", lineHeight: 1.15 }}>
          Switch from {platform.name} to Vomni in 20 minutes
        </h1>

        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "#6B7280", margin: "0 0 36px", lineHeight: 1.6, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
          {subheadlines[platform.id] ?? subheadlines.other}
        </p>

        <a
          href="/signup"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", borderRadius: 9999, background: G, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 17, boxShadow: "0 4px 20px rgba(0,200,150,0.35)" }}
        >
          Start free trial — no credit card needed →
        </a>

        <p style={{ fontSize: 13, color: "#9CA3AF", margin: "12px 0 0" }}>
          14-day free trial · Import clients in 2 minutes · Cancel anytime
        </p>
      </div>

      {/* Comparison table */}
      <div style={{ padding: "0 24px 64px", maxWidth: 760, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 32px" }}>
          Vomni vs {platform.name}
        </h2>

        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
            <div style={{ padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Feature</div>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "#6B7280", textAlign: "center" }}>{platform.name}</div>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: G, textAlign: "center" }}>Vomni ✓</div>
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: i < rows.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ padding: "14px 20px", fontSize: 14, color: "#374151", fontWeight: 500 }}>{row.feature}</div>
              <div style={{ padding: "14px 20px", fontSize: 13, color: row.vomniWins ? "#EF4444" : "#6B7280", textAlign: "center" }}>{row.competitor}</div>
              <div style={{ padding: "14px 20px", fontSize: 13, color: G, textAlign: "center", fontWeight: 600 }}>{row.vomni}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost calculator */}
      <div style={{ padding: "0 24px 64px", maxWidth: 760, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 8px" }}>
          How much are you paying now?
        </h2>
        <p style={{ textAlign: "center", color: "#6B7280", margin: "0 0 32px" }}>See the real cost of staying on {platform.name}</p>
        <CostCalculator platform={platform} />
      </div>

      {/* 4-step switch */}
      <div style={{ padding: "0 24px 64px", maxWidth: 760, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, textAlign: "center", margin: "0 0 36px" }}>
          How the switch works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {[
            { n: "1", title: "Export your clients", desc: `Download your client list from ${platform.name} — takes 2 minutes` },
            { n: "2", title: "Import to Vomni", desc: "Upload the file. We detect all columns automatically." },
            { n: "3", title: "Set up your link", desc: "Your booking page is ready in 10 minutes. Share it anywhere." },
            { n: "4", title: "Tell your clients", desc: "We write the message. You copy and send on WhatsApp." },
          ].map(s => (
            <div key={s.n} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 14, padding: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${G}20`, color: G, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{s.n}</div>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, color: N, margin: "0 0 6px" }}>{s.title}</p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp message template */}
      <div style={{ padding: "0 24px 64px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, padding: 28 }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: "0 0 16px" }}>
            The message to send your clients
          </h3>
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 14, color: N, margin: "0 0 8px", lineHeight: 1.7 }}>
              Hi [Name]! Just letting you know I&apos;ve moved to a new booking system. You can book your next appointment here: [your Vomni link] — it only takes 30 seconds and you&apos;ll get a reminder before your appointment 🙌
            </p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 14, color: N, margin: 0, lineHeight: 1.7, direction: "rtl", textAlign: "right" }}>
              היי [שם]! עברתי למערכת הזמנות חדשה. אפשר לקבוע תור כאן: [הקישור שלך] — לוקח 30 שניות ותקבל תזכורת לפני התור 🙌
            </p>
          </div>
        </div>
      </div>

      {/* Data ownership statement */}
      <div style={{ padding: "48px 24px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: "0 0 8px" }}>
            Your customers are yours. Always.
          </h2>
          <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.6, maxWidth: 560 }}>
            When a customer books through Vomni, their data belongs to you — not to us. We will never sell it, share it, or use it to market other businesses.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {[
              "❌ Never sell your data",
              "❌ Never charge commission",
              "❌ Never show competitors to your clients",
              "✅ Export all clients anytime",
              "✅ Take your data if you leave",
              "✅ You own every booking",
            ].map((item, i) => (
              <div key={i} style={{ padding: "12px 16px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 13, color: N, fontWeight: 500 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: "72px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: N, margin: "0 0 16px" }}>
          Import your clients free — takes 2 minutes
        </h2>
        <p style={{ fontSize: 16, color: "#6B7280", margin: "0 0 32px" }}>No credit card. No contract. No commitment.</p>
        <a
          href="/signup"
          style={{ display: "inline-flex", padding: "16px 40px", borderRadius: 9999, background: G, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 17, boxShadow: "0 4px 20px rgba(0,200,150,0.35)" }}
        >
          Start your free trial →
        </a>
      </div>
    </div>
  );
}
