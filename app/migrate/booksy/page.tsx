"use client";

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
  return <span style={{ color: G, fontWeight: 700, fontSize: 18 }}>✓</span>;
}
function Cross() {
  return <span style={{ color: RED, fontWeight: 700, fontSize: 18 }}>✗</span>;
}

const TABLE_ROWS = [
  { label: "Monthly base fee",              booksy: "~£50/month",                       vomni: "From £35/month",          booksyBad: false, vomniGood: false },
  { label: "Booking commission (Boost)",    booksy: "30% per new client",               vomni: "Never",                   booksyBad: true,  vomniGood: true },
  { label: "Customers need to download app",booksy: "Yes (Booksy app)",                 vomni: "No",                      booksyBad: true,  vomniGood: true },
  { label: "WhatsApp notifications",        booksy: "Not available",                    vomni: "Native, every plan",      booksyBad: true,  vomniGood: true },
  { label: "Automated Google reviews",      booksy: "Not available",                    vomni: "After every visit",       booksyBad: true,  vomniGood: true },
  { label: "Smart review routing",          booksy: "Not available",                    vomni: "1–3 stars private, 4–5 → Google", booksyBad: true, vomniGood: true },
  { label: "Customer re-engagement AI",     booksy: "Not available",                    vomni: "Automatic",               booksyBad: true,  vomniGood: true },
  { label: "Export your data anytime",      booksy: "Limited — no full history export", vomni: "Always",                  booksyBad: true,  vomniGood: true },
];

const EXPORT_STEPS = [
  "Log in to Booksy Biz.",
  "Go to Clients → look for an Export button. If it's not available, contact Booksy support and request a client data export — they're required to provide it.",
  "Download the client CSV.",
  "Upload to Vomni via Settings → Import clients.",
  "Column matching is automatic.",
];

export default function BooksyPage() {
  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "96px 0 80px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 9999, padding: "6px 16px", marginBottom: 32 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#2563EB" }}>Switching from Booksy</span>
          </div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: N, marginBottom: 24 }}>
            Booksy takes 30%<br />via Boost. Vomni<br />takes nothing.
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, lineHeight: 1.6, color: TS, maxWidth: 640, margin: "0 auto 40px" }}>
            The Boost feature charges 30% commission (minimum $10, maximum $100) per booking — and barbers report it fires on clients they&apos;ve had for years, not new ones Booksy found. Vomni is a flat monthly fee. No Boost. No commission. Ever.
          </p>
          <a
            href="https://vomni.io/signup"
            style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = GD)}
            onMouseLeave={e => (e.currentTarget.style.background = G)}
          >
            Import my Booksy clients →
          </a>
        </div>
      </section>

      {/* ── WHAT BOOKSY COSTS ─────────────────────────────────────────────── */}
      <section style={{ background: N, padding: "80px 0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: "#fff", marginBottom: 40, textAlign: "center" }}>
            What Booksy actually costs you
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              "Booksy base fee: approximately £50/month plus £20/additional staff member.",
              "Boost commission: 30% per booking ($10 min, $100 max) — designed for new client discovery, but users report it fires on existing clients too.",
              "Clients must download the Booksy app to book — your customers are then shown other barbers and salons in your area.",
              "No WhatsApp customer communications.",
              "No automated review collection to Google.",
              "No smart routing — bad reviews go public without any interception.",
              "No lapsed customer identification or re-engagement tools.",
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
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: N, marginBottom: 48, textAlign: "center" }}>
            Booksy vs Vomni
          </h2>
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", minWidth: "480px", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
              <thead>
                <tr>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${BD}`, background: OW }}></th>
                  <th style={{ padding: "16px 20px", textAlign: "center", fontSize: 15, fontWeight: 700, color: N, borderBottom: `2px solid ${BD}`, background: OW, minWidth: 160 }}>Booksy</th>
                  <th style={{ padding: "16px 20px", textAlign: "center", fontSize: 15, fontWeight: 700, color: G, borderBottom: `2px solid ${BD}`, background: "rgba(0,200,150,0.05)", minWidth: 160 }}>Vomni</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : OW }}>
                    <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 500, color: N, borderBottom: `1px solid ${BD}` }}>{row.label}</td>
                    <td style={{ padding: "16px 20px", textAlign: "center", fontSize: 14, borderBottom: `1px solid ${BD}` }}>
                      {row.booksyBad ? <><Cross /><span style={{ marginLeft: 6, color: TS }}>{row.booksy}</span></> : <span style={{ color: TS }}>{row.booksy}</span>}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center", fontSize: 14, borderBottom: `1px solid ${BD}`, background: "rgba(0,200,150,0.02)" }}>
                      {row.vomniGood ? <><Check /><span style={{ marginLeft: 6, color: N }}>{row.vomni}</span></> : <span style={{ color: TS }}>{row.vomni}</span>}
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
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: N, marginBottom: 40, textAlign: "center" }}>
            How to export your clients from Booksy
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {EXPORT_STEPS.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 20 }}>
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
              Import my Booksy clients →
            </a>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "80px 0", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: N, marginBottom: 16 }}>
            Keep 100% of every booking.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS, marginBottom: 40, lineHeight: 1.6 }}>
            Flat monthly fee. No commission. No app download for your clients. WhatsApp review automation from day one.
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
    </div>
  );
}
