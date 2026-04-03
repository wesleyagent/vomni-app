"use client";

import { useState, useEffect } from "react";

const G   = "#00C896";
const GD  = "#00A87D";
const N   = "#0A0F1E";
const TS  = "#6B7280";
const BD  = "#E5E7EB";

const NAV_LINKS = [
  { label: "How it Works", href: "https://vomni.io/#how-it-works" },
  { label: "Pricing",      href: "https://vomni.io/#pricing" },
  { label: "Switch to Vomni", href: "/migrate" },
  { label: "Book a Demo",  href: "https://vomni.io/#book-demo", green: true },
  { label: "Login",        href: "https://vomni.io/login" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100, height: 72,
        background: "#fff",
        borderBottom: scrolled ? `1px solid ${BD}` : "1px solid transparent",
        transition: "border-color 0.2s",
        display: "flex", alignItems: "center",
      }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <a href="https://vomni.io" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: N }}>Vomni</span>
          </a>
          <div className="nav-links" style={{ display: "flex", gap: 32, alignItems: "center" }}>
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: item.green ? 600 : 500,
                  color: item.green ? G : TS, textDecoration: "none", cursor: "pointer"
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
          {/* Desktop Get Started */}
          <a
            href="https://vomni.io/signup"
            className="nav-get-started"
            style={{ background: G, color: "#fff", borderRadius: 9999, padding: "12px 28px", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = GD)}
            onMouseLeave={e => (e.currentTarget.style.background = G)}
          >
            Get Started
          </a>
          {/* Mobile right */}
          <div className="nav-mobile-right" style={{ display: "none", alignItems: "center", gap: 12 }}>
            <a href="https://vomni.io/signup"
              style={{ background: G, color: "#fff", borderRadius: 9999, padding: "10px 20px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              Get Started
            </a>
            <button
              className={`nav-hamburger burger-btn${menuOpen ? " open" : ""}`}
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center" }}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: N }}>Vomni</span>
          <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }} aria-label="Close menu">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={N} strokeWidth={2} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 8 }}>
          {[...NAV_LINKS, { label: "Login", href: "https://vomni.io/login", green: false }].filter((v,i,a)=>a.findIndex(x=>x.label===v.label)===i).map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="mobile-menu-link"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block",
                borderBottom: `1px solid ${BD}`,
                padding: "20px 0", textDecoration: "none",
                fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 600,
                color: item.green ? G : N,
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="mobile-menu-link" style={{ paddingBottom: 40, flexShrink: 0 }}>
          <a href="https://vomni.io/signup" style={{ display: "block", background: G, color: "#fff", borderRadius: 9999, padding: "18px 0", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
            Get Started
          </a>
        </div>
      </div>
    </>
  );
}
