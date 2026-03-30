"use client";

import { useState, useEffect, useRef } from "react";

interface Language { code: string; name: string; flag: string; }
interface Currency { code: string; symbol: string; name: string; flag: string; rate: number; }

const LANGUAGES: Language[] = [
  { code: "en",    flag: "🇬🇧", name: "English"    },
  { code: "iw",    flag: "🇮🇱", name: "עברית"      },
  { code: "ar",    flag: "🇸🇦", name: "العربية"    },
  { code: "zh-CN", flag: "🇨🇳", name: "中文"       },
  { code: "fr",    flag: "🇫🇷", name: "Français"   },
  { code: "de",    flag: "🇩🇪", name: "Deutsch"    },
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

/** Clears every variant of the googtrans cookie */
function clearGoogTransCookie() {
  const h = window.location.hostname;
  const exp = "expires=Thu, 01 Jan 1970 00:00:01 UTC; path=/;";
  document.cookie = `googtrans=; ${exp}`;
  document.cookie = `googtrans=; ${exp} domain=${h};`;
  document.cookie = `googtrans=; ${exp} domain=.${h};`;
}

type PriceSnap = { node: Text; original: string };

export default function TranslateWidget() {
  const [open,           setOpen]           = useState(false);
  const [tab,            setTab]            = useState<"lang" | "currency">("lang");
  const [activeLang,     setActiveLang]     = useState("en");
  const [activeCurrency, setActiveCurrency] = useState("GBP");
  const panelRef  = useRef<HTMLDivElement>(null);
  const priceSnaps = useRef<PriceSnap[]>([]);

  // ── On mount: ensure page always starts in English ───────────────────────
  useEffect(() => {
    clearGoogTransCookie();
    setActiveLang("en");
  }, []);

  // ── Load Google Translate (hidden, no auto-display) ───────────────────────
  useEffect(() => {
    (window as any).googleTranslateElementInit = () => {
      try {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "gt_root"
        );
      } catch { /* ignore */ }
    };
    if (!document.getElementById("gt_script")) {
      const s  = document.createElement("script");
      s.id     = "gt_script";
      s.src    = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async  = true;
      document.head.appendChild(s);
    }
  }, []);

  // ── Snapshot £ price nodes for currency conversion ────────────────────────
  useEffect(() => {
    let tries = 0;
    function collect() {
      const found: PriceSnap[] = [];
      function walk(n: Node) {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n.textContent ?? "";
          if (/£\d/.test(t)) {
            const p = (n as Text).parentElement;
            if (p && !["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"].includes(p.tagName))
              found.push({ node: n as Text, original: t });
          }
        } else { n.childNodes.forEach(walk); }
      }
      walk(document.body);
      if (found.length > 0 || tries++ >= 10) priceSnaps.current = found;
      else setTimeout(collect, 500);
    }
    setTimeout(collect, 1800);
  }, []);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // ── Language switcher ─────────────────────────────────────────────────────
  function applyLanguage(code: string) {
    setActiveLang(code);
    setOpen(false);

    if (code === "en") {
      clearGoogTransCookie();
      // Restore notranslate so auto-translation is blocked again
      document.documentElement.setAttribute("translate", "no");
      window.location.reload();
      return;
    }

    // Allow GT to translate — remove the notranslate block
    document.documentElement.removeAttribute("translate");

    // Set the googtrans cookie then trigger GT
    const h = window.location.hostname;
    document.cookie = `googtrans=/en/${code}; path=/`;
    document.cookie = `googtrans=/en/${code}; path=/; domain=.${h}`;

    const tryTrigger = (attempts = 0) => {
      const sel = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (sel) {
        sel.value = code;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (attempts < 20) {
        setTimeout(() => tryTrigger(attempts + 1), 300);
      }
    };
    setTimeout(() => tryTrigger(), 500);
  }

  // ── Currency converter ────────────────────────────────────────────────────
  function applyCurrency(code: string) {
    setActiveCurrency(code);
    setOpen(false);
    const target = CURRENCIES.find(c => c.code === code)!;

    // Re-collect if needed
    if (priceSnaps.current.length === 0) {
      const found: PriceSnap[] = [];
      function walk(n: Node) {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n.textContent ?? "";
          if (/£\d/.test(t)) {
            const p = (n as Text).parentElement;
            if (p && !["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"].includes(p.tagName))
              found.push({ node: n as Text, original: t });
          }
        } else { n.childNodes.forEach(walk); }
      }
      walk(document.body);
      priceSnaps.current = found;
    }

    priceSnaps.current.forEach(({ node, original }) => {
      if (!document.body.contains(node)) return;
      if (code === "GBP") { node.textContent = original; return; }
      node.textContent = original.replace(/£([\d,]+)/g, (_, raw) => {
        const gbp = parseInt(raw.replace(/,/g, ""), 10);
        return target.symbol + " " + Math.round(gbp * target.rate).toLocaleString();
      });
    });
  }

  const curLang = LANGUAGES.find(l => l.code === activeLang) ?? LANGUAGES[0];
  const curCurr = CURRENCIES.find(c => c.code === activeCurrency) ?? CURRENCIES[0];
  const nonDefault = activeLang !== "en" || activeCurrency !== "GBP";

  return (
    <>
      {/* Hidden GT mount point */}
      <div id="gt_root" style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, overflow: "hidden", pointerEvents: "none" }} />

      {/* Suppress GT toolbar */}
      <style>{`
        .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame,
        .goog-te-ftab-float, .skiptranslate > iframe { display: none !important; }
        body { top: 0 !important; }
        @keyframes wtIn { from { opacity:0; transform:translateY(8px) scale(0.97); } to { opacity:1; transform:none; } }
      `}</style>

      <div ref={panelRef} className="wt-container" style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9000 }}>

        {/* Panel */}
        {open && (
          <div className="wt-panel" style={{
            position: "absolute", bottom: 62, left: 0,
            width: "min(340px, calc(100vw - 48px))",
            background: "#fff", borderRadius: 20,
            boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #E5E7EB", overflow: "hidden",
            animation: "wtIn 0.18s ease",
          }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
              {(["lang", "currency"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "13px 0", background: "none", border: "none",
                  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", color: tab === t ? "#0A0F1E" : "#9CA3AF",
                  borderBottom: `2px solid ${tab === t ? "#00C896" : "transparent"}`,
                  transition: "all 0.15s",
                }}>
                  {t === "lang" ? "🌐  Language" : "💱  Currency"}
                </button>
              ))}
            </div>

            {/* Language grid */}
            {tab === "lang" && (
              <div style={{ padding: 12, maxHeight: 340, overflowY: "auto" }}>
                <div className="wt-lang-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {LANGUAGES.map(lang => {
                    const active = activeLang === lang.code;
                    return (
                      <button key={lang.code} onClick={() => applyLanguage(lang.code)} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "9px 11px", borderRadius: 10,
                        border: `1px solid ${active ? "#00C896" : "#E5E7EB"}`,
                        background: active ? "rgba(0,200,150,0.07)" : "#fff",
                        fontFamily: "Inter, sans-serif", fontSize: 13,
                        color: active ? "#00C896" : "#111827",
                        fontWeight: active ? 600 : 400,
                        cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                      }}>
                        <span style={{ fontSize: 17 }}>{lang.flag}</span>
                        {lang.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Currency list */}
            {tab === "currency" && (
              <div style={{ padding: 12, maxHeight: 340, overflowY: "auto" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", margin: "0 0 8px 4px", letterSpacing: "0.06em" }}>
                  APPROXIMATE RATES · UPDATED MONTHLY
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {CURRENCIES.map(curr => {
                    const active = activeCurrency === curr.code;
                    return (
                      <button key={curr.code} onClick={() => applyCurrency(curr.code)} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 12px", borderRadius: 10,
                        border: `1px solid ${active ? "#00C896" : "#E5E7EB"}`,
                        background: active ? "rgba(0,200,150,0.07)" : "#fff",
                        fontFamily: "Inter, sans-serif", fontSize: 13,
                        color: active ? "#00C896" : "#111827",
                        fontWeight: active ? 600 : 400,
                        cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                      }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{curr.flag}</span>
                          {curr.name}
                        </span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: active ? "#00C896" : "#9CA3AF", fontWeight: 600 }}>
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
          className="wt-trigger-btn"
          style={{
            width: 50, height: 50, borderRadius: "50%",
            background: open ? "#00C896" : "#0A0F1E",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
            transition: "background 0.2s, transform 0.15s",
            fontSize: 20,
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          {open ? "✕" : "🌐"}
        </button>

        {/* Active state badge */}
        {nonDefault && !open && (
          <div style={{
            position: "absolute", top: -6, right: -6,
            background: "#00C896", borderRadius: 9999,
            padding: "2px 7px", fontSize: 10, fontWeight: 700,
            fontFamily: "Inter, sans-serif", color: "#fff",
            pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            {activeLang !== "en" ? curLang.flag : ""}
            {activeCurrency !== "GBP" ? " " + curCurr.symbol : ""}
          </div>
        )}
      </div>
    </>
  );
}
