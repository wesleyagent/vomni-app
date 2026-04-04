"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    gsap: any;
    ScrollTrigger: any;
    Chart: any;
  }
}

// ─── Color constants ─────────────────────────────────────────────────────────
const G   = "#00C896";
const GD  = "#00A87D";
const N   = "#0A0F1E";
const OW  = "#F7F8FA";
const TS  = "#6B7280";
const TM  = "#9CA3AF";
const BD  = "#E5E7EB";

// ─── Reusable primitives ─────────────────────────────────────────────────────
function StarSVG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={G}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function Stars({ count = 5, size = 20 }: { count?: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => <StarSVG key={i} size={size} />)}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 20 20" fill={G} style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function BrowserChrome({ url }: { url: string }) {
  return (
    <div style={{ height: 44, background: OW, borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 8, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {(["#FF5F57", "#FEBC2E", "#28C840"] as string[]).map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 8, height: 24, width: 300, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: TM, fontFamily: "Inter, sans-serif" }}>
          {url}
        </div>
      </div>
    </div>
  );
}

// ─── iPhone mockup ────────────────────────────────────────────────────────────
function IPhone({ animate = false }: { animate?: boolean }) {
  return (
    <div className={`iphone${animate ? " iphone-anim" : ""}`}>
      <div className="iphone-screen">
        <div className="iphone-notch" />
        <div className="iphone-home-indicator" />
        <div style={{ paddingTop: 56, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Scissors icon */}
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: TM, marginTop: 8, textAlign: "center" }}>
            KINGS CUTS LONDON
          </p>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, marginTop: 20, textAlign: "center", lineHeight: 1.2 }}>
            How was your experience?
          </h3>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM, marginTop: 8, textAlign: "center" }}>
            Hi James - we&apos;d love to hear your thoughts
          </p>
          <div style={{ marginTop: 28 }}>
            <Stars count={5} size={38} />
          </div>
          <button style={{ marginTop: 28, width: "100%", background: G, color: "#fff", borderRadius: 14, padding: "16px 0", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer" }}>
            Leave a Google Review →
          </button>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: TM, textAlign: "center", marginTop: 10 }}>
            Takes 30 seconds · Helps us grow
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab() {
  const metrics = [
    { label: "Today's bookings", value: "6",   sub: "Saturday 4 Apr",  warn: false },
    { label: "Google reviews",   value: "7",   sub: "↑ 3 this month",  warn: false },
    { label: "Completion rate",  value: "66%", sub: "↑ vs 40% avg",    warn: false },
    { label: "Avg rating",       value: "4.8", sub: "Up 0.3 stars",    warn: false },
  ];
  const activity = [
    { name: "Yoni K.",  status: "Confirmed booking",           color: G },
    { name: "Dana M.",  status: "Rebooked via WhatsApp",        color: G },
    { name: "Lior T.",  status: "Left a 5-star review",         color: G },
    { name: "Ron S.",   status: "Appointment reminder sent",    color: TM },
  ];
  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20, color: N }}>Kings Cuts London</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: OW, borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: TM }}>{m.label}</p>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: m.warn ? "#F59E0B" : G, lineHeight: 1.1, marginTop: 4 }}>{m.value}</p>
            <p style={{ fontSize: 12, color: TM, marginTop: 4 }}>{m.sub}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: TM, marginBottom: 10 }}>RECENT ACTIVITY</p>
      <div style={{ marginBottom: 16 }}>
        {activity.map((a, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < activity.length - 1 ? `1px solid ${BD}` : "none" }}>
            <span style={{ fontSize: 13, color: N }}>{a.name}</span>
            <span style={{ fontSize: 12, color: a.color, fontWeight: 500 }}>{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Feedback inbox ──────────────────────────────────────────────────────
function RecoveryTab() {
  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: OW, borderRadius: 16, padding: 20, border: `1px solid ${BD}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: N, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600 }}>R</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: N }}>Ron S.</p>
            <Stars count={3} size={13} />
          </div>
          <span style={{ marginLeft: "auto", background: "rgba(245,158,11,0.1)", color: "#F59E0B", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 9999 }}>New</span>
        </div>
        <p style={{ fontSize: 13, color: TS, fontStyle: "italic", lineHeight: 1.5, marginBottom: 16 }}>&ldquo;Wait was a bit long.&rdquo;</p>
        <textarea
          readOnly
          value={"Hi Ron — thanks for letting us know. We're sorry about the wait and we're working on it. Hope to see you back soon."}
          style={{ width: "100%", fontFamily: "Inter, sans-serif", fontSize: 13, color: N, background: "#fff", border: `1px solid ${BD}`, borderRadius: 10, padding: "12px 14px", resize: "none", height: 80, outline: "none", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={{ background: G, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Send reply</button>
          <button style={{ background: "#fff", color: TS, border: `1px solid ${BD}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Mark resolved</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Analytics ───────────────────────────────────────────────────────────
function AnalyticsTab({ chartLoaded }: { chartLoaded: boolean }) {
  const bookingsRef = useRef<HTMLCanvasElement>(null);
  const reviewsRef  = useRef<HTMLCanvasElement>(null);
  const instances   = useRef<any[]>([]);

  useEffect(() => {
    if (!chartLoaded || typeof window === "undefined" || !window.Chart) return;
    instances.current.forEach((c) => { try { c.destroy(); } catch {} });
    instances.current = [];
    const Chart = window.Chart;
    const weeks = ["W1", "W2", "W3", "W4", "W5", "W6"];

    if (bookingsRef.current) {
      instances.current.push(new Chart(bookingsRef.current.getContext("2d"), {
        type: "bar",
        data: { labels: weeks, datasets: [{ label: "Bookings", data: [24, 28, 26, 31, 34, 38], backgroundColor: G, borderRadius: 6 }] },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { color: TM, font: { family: "Inter" } } },
            x: { grid: { display: false }, ticks: { color: TM, font: { family: "Inter" } } },
          },
        },
      }));
    }
    if (reviewsRef.current) {
      instances.current.push(new Chart(reviewsRef.current.getContext("2d"), {
        type: "bar",
        data: { labels: weeks, datasets: [{ label: "Reviews", data: [3, 5, 4, 6, 7, 8], backgroundColor: G, borderRadius: 6 }] },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { color: TM, font: { family: "Inter" } } },
            x: { grid: { display: false }, ticks: { color: TM, font: { family: "Inter" } } },
          },
        },
      }));
    }
    return () => { instances.current.forEach((c) => { try { c.destroy(); } catch {} }); };
  }, [chartLoaded]);

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: OW, borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: N, marginBottom: 12 }}>Bookings per week</p>
          <canvas ref={bookingsRef} height={160} />
        </div>
        <div style={{ background: OW, borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: N, marginBottom: 12 }}>Reviews per week</p>
          <canvas ref={reviewsRef} height={160} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Customer view ───────────────────────────────────────────────────────
function CustomerViewTab() {
  const customers = [
    { name: "Yoni K.",  last: "2 Apr 2026",  next: "Sat 18 Apr",  status: "Active",   statusColor: G,         statusBg: "rgba(0,200,150,0.1)" },
    { name: "Dana M.",  last: "1 Apr 2026",  next: "Fri 17 Apr",  status: "Active",   statusColor: G,         statusBg: "rgba(0,200,150,0.1)" },
    { name: "Ron S.",   last: "18 Mar 2026", next: "—",           status: "At risk",  statusColor: "#F59E0B", statusBg: "rgba(245,158,11,0.1)" },
    { name: "Maya K.",  last: "10 Feb 2026", next: "—",           status: "Lapsed",   statusColor: "#EF4444", statusBg: "rgba(239,68,68,0.1)" },
    { name: "Lior T.",  last: "4 Apr 2026",  next: "Wed 22 Apr",  status: "Active",   statusColor: G,         statusBg: "rgba(0,200,150,0.1)" },
  ];
  const colW = ["30%", "22%", "22%", "16%"];
  const headers = ["Name", "Last visit", "Next booking", "Status"];
  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ border: `1px solid ${BD}`, borderRadius: 12, overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: colW.join(" "), background: OW, borderBottom: `1px solid ${BD}` }}>
          {headers.map((h, i) => (
            <div key={i} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: TM }}>{h}</div>
          ))}
        </div>
        {/* Data rows */}
        {customers.map((c, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: colW.join(" "), borderBottom: i < customers.length - 1 ? `1px solid ${BD}` : "none", background: "#fff" }}>
            <div style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: N }}>{c.name}</div>
            <div style={{ padding: "12px 16px", fontSize: 13, color: TS }}>{c.last}</div>
            <div style={{ padding: "12px 16px", fontSize: 13, color: TS }}>{c.next}</div>
            <div style={{ padding: "12px 16px" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: c.statusColor, background: c.statusBg, padding: "3px 10px", borderRadius: 9999 }}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [gsapReady, setGsapReady] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const gsapInited = useRef(false);

  // Demo booking form state
  const [bookingForm, setBookingForm] = useState({ firstName: "", lastName: "", email: "", businessName: "", businessType: "", phone: "" });
  const [bookingErrors, setBookingErrors] = useState<Record<string, string>>({});
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  function scrollToBookDemo() {
    document.querySelector("#book-demo")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!bookingForm.firstName.trim())   errors.firstName    = "Required";
    if (!bookingForm.lastName.trim())    errors.lastName     = "Required";
    if (!bookingForm.email.trim())       errors.email        = "Required";
    if (!bookingForm.businessName.trim()) errors.businessName = "Required";
    if (!bookingForm.businessType)       errors.businessType = "Required";
    if (!bookingForm.phone.trim())       errors.phone        = "Required";
    if (Object.keys(errors).length > 0) { setBookingErrors(errors); return; }
    setBookingSubmitting(true);
    setBookingErrors({});
    try {
      await fetch("/api/demo-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm),
      });
      setBookingSuccess(true);
    } catch { /* silent */ }
    setBookingSubmitting(false);
  }

  // Capture ?ref= referral code to sessionStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) { sessionStorage.setItem("vomni_ref", ref); }
    } catch { /* ignore */ }
  }, []);

  // Scroll to hash on load (e.g. /#book-demo from contact page)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const t = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Nav scroll border
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Performance: detect slow connection and add reduce-motion class
  useEffect(() => {
    const conn = (navigator as any).connection;
    if (conn && (conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")) {
      document.documentElement.classList.add("reduce-motion");
    }
  }, []);

  // Sticky bottom CTA - mobile only
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth > 768) return;
    const cta = document.querySelector(".sticky-mobile-cta") as HTMLElement | null;
    if (!cta) return;
    // Check dismiss state
    try {
      if (sessionStorage.getItem("stickyCTADismissed")) { cta.classList.add("dismissed"); return; }
    } catch { /* ignore */ }
    // Show after hero scrolls out
    const hero = document.querySelector(".hero-section") as HTMLElement | null;
    if (!hero) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) cta.classList.add("visible");
        else cta.classList.remove("visible");
      });
    }, { threshold: 0.1 });
    obs.observe(hero);
    // Dismiss button
    const dismissBtn = cta.querySelector(".sticky-mobile-cta-dismiss");
    const handleDismiss = () => {
      cta.classList.add("dismissed");
      try { sessionStorage.setItem("stickyCTADismissed", "true"); } catch { /* ignore */ }
    };
    dismissBtn?.addEventListener("click", handleDismiss);
    // CTA button - scroll to book demo
    const ctaBtn = cta.querySelector(".sticky-mobile-cta-btn");
    const handleCta = () => document.querySelector("#book-demo")?.scrollIntoView({ behavior: "smooth" });
    ctaBtn?.addEventListener("click", handleCta);
    return () => {
      obs.disconnect();
      dismissBtn?.removeEventListener("click", handleDismiss);
      ctaBtn?.removeEventListener("click", handleCta);
    };
  }, []);

  // Carousel dots - initialise after DOM is ready
  useEffect(() => {
    function initCarousels() {
      const configs = [
        { track: ".steps-grid",          dots: "#dots-steps",          count: 3 },
        { track: ".testimonials-grid",   dots: "#dots-testimonials",   count: 3 },
        { track: ".demo-cards-container", dots: "#dots-demo",          count: 2 },
      ] as const;
      configs.forEach(({ track, dots, count }) => {
        const el = document.querySelector(track) as HTMLElement | null;
        const dotsEl = document.querySelector(dots) as HTMLElement | null;
        if (!el || !dotsEl) return;
        dotsEl.innerHTML = "";
        for (let i = 0; i < count; i++) {
          const dot = document.createElement("div");
          dot.className = `carousel-dot${i === 0 ? " active" : ""}`;
          const idx = i;
          dot.onclick = () => {
            const child = el.children[idx] as HTMLElement | undefined;
            if (child) el.scrollTo({ left: child.offsetLeft - 20, behavior: "smooth" });
          };
          dotsEl.appendChild(dot);
        }
        el.addEventListener("scroll", () => {
          const w = (el.firstElementChild as HTMLElement)?.offsetWidth ?? 1;
          const active = Math.round(el.scrollLeft / (w + 16));
          dotsEl.querySelectorAll(".carousel-dot").forEach((d, i) => d.classList.toggle("active", i === active));
        }, { passive: true });
      });
    }
    const t = setTimeout(initCarousels, 600);
    return () => clearTimeout(t);
  }, []);

  // GSAP init (fires once both GSAP + ScrollTrigger are loaded)
  useEffect(() => {
    if (!gsapReady || gsapInited.current) return;
    gsapInited.current = true;

    const gsap = window.gsap;
    const ST   = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    // ── Hero entrance ──────────────────────────────────────────────────────
    gsap.from(".hero-headline", { opacity: 0, y: 40, duration: 0.8, ease: "power3.out" });
    gsap.from(".hero-sub",      { opacity: 0, y: 30, duration: 0.8, delay: 0.2, ease: "power3.out" });
    gsap.from(".hero-buttons",  { opacity: 0, y: 20, duration: 0.6, delay: 0.4, ease: "power3.out" });
    gsap.from(".browser-frame", { opacity: 0, x: 60, duration: 1,   delay: 0.3, ease: "power3.out" });
    gsap.from(".notif-card",    { opacity: 0, y: 20, duration: 0.6, delay: 1.2, ease: "power3.out" });

    // ── Stat counters (scroll-triggered) ───────────────────────────────────
    document.querySelectorAll<HTMLElement>(".pain-stat-number[data-value]").forEach((el) => {
      const target = parseFloat(el.dataset.value ?? "0");
      const suffix = el.dataset.suffix ?? "";
      const isInt  = Number.isInteger(target);
      const obj    = { val: 0 };
      gsap.to(obj, {
        val: target, duration: 2, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate() {
          el.textContent = (isInt ? Math.round(obj.val) : obj.val.toFixed(1)) + suffix;
        },
      });
    });

    setTimeout(() => ST.refresh(), 200);
  }, [gsapReady]);

  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "recovery",  label: "Feedback inbox" },
    { id: "analytics", label: "Analytics" },
    { id: "customer",  label: "Customer view" },
  ];
  const tabUrls: Record<string, string> = {
    overview:  "app.vomni.app/dashboard",
    recovery:  "app.vomni.app/feedback",
    analytics: "app.vomni.app/analytics",
    customer:  "app.vomni.app/review/james",
  };

  return (
    <>
      {/* CDN scripts */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"
        strategy="afterInteractive"
        onLoad={() => setGsapReady(true)}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => setChartLoaded(true)}
      />

      {/* ── NAVIGATION ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100, height: 72,
        background: "#fff",
        borderBottom: scrolled ? `1px solid ${BD}` : "1px solid transparent",
        transition: "border-color 0.2s",
        display: "flex", alignItems: "center",
      }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: N }}>Vomni</span>
          <div className="nav-links" style={{ display: "flex", gap: 40, alignItems: "center" }}>
            {[
              { label: "How it Works", id: "how-it-works" },
              { label: "Pricing",      id: "pricing" },
            ].map((item) => (
              <a
                key={item.label}
                href={`#${item.id}`}
                onClick={(e) => { e.preventDefault(); document.querySelector(`#${item.id}`)?.scrollIntoView({ behavior: "smooth" }); }}
                style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 500, color: TS, textDecoration: "none", cursor: "pointer" }}
              >
                {item.label}
              </a>
            ))}
            <a href="/migrate" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 500, color: TS, textDecoration: "none", cursor: "pointer" }}>Switch to Vomni</a>
            <a href="/blog" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 500, color: TS, textDecoration: "none", cursor: "pointer" }}>Blog</a>
            <a href="/contact" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 500, color: TS, textDecoration: "none", cursor: "pointer" }}>Contact</a>
            <button
              onClick={scrollToBookDemo}
              style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: G, textDecoration: "none", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Book a Demo
            </button>
            <a href="/login" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 500, color: TS, textDecoration: "none", cursor: "pointer" }}>Login</a>
          </div>
          {/* Desktop Get Started */}
          <a href="/signup" className="nav-get-started"
            style={{ background: G, color: "#fff", borderRadius: 9999, padding: "12px 28px", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = GD)}
            onMouseLeave={e => (e.currentTarget.style.background = G)}
          >
            Get Started
          </a>
          {/* Mobile right side: Get Started + hamburger */}
          <div className="nav-mobile-right" style={{ display: "none", alignItems: "center", gap: 12 }}>
            <a href="/signup"
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

      {/* ── MOBILE MENU OVERLAY ─────────────────────────────────────────────── */}
      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        {/* Header */}
        <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: N }}>Vomni</span>
          <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }} aria-label="Close menu">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={N} strokeWidth={2} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {/* Nav links */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 8 }}>
          {[
            { label: "How it Works", action: () => { setMenuOpen(false); document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" }); } },
            { label: "Pricing",      action: () => { setMenuOpen(false); document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" }); } },
            { label: "Switch to Vomni", action: () => { setMenuOpen(false); window.location.href = "/migrate"; } },
            { label: "Blog",         action: () => { setMenuOpen(false); window.location.href = "/blog"; } },
            { label: "Contact",      action: () => { setMenuOpen(false); window.location.href = "/contact"; } },
            { label: "Book a Demo",  action: () => { setMenuOpen(false); scrollToBookDemo(); }, green: true },
            { label: "Login",        action: () => { setMenuOpen(false); window.location.href = "/login"; } },
          ].map((item) => (
            <button
              key={item.label}
              className="mobile-menu-link"
              onClick={item.action}
              style={{
                background: "none", border: "none", borderBottom: `1px solid ${BD}`,
                padding: "20px 0", textAlign: "left", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 600,
                color: item.green ? G : N,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mobile-menu-link" style={{ paddingBottom: 40, flexShrink: 0 }}>
          <a href="/signup" style={{ display: "block", background: G, color: "#fff", borderRadius: 9999, padding: "18px 0", fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
            Get Started
          </a>
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="hero-section" style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", paddingTop: 120, paddingBottom: 80 }}>
        <div className="hero-bg" />
        <div className="container hero-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "55% 45%", gap: 64, alignItems: "center", width: "100%", position: "relative", zIndex: 1 }}>

          {/* Left */}
          <div>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: G, marginBottom: 16 }}>Book · Protect · Grow</p>
            <h1 className="hero-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 80, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", color: N }}>
              More bookings.<br /><span style={{ color: G }}>Fewer surprises.</span>
            </h1>
            <p className="hero-sub" style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TS, lineHeight: 1.6, maxWidth: 460, marginTop: 24 }}>
              Put your business on autopilot. Vomni handles your bookings, follows up with every customer after their visit, and brings back regulars who've gone quiet — all via WhatsApp, without you lifting a finger.
            </p>
            <div className="hero-buttons" style={{ marginTop: 40, display: "flex", gap: 16, alignItems: "center" }}>
              <a href="/signup" className="cta-primary" style={{ background: G, color: "#fff", borderRadius: 9999, padding: "18px 36px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
                Start free — from £35/month
              </a>
              <button
                onClick={scrollToBookDemo}
                style={{ background: "transparent", border: `2px solid ${N}`, color: N, borderRadius: 9999, padding: "18px 36px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, textDecoration: "none", transition: "all 0.2s", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = N; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = N; }}
              >
                Book a Demo →
              </button>
            </div>
            <div className="hero-trust" style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Stars count={5} size={20} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS }}>Trusted by businesses that value every customer</span>
            </div>
            <div className="trust-pills" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {["✓ WhatsApp-first", "✓ Live in 5 minutes", "✓ Switch in an afternoon"].map((t) => (
                <span key={t} style={{ background: OW, borderRadius: 9999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: TS }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right - browser frame + notification card */}
          <div className="hero-visual" style={{ position: "relative" }}>
            <div className="browser-frame">
              <BrowserChrome url="app.vomni.app/dashboard" />
              <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20, color: N }}>Kings Cuts London</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Today's bookings", value: "6",   sub: "Saturday 4 Apr" },
                    { label: "Google reviews",   value: "7",   sub: "↑ 3 this month" },
                    { label: "Completion rate",  value: "66%", sub: "↑ vs 40% avg" },
                    { label: "Avg rating",       value: "4.8", sub: "Up 0.3 stars" },
                  ].map((m, i) => (
                    <div key={i} style={{ background: OW, borderRadius: 12, padding: "14px 16px" }}>
                      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: TM }}>{m.label}</p>
                      <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: G, lineHeight: 1.1, marginTop: 4 }}>{m.value}</p>
                      <p style={{ fontSize: 11, color: TM, marginTop: 3 }}>{m.sub}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: TM, marginTop: 16, marginBottom: 10 }}>RECENT ACTIVITY</p>
                {[
                  { name: "Yoni K.", status: "Confirmed booking",        color: G },
                  { name: "Dana M.", status: "Rebooked via WhatsApp",     color: G },
                  { name: "Lior T.", status: "Left a 5-star review",      color: G },
                  { name: "Ron S.",  status: "Reminder sent",             color: TM },
                ].map((a, i, arr) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < arr.length - 1 ? `1px solid ${BD}` : "none" }}>
                    <span style={{ fontSize: 12, color: N }}>{a.name}</span>
                    <span style={{ fontSize: 11, color: a.color, fontWeight: 500 }}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating notification card */}
            <div className="notif-card" style={{ position: "absolute", bottom: -20, right: -20, background: "#fff", borderRadius: 14, padding: "14px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 12, width: 260, zIndex: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Maya K. just rebooked</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: TM, marginTop: 2 }}>Last visit 11 weeks ago · via WhatsApp</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN SECTION ────────────────────────────────────────────────────── */}
      <section className="pain-section section-pad" style={{ background: N, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <div className="pain-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            {/* Left - headline + subtext */}
            <div>
              <h2 className="pain-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 72, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>
                Most unhappy customers never complain. They just don't come back.
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TM, lineHeight: 1.6, marginTop: 24 }}>
                1 in 3 customers who have a bad experience never say a word — they quietly stop booking. Vomni makes sure every customer can tell you directly, so you fix it before they're gone.
              </p>
              <button
                onClick={scrollToBookDemo}
                style={{ marginTop: 40, background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GD; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
              >
                See how Vomni works →
              </button>
            </div>
            {/* Right - stacked stat cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {([
                { num: "87%",      dv: 87, ds: "%", dp: "", isCounter: true,  color: G,         label: "of consumers read reviews before visiting a local business" },
                { num: "1 in 3",   isCounter: false,         color: "#FF4D4D", label: "customers won\u2019t return after one bad experience - even if they say nothing" },
                { num: "4.2\u2605", isCounter: false,        color: "#F5A623", label: "is the minimum rating that keeps you competitive. Below it, you\u2019re invisible." },
              ] as { num: string; dv?: number; ds?: string; dp?: string; isCounter: boolean; color: string; label: string }[]).map((s, i) => (
                <div key={i} className="pain-stat" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24 }}>
                  {s.isCounter ? (
                    <p
                      className="pain-stat-number"
                      data-value={String(s.dv)}
                      data-suffix={s.ds}
                      data-prefix={s.dp}
                      style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 52, fontWeight: 900, color: s.color, lineHeight: 1, textShadow: `0 0 40px ${s.color}55`, margin: 0, minWidth: 110, flexShrink: 0 }}
                    >{s.num}</p>
                  ) : (
                    <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 52, fontWeight: 900, color: s.color, lineHeight: 1, margin: 0, minWidth: 110, flexShrink: 0 }}>{s.num}</p>
                  )}
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ────────────────────────────────────────────────── */}
      <section className="section-pad" style={{ background: OW, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: N, textAlign: "center" }}>
            Everything you need.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TS, textAlign: "center", marginTop: 16 }}>
            See the product. All of it.
          </p>

          {/* Tabs - sticky while browser frame is in view */}
          <div className="product-tabs tabs-row" style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 48, flexWrap: "wrap", position: "sticky", top: 80, zIndex: 50, background: OW, padding: "16px 0" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                className="tab-button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 500,
                  padding: "12px 28px", borderRadius: 9999,
                  border: `1.5px solid ${activeTab === t.id ? N : BD}`,
                  background: activeTab === t.id ? N : "#fff",
                  color: activeTab === t.id ? "#fff" : TS,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Browser frame */}
          <div className="browser-frame-large" style={{ maxWidth: 1000, margin: "48px auto 0", background: "#fff", borderRadius: 20, boxShadow: "0 40px 100px rgba(0,0,0,0.12)", overflow: "hidden" }}>
            <BrowserChrome url={tabUrls[activeTab]} />
            <div style={{ minHeight: 500 }}>
              {activeTab === "overview"  && <OverviewTab />}
              {activeTab === "recovery"  && <RecoveryTab />}
              {activeTab === "analytics" && <AnalyticsTab chartLoaded={chartLoaded} />}
              {activeTab === "customer"  && <CustomerViewTab />}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="steps-section section-pad" style={{ background: "#fff", padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: N, textAlign: "center" }}>
            Three steps. Then it runs itself.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TS, textAlign: "center", marginTop: 16 }}>
            Setup takes 5 minutes or less.
          </p>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, marginTop: 80, alignItems: "stretch" }}>
            {[
              {
                num: "01",
                title: "Set up your booking page once. That\u2019s it.",
                body: "Add your services, set your hours, share your link. Clients book themselves in from their phone. You never need to touch it again.",
                icon: (
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                ),
              },
              {
                num: "02",
                title: "After every visit, every customer hears from you.",
                body: "After every appointment, every customer gets a personal WhatsApp at exactly the right time. It reads like it came from you — because it does.",
                icon: (
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Set it up once. It runs forever.",
                body: "Every customer gets a personal follow-up after their visit. You see every response in your dashboard. Vomni handles the rest.",
                icon: (
                  <svg width={32} height={32} viewBox="0 0 24 24" fill={G}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity=".8"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".9"/>
                  </svg>
                ),
              },
            ].map((s, i) => (
              <div
                key={i}
                className="step-card"
                style={{ padding: 48, background: "#fff", borderRadius: 24, boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08), 0 40px 80px rgba(0,0,0,0.06)", transition: "all 0.3s ease", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 12px rgba(0,0,0,0.06), 0 24px 60px rgba(0,0,0,0.12), 0 60px 100px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-6px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08), 0 40px 80px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = ""; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 9999, background: G, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#fff", fontSize: 18, flexShrink: 0, boxShadow: "0 0 0 8px rgba(0,200,150,0.1), 0 0 0 16px rgba(0,200,150,0.05)" }}>
                    {s.num}
                  </div>
                  {s.icon}
                </div>
                <h3 className="step-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, lineHeight: 1.2 }}>{s.title}</h3>
                <p className="step-body" style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: TS, marginTop: 12, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
          {/* Carousel dots - visible on mobile only */}
          <div className="carousel-dots" id="dots-steps" />
          {/* SMS conversation mockup */}
          <div className="sms-mockup" style={{ background: "#fff", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.10)", maxWidth: 600, margin: "80px auto 0", padding: 32 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ background: OW, borderRadius: 9999, padding: "6px 16px", fontFamily: "Inter, sans-serif", fontSize: 13, color: TM, fontWeight: 500 }}>SMS · Kings Cuts London</span>
            </div>
            {/* Message from Kings Cuts */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <div style={{ background: "#fff", border: `1.5px solid ${G}`, borderRadius: "18px 18px 4px 18px", padding: "14px 18px", maxWidth: "80%", fontFamily: "Inter, sans-serif", fontSize: 15, color: N, lineHeight: 1.5 }}>
                Hey Yoni — it's been 5 weeks since your last fade at Nova Cuts. Your chair's free Thursday at 3pm. Want it?
              </div>
            </div>
            {/* Star rating response */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "20px 0" }}>
              {Array.from({ length: 5 }).map((_, i) => <StarSVG key={i} size={28} />)}
            </div>
            {/* Notification */}
            <div style={{ background: OW, borderRadius: 12, borderLeft: `3px solid ${G}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, fontWeight: 500 }}>Yoni K. just rebooked — via WhatsApp · just now</span>
            </div>
          </div>
          <div style={{ marginTop: 60, textAlign: "center" }}>
            <button
              onClick={scrollToBookDemo}
              style={{ background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GD; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
            >
              Book a Demo to See It Live →
            </button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="testimonials-section section-pad" style={{ background: OW, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: N, textAlign: "center" }}>
            Built for businesses where every customer counts.
          </h2>
          <div className="testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 80 }}>
            {[
              { quote: "Three customers who hadn't booked since February rebooked last week. Vomni messaged them. I did nothing.", name: "Priya K.", biz: "Glamour Hair",       avatar: "https://i.pravatar.cc/80?img=47" },
              { quote: "Eight minutes to set up. My Google rating climbed on its own. Haven't touched it since.",                 name: "Tom B.",   biz: "The Oak Tree",       avatar: "https://i.pravatar.cc/80?img=33" },
              { quote: "Moved over from our old system in an afternoon. No commission, no drama. Should have done it months ago.", name: "James R.", biz: "The Fade Room",      avatar: "https://i.pravatar.cc/80?img=15" },
            ].map((t, i) => (
              <div
                key={i}
                className="testimonial-card"
                style={{ background: "#fff", borderRadius: 24, padding: 44, boxShadow: "0 2px 24px rgba(0,0,0,0.06)", transition: "transform 0.25s, box-shadow 0.25s", cursor: "default", display: "flex", flexDirection: "column" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.10)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 24px rgba(0,0,0,0.06)"; }}
              >
                <Stars count={5} size={20} />
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, color: N, fontStyle: "italic", lineHeight: 1.5, marginTop: 24 }}>
                  {t.quote}
                </p>
                <hr style={{ border: "none", borderTop: `1px solid ${BD}`, marginTop: "auto", marginBottom: 28 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.avatar} alt={t.name} width={40} height={40} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: N }}>{t.name}</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS, marginTop: 2 }}>{t.biz}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Carousel dots - visible on mobile only */}
          <div className="carousel-dots" id="dots-testimonials" />
        </div>
      </section>

      {/* ── TESTIMONIALS POST-CTA ───────────────────────────────────────────── */}
      <div style={{ background: OW, paddingBottom: 80, textAlign: "center" }}>
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>
          Want results like these?
        </p>
        <button
          onClick={scrollToBookDemo}
          style={{ marginTop: 20, background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GD; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
        >
          Book a Free Demo →
        </button>
      </div>

      {/* ── TRY IT LIVE ─────────────────────────────────────────────────────── */}
      {/* HIDDEN — set to {false &&} to restore */}
      {false && <section id="demo" style={{ background: OW, padding: "100px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: G, textTransform: "uppercase", textAlign: "center" }}>
            TRY IT LIVE
          </p>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 48, fontWeight: 800, color: N, textAlign: "center", marginTop: 12, lineHeight: 1.1 }}>
            Explore a real Vomni dashboard.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
            No sign up needed. Click in and see exactly what your customers would see.
          </p>
          <div className="demo-cards-container" style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 56, flexWrap: "wrap" }}>
            {/* Card 1 - Kings Cuts London */}
            <div
              className="demo-card"
              style={{ background: "#fff", borderRadius: 20, padding: 36, boxShadow: "0 4px 8px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.08)", maxWidth: 400, flex: 1, transition: "all 0.25s ease", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06), 0 24px 60px rgba(0,0,0,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.08)"; }}
            >
              <div style={{ background: "rgba(0,200,150,0.1)", borderRadius: 12, padding: 12, display: "inline-flex" }}>
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, marginTop: 16 }}>Kings Cuts London</h3>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS, marginTop: 8, lineHeight: 1.5 }}>A thriving barbershop in Shoreditch. Growing fast with strong reviews.</p>
              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                {["4.3★ rating", "66% completion", "More 5-star reviews"].map((s) => (
                  <span key={s} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM }}>{s}</span>
                ))}
              </div>
              <a
                href="/demo/kings-cuts"
                style={{ display: "block", marginTop: 24, background: N, color: "#fff", borderRadius: 9999, padding: "14px 0", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", transition: "background 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1a2035"; }}
                onMouseLeave={e => { e.currentTarget.style.background = N; }}
              >
                Explore This Dashboard →
              </a>
            </div>
            {/* Card 2 - Bella Vista Restaurant */}
            <div
              className="demo-card"
              style={{ background: "#fff", borderRadius: 20, padding: 36, boxShadow: "0 4px 8px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.08)", maxWidth: 400, flex: 1, transition: "all 0.25s ease", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06), 0 24px 60px rgba(0,0,0,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.08)"; }}
            >
              <div style={{ background: "rgba(245,158,11,0.1)", borderRadius: 12, padding: 12, display: "inline-flex" }}>
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l19-9-9 19-2-8-8-2z" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, marginTop: 16 }}>Bella Vista Restaurant</h3>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS, marginTop: 8, lineHeight: 1.5 }}>A London restaurant building its online reputation.</p>
              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM }}>3.7★ rating</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM }}>29% completion</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#F59E0B", fontWeight: 500 }}>Needs improvement</span>
              </div>
              <a
                href="/demo/bella-vista"
                style={{ display: "block", marginTop: 24, background: N, color: "#fff", borderRadius: 9999, padding: "14px 0", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", transition: "background 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1a2035"; }}
                onMouseLeave={e => { e.currentTarget.style.background = N; }}
              >
                Explore This Dashboard →
              </a>
            </div>
          </div>
          {/* Carousel dots - visible on mobile only */}
          <div className="carousel-dots" id="dots-demo" />
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textAlign: "center", marginTop: 32 }}>
            These are live demo accounts with real product functionality.
          </p>
        </div>
      </section>}

      {/* ── BOOK A DEMO ─────────────────────────────────────────────────────── */}
      <section id="book-demo" style={{ background: N, padding: "120px 0" }}>
        <div className="book-demo-layout container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

          {/* Left - copy */}
          <div>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: G, textTransform: "uppercase" }}>BOOK A DEMO</p>
            <h2 className="book-demo-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginTop: 16 }}>
              See exactly how Vomni works for your business.
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginTop: 16 }}>
              Meet one of our platform experts who will walk you through the product, show you what your dashboard would look like, and answer every question you have. No pressure. 30 minutes.
            </p>
            <div className="demo-bullets" style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                "Live walkthrough tailored to your business type",
                "See real results from businesses like yours",
                "Get set up the same day if you decide to go ahead",
              ].map((point) => (
                <div key={point} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <svg width={18} height={18} viewBox="0 0 20 20" fill={G} style={{ flexShrink: 0, marginTop: 2 }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#fff", lineHeight: 1.5 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - booking form card */}
          <div className="book-demo-card" style={{ background: "#fff", borderRadius: 20, padding: 40, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            {bookingSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                  <svg width={32} height={32} viewBox="0 0 20 20" fill={G}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, marginTop: 20 }}>
                  {"You're booked in 🎉"}
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: TS, marginTop: 12, lineHeight: 1.6 }}>
                  One of our platform experts will be in touch within a few hours to confirm your time. Check your email for confirmation.
                </p>
                <span style={{ display: "inline-block", marginTop: 20, background: "rgba(0,200,150,0.1)", color: G, borderRadius: 9999, padding: "8px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>
                  {"We'll see you soon"}
                </span>
              </div>
            ) : (
              <form onSubmit={submitBooking}>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>Book your free demo</h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS, marginTop: 6, marginBottom: 28 }}>Pick a time that works for you</p>
                <div className="name-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* First + Last name */}
                  {[
                    { label: "First name", key: "firstName", placeholder: "James" },
                    { label: "Last name",  key: "lastName",  placeholder: "Mitchell" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, display: "block", marginBottom: 6 }}>{label}</label>
                      <input
                        value={bookingForm[key as keyof typeof bookingForm]}
                        onChange={e => setBookingForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ width: "100%", border: `1px solid ${bookingErrors[key] ? "#EF4444" : BD}`, borderRadius: 10, padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
                        onFocus={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = bookingErrors[key] ? "#EF4444" : BD; e.currentTarget.style.boxShadow = "none"; }}
                      />
                      {bookingErrors[key] && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{bookingErrors[key]}</p>}
                    </div>
                  ))}
                </div>
                {/* Full-width fields */}
                {[
                  { label: "Email address", key: "email", placeholder: "james@kingscutslondon.co.uk", type: "email" },
                  { label: "Business name", key: "businessName", placeholder: "Kings Cuts London" },
                  { label: "Phone number", key: "phone", placeholder: "+44 7700 900000", type: "tel" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key} style={{ marginTop: 16 }}>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, display: "block", marginBottom: 6 }}>{label}</label>
                    <input
                      type={type ?? "text"}
                      value={bookingForm[key as keyof typeof bookingForm]}
                      onChange={e => setBookingForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: "100%", border: `1px solid ${bookingErrors[key] ? "#EF4444" : BD}`, borderRadius: 10, padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
                      onFocus={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = bookingErrors[key] ? "#EF4444" : BD; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    {bookingErrors[key] && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{bookingErrors[key]}</p>}
                  </div>
                ))}
                {/* Business type dropdown */}
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, display: "block", marginBottom: 6 }}>Business type</label>
                  <select
                    value={bookingForm.businessType}
                    onChange={e => setBookingForm(f => ({ ...f, businessType: e.target.value }))}
                    style={{ width: "100%", border: `1px solid ${bookingErrors.businessType ? "#EF4444" : BD}`, borderRadius: 10, padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", color: bookingForm.businessType ? N : TM, appearance: "none", background: "#fff", transition: "border-color 0.2s, box-shadow 0.2s" }}
                    onFocus={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = bookingErrors.businessType ? "#EF4444" : BD; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">Select your business type</option>
                    {["Barbershop", "Hair Salon", "Beauty Salon", "Restaurant", "Dentist", "Tattoo Studio", "Nail Salon", "Other"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {bookingErrors.businessType && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{bookingErrors.businessType}</p>}
                </div>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  style={{ width: "100%", marginTop: 28, background: G, color: "#fff", borderRadius: 9999, padding: 16, fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, border: "none", cursor: bookingSubmitting ? "not-allowed" : "pointer", opacity: bookingSubmitting ? 0.7 : 1, transition: "background 0.2s" }}
                  onMouseEnter={e => { if (!bookingSubmitting) (e.currentTarget as HTMLElement).style.background = GD; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
                >
                  {bookingSubmitting ? "Submitting..." : "Book My Free Demo →"}
                </button>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM, textAlign: "center", marginTop: 12 }}>
                  Free 30-minute call · No commitment · Instant confirmation
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      {/* ── PRICING ── */}
      <section id="pricing" className="section-pad" style={{ background: N, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: "#fff", textAlign: "center" }}>
            Simple, honest pricing.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 16 }}>
            No setup fees. No long contracts. Cancel whenever.
          </p>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 24, marginTop: 80, flexWrap: "wrap" }}>

            {/* STARTER */}
            <div className="pricing-card" style={{ background: "#fff", borderRadius: 24, padding: 40, flex: "1 1 280px", maxWidth: 340, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#9CA3AF", margin: "0 0 12px" }}>STARTER</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 60, fontWeight: 900, color: "#0A0F1E", lineHeight: 1 }}>£35</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#6B7280" }}>/month</span>
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: G, fontWeight: 600, margin: "6px 0 0" }}>or £299/year - save £121</p>
              <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {["Booking page, live in 5 minutes", "Automated WhatsApp review requests after every visit", "Basic dashboard", "Email support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#E5E7EB"/><path d="M5 8l2 2 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280" }}>{f}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 16 }}>Perfect for: new or small businesses</p>
              <a href="/signup" style={{ display: "block", marginTop: 24, background: "#F3F4F6", color: "#0A0F1E", borderRadius: 9999, padding: "16px 0", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
                Get Started
              </a>
            </div>

            {/* GROWTH - MOST POPULAR */}
            <div className="pricing-card" style={{ background: "#fff", borderRadius: 24, padding: 40, flex: "1 1 280px", maxWidth: 340, border: "2.5px solid #00C896", position: "relative", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: G, color: "#fff", borderRadius: 9999, padding: "6px 20px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                MOST POPULAR
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: G, margin: "0 0 12px" }}>GROWTH</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 60, fontWeight: 900, color: "#0A0F1E", lineHeight: 1 }}>£79</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#6B7280" }}>/month</span>
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: G, fontWeight: 600, margin: "6px 0 0" }}>or £699/year - save £249</p>
              <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {["Everything in Starter", "Automated follow-ups after every visit", "Lapsed customer re-engagement via WhatsApp", "Full analytics + weekly email reports", "Priority support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(0,200,150,0.15)"/><path d="M5 8l2 2 4-4" stroke="#00C896" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151" }}>{f}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 16 }}>Perfect for: established businesses serious about reputation</p>
              <a href="/signup" style={{ display: "block", marginTop: 24, background: G, color: "#fff", borderRadius: 9999, padding: "16px 0", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
                Get Started - Most Popular
              </a>
            </div>

            {/* PRO */}
            <div className="pricing-card" style={{ background: "#0A0F1E", borderRadius: 24, padding: 40, flex: "1 1 280px", maxWidth: 340, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#F5A623", margin: "0 0 12px" }}>PRO</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 60, fontWeight: 900, color: "#fff", lineHeight: 1 }}>£149</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>/month</span>
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#F5A623", fontWeight: 600, margin: "6px 0 0" }}>or £1,499/year - save £289</p>
              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {["Everything in Growth", "Dedicated WhatsApp number", "Same-day support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(245,166,35,0.2)"/><path d="M5 8l2 2 4-4" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>Perfect for: high-volume businesses</p>
              <a href="/signup" style={{ display: "block", marginTop: 24, background: "#F5A623", color: "#0A0F1E", borderRadius: 9999, padding: "16px 0", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
                Get Started - Pro
              </a>
            </div>

          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 }}>
            Not seeing more reviews in your first 14 days? Full refund. No forms. No questions.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section className="section-pad" style={{ background: "#fff", padding: "120px 0", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline final-cta-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 80, fontWeight: 800, color: N, lineHeight: 1.0, letterSpacing: "-0.03em" }}>
            Every day you wait, your competition pulls further ahead.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TS, marginTop: 24 }}>

          </p>
          <a
            href="/signup"
            className="final-cta-button"
            style={{ display: "inline-block", marginTop: 48, background: G, color: "#fff", borderRadius: 9999, padding: "22px 56px", fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, textDecoration: "none", boxShadow: "0 0 40px rgba(0,200,150,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(0,200,150,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 40px rgba(0,200,150,0.3)"; }}
          >
            Start Today - from £35/month →
          </a>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, marginTop: 16 }}>14-day money back guarantee</p>

        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: N, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "48px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", textAlign: "center" }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", display: "block", marginBottom: 24 }}>Vomni</span>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", marginBottom: 8 }}>
            <a href="/#pricing" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Pricing</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/contact" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Contact</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/privacy" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Privacy Policy</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/terms" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Terms of Service</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/dpa" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>DPA</a>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", marginBottom: 20 }}>
            <a href="/acceptable-use" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Acceptable Use</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/cookies" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Cookies</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/refunds" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Refunds</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/complaints" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>Complaints</a>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM, margin: 0 }}>Vomni - hello@vomni.io</p>
        </div>
      </footer>

      {/* ── STICKY BOTTOM CTA - mobile only, shown by CSS + JS ──────────────── */}
      <div className="sticky-mobile-cta" aria-hidden="true">
        <div className="sticky-mobile-cta-inner">
          <button className="sticky-mobile-cta-btn" type="button">Book a Free Demo →</button>
          <button className="sticky-mobile-cta-dismiss" type="button" aria-label="Dismiss">×</button>
        </div>
      </div>
    </>
  );
}
