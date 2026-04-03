"use client";

import { useState } from "react";
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

type Lang = "en" | "he";

const CONTENT = {
  badge: {
    en: "Switching from Calmark",
    he: "מעבר מקאלמארק",
  },
  hero: {
    en: {
      h1: "Using Calmark?\nHere's what you're missing.",
      sub: "Calmark is a solid booking tool. But it doesn't collect Google reviews, doesn't protect your reputation, and has no way to identify or bring back customers who've stopped coming. Vomni does all three — in Hebrew, on WhatsApp, automatically.",
    },
    he: {
      h1: "משתמשים בקאלמארק?\nהנה מה שחסר לכם",
      sub: "קאלמארק היא מערכת הזמנות טובה. אבל היא לא אוספת ביקורות גוגל, לא מגנה על המוניטין שלכם, ואין לה שום דרך לזהות או להחזיר לקוחות שהפסיקו להגיע. וומני עושה את שלושת הדברים — בעברית, בוואטסאפ, אוטומטית.",
    },
  },
  ctaImport: {
    en: "Import my Calmark clients →",
    he: "ייבוא לקוחות מקאלמארק ←",
  },
  whatCalmarkDoes: {
    title: { en: "What Calmark does well", he: "מה קאלמארק עושה טוב" },
    body: {
      en: "Calmark built the best Hebrew-first booking calendar in Israel. The diary, the invoicing, the tax-authority-approved receipts — for Israeli businesses, it works. Thousands of businesses use it, and for good reason.",
      he: "קאלמארק בנתה את יומן ההזמנות הטוב ביותר בעברית בישראל. היומן, החשבוניות, הקבלות המאושרות על ידי רשות המסים — עבור עסקים ישראלים, זה עובד. אלפי עסקים משתמשים בה, ובצדק.",
    },
  },
  whatsMissing: {
    title: { en: "What Calmark doesn't have", he: "מה חסר בקאלמארק" },
    items: {
      en: [
        "WhatsApp confirmations and reminders are only on Premium (₪139/month) and Business (₪169/month) plans — not included in the basic ₪99/month plan.",
        "No automated review requests to Google — reviews stay only within the Calmark platform.",
        "No smart routing — a 1-star review goes public immediately with no way to intercept it.",
        "No system to identify customers who haven't come back in 4–6 weeks.",
        "No automated WhatsApp nudges to lapsed customers.",
        "No booking pattern tracking — you can't see that Dana always comes every 5 weeks and is now 3 weeks overdue.",
      ],
      he: [
        "אישורי וואטסאפ ותזכורות זמינים רק במנוי פרימיום (139 ₪/חודש) ועסקי (169 ₪/חודש) — לא כלולים במנוי הבסיסי.",
        "אין בקשות ביקורת אוטומטיות לגוגל — ביקורות נשארות רק בתוך פלטפורמת קאלמארק.",
        "אין ניתוב חכם — ביקורת של כוכב אחד מתפרסמת מיד ללא אפשרות לעצור אותה.",
        "אין מערכת לזיהוי לקוחות שלא חזרו ב-4–6 שבועות האחרונים.",
        "אין הודעות וואטסאפ אוטומטיות ללקוחות שנטשו.",
        "אין מעקב אחר דפוסי הזמנות — אי אפשר לראות שדנה מגיעה כל 5 שבועות ועכשיו היא 3 שבועות מאוחרת.",
      ],
    },
  },
  tableTitle: {
    en: "Calmark vs Vomni",
    he: "קאלמארק מול וומני",
  },
  tableRows: [
    {
      label: { en: "Online booking", he: "הזמנות אונליין" },
      calmark: { val: "✓", good: true },
      vomni:   { val: "✓", good: true },
    },
    {
      label: { en: "WhatsApp confirmations (all plans)", he: "אישורי וואטסאפ (כל המנויים)" },
      calmark: { val: "✗ Premium+ only", good: false },
      vomni:   { val: "✓ Every plan", good: true },
    },
    {
      label: { en: "Automated Google review requests", he: "בקשות ביקורת גוגל אוטומטיות" },
      calmark: { val: "✗", good: false },
      vomni:   { val: "✓ After every visit", good: true },
    },
    {
      label: { en: "Smart review routing (bad reviews stay private)", he: "ניתוב חכם (ביקורות רעות נשארות פנימיות)" },
      calmark: { val: "✗", good: false },
      vomni:   { val: "✓ Built in", good: true },
    },
    {
      label: { en: "Lapsed customer re-engagement AI", he: "החזרת לקוחות אוטומטית" },
      calmark: { val: "✗", good: false },
      vomni:   { val: "✓ Automatic", good: true },
    },
    {
      label: { en: "Booking pattern tracking", he: "מעקב דפוסי הזמנות" },
      calmark: { val: "✗", good: false },
      vomni:   { val: "✓ Full CRM", good: true },
    },
    {
      label: { en: "Export your data anytime", he: "ייצוא נתונים בכל עת" },
      calmark: { val: "Excel (screen-level only)", good: false },
      vomni:   { val: "✓ Full CSV always", good: true },
    },
    {
      label: { en: "Booking commission", he: "עמלת הזמנות" },
      calmark: { val: "None", good: true },
      vomni:   { val: "None", good: true },
    },
  ],
  exportGuide: {
    title: { en: "How to export from Calmark", he: "כיצד לייצא מקאלמארק" },
    steps: {
      en: [
        "Log into your Calmark account.",
        "Go to the client management screen.",
        "Use the Excel export option to download your client list.",
        "If the export shows only the current view, use filters to select all clients first.",
        "Upload the CSV to Vomni via Settings → Import clients — Hebrew column names are matched automatically.",
      ],
      he: [
        "התחברו לחשבון קאלמארק שלכם.",
        "נווטו למסך ניהול הלקוחות.",
        "השתמשו באפשרות ייצוא לאקסל להורדת רשימת הלקוחות.",
        "אם הייצוא מציג רק את התצוגה הנוכחית, השתמשו בפילטרים לבחירת כל הלקוחות.",
        "העלו את הקובץ לוומני דרך הגדרות → ייבוא לקוחות — שמות העמודות בעברית מזוהים אוטומטית.",
      ],
    },
  },
  clientsSection: {
    title: { en: "What doesn't change for your customers", he: "מה לא משתנה עבור הלקוחות שלכם" },
    body: {
      en: "Nothing. Same phone number. Same business name. A new booking link that takes 30 seconds to share. Your customers don't download anything, they just tap and book.",
      he: "כלום. אותו מספר טלפון. אותו שם עסק. לינק הזמנה חדש שלוקח 30 שניות לשלוח. הלקוחות שלכם לא מורידים כלום — הם פשוט מקישים ומזמינים.",
    },
  },
  finalCta: {
    title: { en: "Ready when you are.", he: "מוכנים כשאתם מוכנים." },
    sub: {
      en: "No commission. No long-term contract. WhatsApp review automation from day one.",
      he: "ללא עמלות. ללא חוזה לטווח ארוך. אוטומציית ביקורות WhatsApp מהיום הראשון.",
    },
    trial: { en: "Start your free trial →", he: "התחילו ניסיון חינם ←" },
    guarantee: { en: "14-day money-back guarantee", he: "אחריות החזר כספי ל-14 יום" },
  },
};

export default function CalmarkPage() {
  const [lang, setLang] = useState<Lang>("he");
  const isHe = lang === "he";
  const dir = isHe ? "rtl" : "ltr";

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Nav />

      {/* ── LANGUAGE TOGGLE ───────────────────────────────────────────────── */}
      <div style={{ background: OW, borderBottom: `1px solid ${BD}`, padding: "12px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM }}>Language:</span>
          <button
            onClick={() => setLang("en")}
            style={{
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              color: lang === "en" ? "#fff" : TS,
              background: lang === "en" ? G : "transparent",
              border: `1px solid ${lang === "en" ? G : BD}`,
              borderRadius: 9999, padding: "4px 14px", cursor: "pointer", transition: "all 0.2s"
            }}
          >
            EN
          </button>
          <button
            onClick={() => setLang("he")}
            style={{
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              color: lang === "he" ? "#fff" : TS,
              background: lang === "he" ? G : "transparent",
              border: `1px solid ${lang === "he" ? G : BD}`,
              borderRadius: 9999, padding: "4px 14px", cursor: "pointer", transition: "all 0.2s"
            }}
          >
            עב
          </button>
        </div>
      </div>

      <div dir={dir}>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section style={{ background: "#fff", padding: "96px 0 80px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 9999, padding: "6px 16px", marginBottom: 32 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#059669" }}>
                {CONTENT.badge[lang]}
              </span>
            </div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: N, marginBottom: 24, whiteSpace: "pre-line" }}>
              {CONTENT.hero[lang].h1}
            </h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, lineHeight: 1.6, color: TS, maxWidth: 660, margin: "0 auto 40px" }}>
              {CONTENT.hero[lang].sub}
            </p>
            <a
              href="https://vomni.io/signup"
              style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = GD)}
              onMouseLeave={e => (e.currentTarget.style.background = G)}
            >
              {CONTENT.ctaImport[lang]}
            </a>
          </div>
        </section>

        {/* ── WHAT CALMARK DOES WELL ─────────────────────────────────────────── */}
        <section style={{ background: OW, padding: "64px 0" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)", border: `1px solid ${BD}` }}>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 800, color: N, marginBottom: 20 }}>
                {CONTENT.whatCalmarkDoes.title[lang]}
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, lineHeight: 1.8, color: TS }}>
                {CONTENT.whatCalmarkDoes.body[lang]}
              </p>
            </div>
          </div>
        </section>

        {/* ── WHAT'S MISSING ────────────────────────────────────────────────── */}
        <section style={{ background: N, padding: "80px 0" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: "#fff", marginBottom: 40, textAlign: "center" }}>
              {CONTENT.whatsMissing.title[lang]}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {CONTENT.whatsMissing.items[lang].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", flexDirection: isHe ? "row-reverse" : "row" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: 8 }} />
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", textAlign: isHe ? "right" : "left" }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON TABLE ─────────────────────────────────────────────── */}
        <section style={{ background: "#fff", padding: "96px 0" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: N, marginBottom: 48, textAlign: "center" }}>
              {CONTENT.tableTitle[lang]}
            </h2>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table style={{ width: "100%", minWidth: "480px", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "16px 20px", textAlign: isHe ? "right" : "left", fontSize: 13, fontWeight: 600, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${BD}`, background: OW }}></th>
                    <th style={{ padding: "16px 20px", textAlign: "center", fontSize: 15, fontWeight: 700, color: N, borderBottom: `2px solid ${BD}`, background: OW, minWidth: 160 }}>Calmark</th>
                    <th style={{ padding: "16px 20px", textAlign: "center", fontSize: 15, fontWeight: 700, color: G, borderBottom: `2px solid ${BD}`, background: "rgba(0,200,150,0.05)", minWidth: 160 }}>Vomni</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTENT.tableRows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : OW }}>
                      <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 500, color: N, borderBottom: `1px solid ${BD}`, textAlign: isHe ? "right" : "left" }}>
                        {row.label[lang]}
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "center", fontSize: 14, borderBottom: `1px solid ${BD}` }}>
                        <span style={{ color: row.calmark.good ? G : (row.calmark.val.startsWith("✗") ? RED : TS), fontWeight: row.calmark.val === "✓" || row.calmark.val.startsWith("✗") ? 700 : 400 }}>
                          {row.calmark.val}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "center", fontSize: 14, borderBottom: `1px solid ${BD}`, background: "rgba(0,200,150,0.02)" }}>
                        <span style={{ color: row.vomni.good ? G : TS, fontWeight: row.vomni.val === "✓" || row.vomni.val.startsWith("✓") ? 700 : 400 }}>
                          {row.vomni.val}
                        </span>
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
              {CONTENT.exportGuide.title[lang]}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {CONTENT.exportGuide.steps[lang].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 20, flexDirection: isHe ? "row-reverse" : "row" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 800, color: "#fff" }}>{i + 1}</span>
                    </div>
                    {i < CONTENT.exportGuide.steps[lang].length - 1 && (
                      <div style={{ width: 2, flex: 1, background: BD, minHeight: 32, margin: "4px 0" }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < CONTENT.exportGuide.steps[lang].length - 1 ? 24 : 0, paddingTop: 6 }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, lineHeight: 1.7, color: N, textAlign: isHe ? "right" : "left" }}>
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
                {CONTENT.ctaImport[lang]}
              </a>
            </div>
          </div>
        </section>

        {/* ── WHAT DOESN'T CHANGE ──────────────────────────────────────────── */}
        <section style={{ background: "#fff", padding: "80px 0" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
            <div style={{ background: OW, borderRadius: 20, padding: "clamp(20px, 4vw, 48px)", border: `1px solid ${BD}`, textAlign: "center" }}>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 800, color: N, marginBottom: 20 }}>
                {CONTENT.clientsSection.title[lang]}
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, lineHeight: 1.7, color: TS, maxWidth: 540, margin: "0 auto" }}>
                {CONTENT.clientsSection.body[lang]}
              </p>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIAL PLACEHOLDER ──────────────────────────────────────── */}
        <section style={{ background: OW, padding: "64px 0" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)", textAlign: "center" }}>
            {/* Replace with real Calmark user testimonial */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)", border: `1px solid ${BD}` }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 20 }}>
                {[0,1,2,3,4].map(s => (
                  <svg key={s} width={20} height={20} viewBox="0 0 20 20" fill={G}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, lineHeight: 1.7, color: N, fontStyle: "italic", marginBottom: 16 }}>
                &ldquo;{isHe
                  ? "היו לנו 600 לקוחות בקאלמארק. ייצאנו את הקובץ, העלינו לוומני — תוך 20 דקות הכל היה בפנים. הביקורות בגוגל התחילו להגיע עוד באותו שבוע."
                  : "We had 600 clients in Calmark. Exported the file, uploaded to Vomni — within 20 minutes everything was in. Google reviews started coming in that same week."
                }&rdquo;
              </p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: TS }}>
                {isHe ? "- יעל, סטודיו יעל" : "- Yael, Studio Yael"}
              </p>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
        <section style={{ background: "#fff", padding: "80px 0", textAlign: "center" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 clamp(16px, 5vw, 48px)" }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: N, marginBottom: 16 }}>
              {CONTENT.finalCta.title[lang]}
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS, marginBottom: 40, lineHeight: 1.6 }}>
              {CONTENT.finalCta.sub[lang]}
            </p>
            <a
              href="https://vomni.io/signup"
              style={{ display: "inline-block", background: G, color: "#fff", borderRadius: 9999, padding: "18px 48px", fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = GD)}
              onMouseLeave={e => (e.currentTarget.style.background = G)}
            >
              {CONTENT.finalCta.trial[lang]}
            </a>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, marginTop: 16 }}>
              {CONTENT.finalCta.guarantee[lang]}
            </p>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
