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

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={G} style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

const FEARS = [
  {
    q: "Will I lose my customer history?",
    a: "Every name, number, email, and visit history imports via CSV. Our column-matching handles messy exports automatically.",
  },
  {
    q: "What if my clients can't find me?",
    a: "Your booking link is yours — your brand, your URL. Your clients don't download anything. They just tap a link.",
  },
  {
    q: "I'm locked into a contract with my current provider.",
    a: "Vomni has no long-term contracts. Start a free trial today, run both systems in parallel, and switch when you're ready.",
  },
  {
    q: "What if something goes wrong during the move?",
    a: "We'll walk you through it. Every migration gets a setup call and same-day support until you're fully live.",
  },
];

const STEPS = [
  { n: "1", text: "Export your client list from your current platform — we show you exactly how." },
  { n: "2", text: "Upload the CSV. Vomni matches columns automatically, including Hebrew headers." },
  { n: "3", text: "Set up your booking page in about 5 minutes." },
  { n: "4", text: "Share your new booking link with clients." },
  { n: "5", text: "Done. Your CRM is built, your history is in, and your first WhatsApp review requests are ready to go." },
];

const PLATFORMS = [
  {
    name: "Fresha",
    slug: "fresha",
    tagline: "Moved to paid in 2025 — and still charges 20% commission.",
    href: "/migrate/fresha",
    color: "#7C3AED",
  },
  {
    name: "Booksy",
    slug: "booksy",
    tagline: "Boost charges 30% per booking — including clients you already have.",
    href: "/migrate/booksy",
    color: "#2563EB",
  },
  {
    name: "Calmark",
    nameHe: "קאלמארק",
    slug: "calmark",
    tagline: "Great booking calendar. No Google reviews. No re-engagement.",
    href: "/migrate/calmark",
    color: "#059669",
  },
];

export default function MigratePage() {
  return (
    <>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "96px 0 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 48px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 9999, padding: "6px 16px", marginBottom: 32 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: G }}>Migration Guide</span>
          </div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: N, marginBottom: 24 }}>
            Switching to Vomni<br />takes less than 30 minutes.
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, lineHeight: 1.6, color: TS, maxWidth: 620, margin: "0 auto 40px" }}>
            Your customer list imports in minutes. Your booking page is live in under half an hour. And for the first time, you&apos;ll know exactly which customers are drifting away — and have a system to bring them back.
          </p>
          <a
            href="https://vomni.io/signup"
            style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = GD)}
            onMouseLeave={e => (e.currentTarget.style.background = G)}
          >
            Start your free trial →
          </a>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────────── */}
      <section style={{ background: OW, padding: "64px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              {
                quote: "I thought moving our 800 clients would take weeks. It took about 20 minutes.",
                biz: "Marcus, Kings Cuts",
              },
              {
                quote: "We were on Fresha for 3 years. The 20% fees were killing us. Switching was the best decision we made.",
                biz: "Shira, Studio Sol",
              },
            ].map((t, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "32px", border: `1px solid ${BD}` }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {[0,1,2,3,4].map(s => (
                    <svg key={s} width={18} height={18} viewBox="0 0 20 20" fill={G}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, lineHeight: 1.6, color: N, marginBottom: 20, fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: TS }}>- {t.biz}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEAR-BUSTING ──────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 800, color: N, marginBottom: 16 }}>
              Every concern. A direct answer.
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS, maxWidth: 560, margin: "0 auto" }}>
              We&apos;ve heard every reason not to switch. Here&apos;s the truth about each one.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 24 }}>
            {FEARS.map((f, i) => (
              <div key={i} style={{ background: OW, borderRadius: 16, padding: "36px", border: `1px solid ${BD}` }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckIcon size={20} />
                  </div>
                  <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, lineHeight: 1.3 }}>
                    &ldquo;{f.q}&rdquo;
                  </h3>
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, lineHeight: 1.7, color: TS, paddingLeft: 56 }}>
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STEPS ──────────────────────────────────────────────────────────── */}
      <section style={{ background: N, padding: "96px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>
              How the migration works
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TM }}>
              Five steps. Most businesses are fully live within a couple of hours.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 24, paddingBottom: i < STEPS.length - 1 ? 0 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 800, color: "#fff" }}>{step.n}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.1)", minHeight: 40, margin: "4px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 32 : 0, paddingTop: 10 }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.8)" }}>
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 56, textAlign: "center" }}>
            <a
              href="https://vomni.io/signup"
              style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = GD)}
              onMouseLeave={e => (e.currentTarget.style.background = G)}
            >
              Start your free trial →
            </a>
          </div>
        </div>
      </section>

      {/* ── PLATFORM CARDS ──────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 800, color: N, marginBottom: 16 }}>
              Which platform are you on?
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS, maxWidth: 520, margin: "0 auto" }}>
              Step-by-step guides for the most common switches.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {PLATFORMS.map((p) => (
              <a
                key={p.slug}
                href={p.href}
                style={{ display: "block", background: OW, borderRadius: 20, padding: "40px 36px", border: `1px solid ${BD}`, textDecoration: "none", transition: "box-shadow 0.2s, transform 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: p.color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: p.color }}>
                    {p.name[0]}
                  </span>
                </div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: N, marginBottom: 4 }}>
                  {p.name}{p.nameHe ? ` / ${p.nameHe}` : ""}
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS, lineHeight: 1.6, marginBottom: 28 }}>
                  {p.tagline}
                </p>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: G }}>
                  See migration guide →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ background: OW, padding: "96px 0", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 48px" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 800, color: N, marginBottom: 16 }}>
            Ready when you are.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS, marginBottom: 40, lineHeight: 1.6 }}>
            No contract. No setup fee. Free trial. And if something doesn&apos;t go smoothly, we&apos;ll be there.
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
