"use client";

import { useState, useEffect, useRef } from "react";

interface Currency { code: string; symbol: string; name: string; flag: string; rate: number; }
interface Language { code: string; name: string; flag: string; }

const CURRENCIES: Currency[] = [
  { code: "GBP", symbol: "£",   flag: "🇬🇧", name: "British Pound",      rate: 1      },
  { code: "USD", symbol: "$",   flag: "🇺🇸", name: "US Dollar",          rate: 1.27   },
  { code: "EUR", symbol: "€",   flag: "🇪🇺", name: "Euro",               rate: 1.17   },
  { code: "ILS", symbol: "₪",   flag: "🇮🇱", name: "Israeli Shekel",     rate: 4.68   },
  { code: "AED", symbol: "AED", flag: "🇦🇪", name: "UAE Dirham",         rate: 4.66   },
  { code: "SAR", symbol: "SAR", flag: "🇸🇦", name: "Saudi Riyal",        rate: 4.77   },
  { code: "AUD", symbol: "A$",  flag: "🇦🇺", name: "Australian Dollar",  rate: 1.92   },
  { code: "CAD", symbol: "C$",  flag: "🇨🇦", name: "Canadian Dollar",    rate: 1.73   },
  { code: "SGD", symbol: "S$",  flag: "🇸🇬", name: "Singapore Dollar",   rate: 1.70   },
  { code: "INR", symbol: "₹",   flag: "🇮🇳", name: "Indian Rupee",       rate: 107    },
  { code: "ZAR", symbol: "R",   flag: "🇿🇦", name: "South African Rand", rate: 23.5   },
  { code: "NGN", symbol: "₦",   flag: "🇳🇬", name: "Nigerian Naira",     rate: 2095   },
];

const LANGUAGES: Language[] = [
  { code: "en",    flag: "🇬🇧", name: "English"    },
  { code: "ar",    flag: "🇸🇦", name: "العربية"    },
  { code: "zh-CN", flag: "🇨🇳", name: "中文"       },
  { code: "fr",    flag: "🇫🇷", name: "Français"   },
  { code: "de",    flag: "🇩🇪", name: "Deutsch"    },
  { code: "iw",    flag: "🇮🇱", name: "עברית"      },
  { code: "hi",    flag: "🇮🇳", name: "हिन्दी"     },
  { code: "it",    flag: "🇮🇹", name: "Italiano"   },
  { code: "ja",    flag: "🇯🇵", name: "日本語"     },
  { code: "ko",    flag: "🇰🇷", name: "한국어"     },
  { code: "pt",    flag: "🇧🇷", name: "Português"  },
  { code: "ru",    flag: "🇷🇺", name: "Русский"    },
  { code: "es",    flag: "🇪🇸", name: "Español"    },
  { code: "tr",    flag: "🇹🇷", name: "Türkçe"     },
  { code: "uk",    flag: "🇺🇦", name: "Українська" },
  { code: "nl",    flag: "🇳🇱", name: "Nederlands"  },
];

type Snap = { node: Text; original: string };

// Read current googtrans cookie to detect active language on load
function readGoogTransCookie(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/googtrans=\/en\/([^;]+)/);
  return m ? m[1] : "en";
}

export default function TranslateWidget() {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<"lang" | "currency">("lang");
  const [activeLang, setActiveLang]       = useState("en");
  const [activeCurrency, setActiveCurrency] = useState("GBP");
  const panelRef  = useRef<HTMLDivElement>(null);
  const snaps     = useRef<Snap[]>([]);
  const snapDone  = useRef(false);

  // Detect active language from cookie on mount, then trigger GT if non-English
  useEffect(() => {
    const lang = readGoogTransCookie();
    setActiveLang(lang);
    if (lang !== "en") {
      // After GT initialises, programmatically set the language via the hidden combo
      let attempts = 0;
      const tryTrigger = () => {
        const sel = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (sel) {
          sel.value = lang;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }
        if (attempts++ < 20) setTimeout(tryTrigger, 300);
      };
      setTimeout(tryTrigger, 800);
    }
  }, []);

  // Load Google Translate script — mount element OFF-SCREEN (not display:none)
  // so GT can initialise properly
  useEffect(() => {
    (window as any).googleTranslateElementInit = () => {
      try {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false, layout: 0 },
          "gt_root"
        );
      } catch { /* ignore */ }
    };
    if (!document.getElementById("gt_script")) {
      const s = document.createElement("script");
      s.id  = "gt_script";
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  // Snapshot all £ text nodes — retry until found or 5s timeout
  useEffect(() => {
    let attempts = 0;
    function collect() {
      const found: Snap[] = [];
      function walk(n: Node) {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n.textContent || "";
          if (/£\d/.test(t)) {
            const p = (n as Text).parentElement;
            if (p && !["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"].includes(p.tagName)) {
              found.push({ node: n as Text, original: t });
            }
          }
        } else {
          n.childNodes.forEach(walk);
        }
      }
      walk(document.body);
      if (found.length > 0 || attempts >= 10) {
        snaps.current = found;
        snapDone.current = true;
      } else {
        attempts++;
        setTimeout(collect, 500);
      }
    }
    setTimeout(collect, 1800);
  }, []);

  // ── Language: try programmatic trigger first; fall back to cookie + reload ──
  function applyLanguage(code: string) {
    setActiveLang(code);
    setOpen(false);

    // Always persist the choice in cookie so it survives page navigations
    if (code === "en") {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:01 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:01 UTC; path=/; domain=.${window.location.hostname}`;
    } else {
      document.cookie = `googtrans=/en/${code}; path=/`;
      document.cookie = `googtrans=/en/${code}; path=/; domain=.${window.location.hostname}`;
    }

    // Try to trigger GT's hidden combo select (no-reload path)
    const sel = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (sel) {
      sel.value = code === "en" ? "" : code;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return; // done — no page reload needed
    }

    // GT combo not ready yet — reload so cookie kicks in on next load
    window.location.reload();
  }

  // ── Currency: walk text nodes and replace £ amounts ──────────────────────
  function applyCurrency(code: string) {
    setActiveCurrency(code);
    setOpen(false);
    const target = CURRENCIES.find(c => c.code === code)!;

    // Re-snapshot if not done yet
    if (!snapDone.current) {
      const found: Snap[] = [];
      function walk(n: Node) {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n.textContent || "";
          if (/£\d/.test(t)) {
            const p = (n as Text).parentElement;
            if (p && !["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"].includes(p.tagName)) {
              found.push({ node: n as Text, original: t });
            }
          }
        } else { n.childNodes.forEach(walk); }
      }
      walk(document.body);
      snaps.current = found;
    }

    snaps.current.forEach(({ node, original }) => {
      if (!document.body.contains(node)) return;
      if (code === "GBP") {
        node.textContent = original;
        return;
      }
      node.textContent = original.replace(/£([\d,]+)/g, (_, raw) => {
        const gbp = parseInt(raw.replace(/,/g, ""), 10);
        const converted = Math.round(gbp * target.rate);
        return target.symbol + " " + converted.toLocaleString();
      });
    });
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const curLang = LANGUAGES.find(l => l.code === activeLang) ?? LANGUAGES[0];
  const curCurr = CURRENCIES.find(c => c.code === activeCurrency) ?? CURRENCIES[0];
  const nonDefault = activeLang !== "en" || activeCurrency !== "GBP";

  return (
    <>
      {/* GT mount — off-screen but NOT display:none so GT can initialise */}
      <div id="gt_root" style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, overflow: "hidden", pointerEvents: "none" }} />

      {/* Suppress Google Translate toolbar while keeping the element alive */}
      <style>{`
        .goog-te-banner-frame, .goog-te-ftab-float,
        #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
        body { top: 0 !important; }
        .skiptranslate > iframe { display: none !important; }
        @keyframes wtPanelIn {
          from { opacity:0; transform:translateY(8px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }
      `}</style>

      <div ref={panelRef} style={{ position:"fixed", bottom:24, left:24, zIndex:9000 }}>

        {/* Panel */}
        {open && (
          <div style={{
            position:"absolute", bottom:62, left:0, width:340,
            background:"#fff", borderRadius:20,
            boxShadow:"0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            border:"1px solid #E5E7EB", overflow:"hidden",
            animation:"wtPanelIn 0.18s ease",
          }}>

            {/* Tabs */}
            <div style={{ display:"flex", borderBottom:"1px solid #E5E7EB" }}>
              {(["lang","currency"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex:1, padding:"13px 0", background:"none", border:"none",
                  fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600,
                  cursor:"pointer", color: tab===t ? "#0A0F1E" : "#9CA3AF",
                  borderBottom:`2px solid ${tab===t ? "#00C896" : "transparent"}`,
                  transition:"all 0.15s",
                }}>
                  {t === "lang" ? "🌐  Language" : "💱  Currency"}
                </button>
              ))}
            </div>

            {/* Language grid */}
            {tab === "lang" && (
              <div style={{ padding:12, maxHeight:340, overflowY:"auto" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {LANGUAGES.map(lang => {
                    const active = activeLang === lang.code;
                    return (
                      <button key={lang.code} onClick={() => applyLanguage(lang.code)} style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"9px 11px", borderRadius:10,
                        border:`1px solid ${active ? "#00C896" : "#E5E7EB"}`,
                        background: active ? "rgba(0,200,150,0.07)" : "#fff",
                        fontFamily:"Inter,sans-serif", fontSize:13,
                        color: active ? "#00C896" : "#111827",
                        fontWeight: active ? 600 : 400,
                        cursor:"pointer", textAlign:"left", transition:"all 0.12s",
                      }}>
                        <span style={{ fontSize:17 }}>{lang.flag}</span>
                        {lang.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Currency list */}
            {tab === "currency" && (
              <div style={{ padding:12, maxHeight:340, overflowY:"auto" }}>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"#9CA3AF", margin:"0 0 8px 4px", letterSpacing:"0.06em" }}>
                  APPROXIMATE RATES · UPDATED MONTHLY
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {CURRENCIES.map(curr => {
                    const active = activeCurrency === curr.code;
                    return (
                      <button key={curr.code} onClick={() => applyCurrency(curr.code)} style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"9px 12px", borderRadius:10,
                        border:`1px solid ${active ? "#00C896" : "#E5E7EB"}`,
                        background: active ? "rgba(0,200,150,0.07)" : "#fff",
                        fontFamily:"Inter,sans-serif", fontSize:13,
                        color: active ? "#00C896" : "#111827",
                        fontWeight: active ? 600 : 400,
                        cursor:"pointer", textAlign:"left", transition:"all 0.12s",
                      }}>
                        <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:16 }}>{curr.flag}</span>
                          {curr.name}
                        </span>
                        <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color: active?"#00C896":"#9CA3AF", fontWeight:600 }}>
                          {curr.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setOpen(o => !o)}
          title="Language & Currency"
          style={{
            width:50, height:50, borderRadius:"50%",
            background: open ? "#00C896" : "#0A0F1E",
            border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 20px rgba(0,0,0,0.22)",
            transition:"background 0.2s, transform 0.15s",
            fontSize:20,
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          {open ? "✕" : "🌐"}
        </button>

        {/* Badge showing active state */}
        {nonDefault && !open && (
          <div style={{
            position:"absolute", top:-6, right:-6,
            background:"#00C896", borderRadius:9999,
            padding:"2px 7px", fontSize:10, fontWeight:700,
            fontFamily:"Inter,sans-serif", color:"#fff",
            pointerEvents:"none", whiteSpace:"nowrap",
          }}>
            {activeLang !== "en" ? curLang.flag : ""}
            {activeCurrency !== "GBP" ? " " + curCurr.symbol : ""}
          </div>
        )}
      </div>
    </>
  );
}
