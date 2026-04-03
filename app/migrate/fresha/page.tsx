"use client";

import type { Metadata } from "next";
import Nav from "@/components/MigrateNav";
import Footer from "@/components/MigrateFooter";

const G   = "#00C896";
const GD  = "#00A87D";
const N   = "#0A0F1E";
const OW  = "#F7F8FA";
const TS  = "#6B7280";
const TM  = "#9CA3AF";
const BD  = "#E5E7EB";
const RED = "#EF4444";

function Check() {
  return (
    <span style={{ color: G, fontWeight: 700, fontSize: 18 }}>✓</span>
  );
}
function Cross() {
  return (
    <span style={{ color: RED, fontWeight: 700, fontSize: 18 }}>✗</span>
  );
}

const TABLE_ROWS = [
  { label: "Monthly fee",                   fresha: "From £19.95 + £14.95/staff",      vomni: "Flat fee from £35/month", vomniCheck: true },
  { label: "Booking commission",            fresha: "20% on new clients (min £6)",      vomni: "Never",                  freshaCheck: false, vomniCheck: true },
  { label: "WhatsApp notifications",        fresha: "Not available",                    vomni: "Native, every plan",     freshaCheck: false, vomniCheck: true },
  { label: "Automated Google reviews",      fresha: "Not available",                    vomni: "After every visit",      freshaCheck: false, vomniCheck: true },
  { label: "Smart review routing",          fresha: "Not available",                    vomni: "1–3 stars private, 4–5 → Google", freshaCheck: false, vomniCheck: true },
  { label: "Customer re-engagement AI",     fresha: "Not available",                    vomni: "Automatic",              freshaCheck: false, vomniCheck: true },
  { label: "Customers need to download app",fresha: "Yes (Fresha app)",                 vomni: "No",                     freshaCheck: false, vomniCheck: true },
  { label: "Export your data anytime",      fresha: "Blocked once you cancel",          vomni: "Always",                 freshaCheck: undefined, vomniCheck: true },
];

const EXPORT_STEPS = [
  "Log into your Fresha account.",
  "Go to Clients → Export.",
  "Download as CSV.",
  "Open Vomni, go to Settings → Import clients, and upload the CSV.",
  "Vomni matches all columns automatically.",
];

export default function FreshaPage() {
  return (
    <>
      <Nav />

      {/* ── META via title tag (Next.js App Router export) ── */}
      {/* SEO is handled by the metadata export below the component */}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "96px 0 80px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 48px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 9999, padding: "6px 16px", marginBottom: 32 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#7C3AED" }}>Switching from Fresha</span>
          </div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: N, marginBottom: 24 }}>
            Done paying 20%<br />to Fresha?
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, lineHeight: 1.6, color: TS, maxWidth: 640, margin: "0 auto 40px" }}>
            Fresha introduced per-staff fees in 2025, and still charges 20% commission on new clients — including clients your own marketing brought in. Vomni charges a flat monthly fee. Nothing else. Ever.
          </p>
          <a
            href="https://vomni.io/signup"
            style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = GD)}
            onMouseLeave={e => (e.currentTarget.style.background = G)}
          >
            Import my Fresha clients →
          </a>
        </div>
      </section>

      {/* ── WHAT CHANGED ──────────────────────────────────────────────────── */}
      <section style={{ background: N, padding: "80px 0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 48px" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: "#fff", marginBottom: 40, textAlign: "center" }}>
            What changed with Fresha
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              "In 2025, Fresha moved from free to paid: £19.95/month solo or £14.95/month per team member.",
              "20% commission on every new client from the marketplace — minimum £6 per booking.",
              "Users report being charged this 20% on clients who found them via Google, Instagram, and word of mouth — not via Fresha.",
              "No WhatsApp notifications on standard plans.",
              "No Google review automation — reviews stay within the Fresha ecosystem.",
              "No way to identify lapsed customers or send re-engagement messages.",
              "Data ownership: export is available while your account is active — but once you cancel, Fresha locks you out. Export before you switch.",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: 8 }} />
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 48px" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: N, marginBottom: 48, textAlign: "center" }}>
            Fresha vs Vomni
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
              <thead>
                <tr>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${BD}`, background: OW, borderRadius: "12px 0 0 0" }}></th>
                  <th style={{ padding: "16px 20px", textAlign: "center", fontSize: 15, fontWeight: 700, color: N, borderBottom: `2px solid ${BD}`, background: OW, minWidth: 160 }}>Fresha</th>
                  <th style={{ padding: "16px 20px", textAlign: "center", fontSize: 15, fontWeight: 700, color: G, borderBottom: `2px solid ${BD}`, background: "rgba(0,200,150,0.05)", borderRadius: "0 12px 0 0", minWidth: 160 }}>Vomni</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : OW }}>
                    <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 500, color: N, borderBottom: `1px solid ${BD}` }}>{row.label}</td>
                    <td style={{ padding: "16px 20px", textAlign: "center", fontSize: 14, color: row.freshaCheck === false ? RED : TS, borderBottom: `1px solid ${BD}` }}>
                      {row.freshaCheck === false ? <Cross /> : row.fresha}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center", fontSize: 14, color: row.vomniCheck ? G : TS, borderBottom: `1px solid ${BD}`, background: "rgba(0,200,150,0.02)" }}>
                      {row.vomniCheck ? <><Check /> <span style={{ marginLeft: 6, color: N }}>{row.vomni}</span></> : row.vomni}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── EXPORT GUIDE ─────────────────────────────────────────────────── */}
      <section style={{ background: OW, padding: "80px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 48px" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: N, marginBottom: 40, textAlign: "center" }}>
            How to export your clients from Fresha
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {EXPORT_STEPS.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 20, paddingBottom: i < EXPORT_STEPS.length - 1 ? 0 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 800, color: "#fff" }}>{i + 1}</span>
                  </div>
                  {i < EXPORT_STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: BD, minHeight: 32, margin: "4px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < EXPORT_STEPS.length - 1 ? 24 : 0, paddingTop: 6 }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, lineHeight: 1.7, color: N }}>
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <a
              href="https://vomni.io/signup"
              style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = GD)}
              onMouseLeave={e => (e.currentTarget.style.background = G)}
            >
              Import my Fresha clients →
            </a>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "80px 0", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 48px" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: N, marginBottom: 16 }}>
            Your clients. Your revenue.<br />Your rules.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS, marginBottom: 40, lineHeight: 1.6 }}>
            No commission. No long-term contract. WhatsApp review automation from day one.
          </p>
          <a
            href="https://vomni.io/signup"
            style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "18px 48px", fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = GD)}
            onMouseLeave={e => (e.currentTarget.style.background = G)}
          >
            Start your free trial →
          </a>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, marginTop: 16 }}>14-day money-back guarantee</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
