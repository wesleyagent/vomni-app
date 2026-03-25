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
    { label: "Requests Sent",   value: "47",     sub: "This month" },
    { label: "Completion Rate", value: "66%",    sub: "↑ vs 40% avg" },
    { label: "Avg Rating",      value: "4.3 ★",  sub: "Up 0.4 stars" },
    { label: "Google Reviews",  value: "28",     sub: "Redirected" },
    { label: "Negative Caught", value: "3",      sub: "Saved privately", warn: true },
    { label: "Review Velocity", value: "8.2/wk", sub: "Growing" },
  ];
  const activity = [
    { name: "James Mitchell", status: "Redirected to Google", color: G },
    { name: "Tyler Brooks",   status: "Private Feedback",      color: "#F59E0B" },
    { name: "Omar Abdullah",  status: "Redirected to Google", color: G },
    { name: "Aiden Clarke",   status: "Sent",                  color: TM },
    { name: "Marcus Lee",     status: "Opened",                color: "#8B5CF6" },
    { name: "Priya Patel",    status: "Redirected to Google", color: G },
    { name: "Liam Foster",    status: "Private Feedback",      color: "#F59E0B" },
    { name: "Ethan Walsh",    status: "Redirected to Google", color: G },
  ];
  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20, color: N }}>Kings Cuts London</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
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
      <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px 18px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#B45309" }}>⚠ Alert - Isaac Thompson left a 2★ review</p>
        <p style={{ fontSize: 12, color: "#92400E", marginTop: 4 }}>"The wait time was too long and nobody apologised..." · 2 hours ago</p>
      </div>
    </div>
  );
}

// ─── Tab: Recovery ────────────────────────────────────────────────────────────
function RecoveryTab() {
  const cards = [
    {
      name: "Tyler Brooks", rating: 2, badge: "new", resolved: false,
      text: "The fade was uneven on the left side and the neckline wasn't clean. Expected better for the price.",
      aiReply: "Hi Tyler, I'm really sorry to hear your visit didn't meet the standard you expect from us. An uneven fade is completely unacceptable and I apologise. I'd love to have you back and make this right - your next visit is completely on us. Please reply here or call us directly.",
    },
    {
      name: "Aiden Clarke", rating: 3, badge: "resolved", resolved: true,
      text: "Service was fine but the shop was busier than expected. Had to wait 25 minutes past my appointment time.",
      aiReply: "",
    },
    {
      name: "Isaac Thompson", rating: 2, badge: "new", resolved: false,
      text: "The wait time was too long and nobody apologised for the delay. Won't be coming back.",
      aiReply: "",
    },
  ];
  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", gap: 16 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: OW, borderRadius: 16, padding: 20, border: `1px solid ${BD}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: N, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600 }}>{c.name[0]}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: N }}>{c.name}</p>
                <Stars count={c.rating} size={13} />
              </div>
            </div>
            <span style={{
              background: c.badge === "resolved" ? "rgba(0,200,150,0.1)" : "rgba(245,158,11,0.1)",
              color: c.badge === "resolved" ? G : "#F59E0B",
              fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 9999, textTransform: "capitalize",
            }}>{c.badge}</span>
          </div>
          <p style={{ fontSize: 13, color: TS, fontStyle: "italic", lineHeight: 1.5 }}>"{c.text}"</p>
          {c.aiReply && (
            <div style={{ marginTop: 14, background: "rgba(0,200,150,0.06)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: G, marginBottom: 8 }}>AI Suggested Reply</p>
              <p style={{ fontSize: 13, color: N, lineHeight: 1.6 }}>{c.aiReply}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button style={{ background: G, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Mark In Progress</button>
                <button style={{ background: "#fff", color: TS, border: `1px solid ${BD}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Mark Resolved</button>
              </div>
            </div>
          )}
          {!c.aiReply && !c.resolved && (
            <button style={{ marginTop: 12, background: G, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Generate Reply
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Analytics ───────────────────────────────────────────────────────────
function AnalyticsTab({ chartLoaded }: { chartLoaded: boolean }) {
  const ratingRef    = useRef<HTMLCanvasElement>(null);
  const requestRef   = useRef<HTMLCanvasElement>(null);
  const completionRef = useRef<HTMLCanvasElement>(null);
  const reviewsRef   = useRef<HTMLCanvasElement>(null);
  const instances    = useRef<any[]>([]);

  useEffect(() => {
    if (!chartLoaded || typeof window === "undefined" || !window.Chart) return;

    // Destroy previous instances
    instances.current.forEach((c) => { try { c.destroy(); } catch {} });
    instances.current = [];

    const Chart = window.Chart;
    const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

    if (ratingRef.current) {
      instances.current.push(new Chart(ratingRef.current.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: ["5★", "4★", "3★", "2★"],
          datasets: [{ data: [18, 6, 3, 4], backgroundColor: [G, "#34D399", "#F59E0B", "#EF4444"], borderWidth: 0 }],
        },
        options: {
          responsive: true, cutout: "65%",
          plugins: { legend: { position: "right", labels: { font: { family: "Inter", size: 11 }, color: N, padding: 12 } } },
        },
      }));
    }
    if (requestRef.current) {
      instances.current.push(new Chart(requestRef.current.getContext("2d"), {
        type: "bar",
        data: { labels: months, datasets: [{ label: "Sent", data: [28, 32, 30, 35, 43, 47], backgroundColor: G, borderRadius: 6 }] },
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
    if (completionRef.current) {
      instances.current.push(new Chart(completionRef.current.getContext("2d"), {
        type: "line",
        data: {
          labels: months,
          datasets: [{ label: "Completion %", data: [50, 55, 52, 58, 62, 66], borderColor: G, backgroundColor: "rgba(0,200,150,0.08)", fill: true, tension: 0.4, pointBackgroundColor: G, borderWidth: 2 }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 40, max: 80, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { color: TM, font: { family: "Inter" } } },
            x: { grid: { display: false }, ticks: { color: TM, font: { family: "Inter" } } },
          },
        },
      }));
    }
    if (reviewsRef.current) {
      instances.current.push(new Chart(reviewsRef.current.getContext("2d"), {
        type: "line",
        data: {
          labels: months,
          datasets: [{ label: "Reviews", data: [11, 14, 17, 20, 24, 28], borderColor: G, backgroundColor: "rgba(0,200,150,0.08)", fill: true, tension: 0.4, pointBackgroundColor: G, borderWidth: 2 }],
        },
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
      <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {[
          { label: "Rating Distribution", ref: ratingRef },
          { label: "Requests Sent",       ref: requestRef },
          { label: "Completion Rate %",   ref: completionRef },
          { label: "Google Reviews",      ref: reviewsRef },
        ].map((item, i) => (
          <div key={i} style={{ background: OW, borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: N, marginBottom: 12 }}>{item.label}</p>
            <canvas ref={item.ref} height={160} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "rgba(0,200,150,0.06)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: G }}>Completion Rate Above Average</p>
          <p style={{ fontSize: 12, color: TS, marginTop: 6, lineHeight: 1.5 }}>Your 66% completion rate is 26pp above the 40% industry average - excellent performance.</p>
        </div>
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>3 Negative Reviews Caught</p>
          <p style={{ fontSize: 12, color: TS, marginTop: 6, lineHeight: 1.5 }}>3 complaints were resolved privately this month - protecting your public Google rating.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Customer view ───────────────────────────────────────────────────────
function CustomerViewTab() {
  return (
    <div style={{ padding: 40, display: "flex", justifyContent: "center", background: OW, minHeight: 500 }}>
      <IPhone />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled,  setScrolled]  = useState(false);
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

  // Nav scroll border
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // GSAP init (fires once both GSAP + ScrollTrigger are loaded)
  useEffect(() => {
    if (!gsapReady || gsapInited.current) return;
    gsapInited.current = true;

    const gsap = window.gsap;
    const ST   = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    // Hero
    gsap.from(".hero-headline", { opacity: 0, y: 40, duration: 0.8, ease: "power3.out" });
    gsap.from(".hero-sub",      { opacity: 0, y: 30, duration: 0.8, delay: 0.2, ease: "power3.out" });
    gsap.from(".hero-buttons",  { opacity: 0, y: 20, duration: 0.6, delay: 0.4, ease: "power3.out" });
    gsap.from(".browser-frame", { opacity: 0, x: 60, duration: 1,   delay: 0.3, ease: "power3.out" });
    gsap.from(".notif-card",    { opacity: 0, y: 20, duration: 0.6, delay: 1.2, ease: "power3.out" });

    // Pain stats
    gsap.fromTo(".pain-stat",
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: ".pain-section", start: "top 85%", once: true } }
    );

    // Steps — fromTo so opacity never stays at 0
    gsap.fromTo(".step-card",
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.2, ease: "power3.out",
        scrollTrigger: { trigger: ".steps-section", start: "top 85%", once: true } }
    );

    // iPhone
    gsap.fromTo(".iphone-anim",
      { opacity: 0, y: 60, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8,
        scrollTrigger: { trigger: ".iphone-anim", start: "top 90%", once: true } }
    );

    // SMS mockup
    gsap.fromTo(".sms-mockup",
      { opacity: 0, y: 40, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8,
        scrollTrigger: { trigger: ".sms-mockup", start: "top 90%", once: true } }
    );

    // Testimonials
    gsap.fromTo(".testimonial-card",
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.15,
        scrollTrigger: { trigger: ".testimonials-section", start: "top 85%", once: true } }
    );

    // Refresh after a tick to catch elements already in viewport
    setTimeout(() => ST.refresh(), 200);
  }, [gsapReady]);

  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "recovery",  label: "Recovery inbox" },
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
              { label: "See Demo",     id: "demo" },
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
            <button
              onClick={scrollToBookDemo}
              style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: G, textDecoration: "none", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Book a Demo
            </button>
            <a href="/signup" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 500, color: TS, textDecoration: "none", cursor: "pointer" }}>Login</a>
          </div>
          <a href="/signup"
            style={{ background: G, color: "#fff", borderRadius: 9999, padding: "12px 28px", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = GD)}
            onMouseLeave={e => (e.currentTarget.style.background = G)}
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", paddingTop: 120, paddingBottom: 80 }}>
        <div className="hero-bg" />
        <div className="container hero-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "55% 45%", gap: 64, alignItems: "center", width: "100%", position: "relative", zIndex: 1 }}>

          {/* Left */}
          <div>
            <h1 className="hero-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 80, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", color: N }}>
              More 5-star<br /><span style={{ color: G }}>reviews.</span><br />Fewer surprises.
            </h1>
            <p className="hero-sub" style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TS, lineHeight: 1.6, maxWidth: 460, marginTop: 24 }}>
              Vomni automatically sends review requests after every appointment and catches unhappy customers privately - before they reach Google.
            </p>
            <div className="hero-buttons" style={{ marginTop: 40, display: "flex", gap: 16, alignItems: "center" }}>
              <a href="/signup" className="cta-primary" style={{ background: G, color: "#fff", borderRadius: 9999, padding: "18px 36px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
                Start Getting Reviews - from £50/month
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
            <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 8 }}>
              <Stars count={5} size={20} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS }}>Trusted by thousands of businesses whose reputation is everything</span>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {["✓ 98% SMS open rate", "✓ 5 min setup", "✓ 14-day money back"].map((t) => (
                <span key={t} style={{ background: OW, borderRadius: 9999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: TS }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — browser frame + notification card */}
          <div style={{ position: "relative" }}>
            <div className="browser-frame">
              <BrowserChrome url="app.vomni.app/dashboard" />
              <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20, color: N }}>Kings Cuts London</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Requests Sent",   value: "47",    sub: "This month" },
                    { label: "Completion Rate", value: "66%",   sub: "↑ vs 40% avg" },
                    { label: "Avg Rating",      value: "4.3 ★", sub: "Up 0.4 stars" },
                    { label: "Google Reviews",  value: "28",    sub: "Redirected" },
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
                  { name: "James Mitchell", status: "Redirected to Google", color: G },
                  { name: "Tyler Brooks",   status: "Private feedback",      color: "#F59E0B" },
                  { name: "Omar Abdullah",  status: "Redirected to Google", color: G },
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
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>New 5-star review on Google</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: TM, marginTop: 2 }}>Omar Abdullah · just now</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN SECTION ────────────────────────────────────────────────────── */}
      <section className="pain-section section-pad" style={{ background: N, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="pain-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: "#fff", textAlign: "center", maxWidth: 800, margin: "0 auto", lineHeight: 1.1 }}>
            Your Google rating is working against you.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TM, textAlign: "center", marginTop: 16 }}>
            The data might surprise you.
          </p>
          <div className="pain-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 80 }}>
            {[
              { num: "96%",  label: "of customers read Google reviews before walking through your door" },
              { num: "1",    label: "bad review sends 30 potential customers straight to your competitor" },
              { num: null,   label: "or less loses you 70% of search clicks before anyone finds your business", mixed: true },
              { num: "£12k", label: "lost in lifetime customer value from just one complaint that goes public online" },
            ].map((s, i, arr) => (
              <div key={i} className="pain-stat" style={{ padding: "60px 40px", position: "relative", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none", textAlign: "center" }}>
                <div style={{ minHeight: 96, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
                  {s.mixed ? (
                    <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 900, color: G, lineHeight: 1, textShadow: "0 0 80px rgba(0,200,150,0.4), 0 0 160px rgba(0,200,150,0.2)", margin: 0 }}>
                      <span style={{ fontSize: 96 }}>3.9</span><span style={{ fontSize: 60 }}>★</span>
                    </p>
                  ) : (
                    <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 96, fontWeight: 900, color: G, lineHeight: 1, textShadow: "0 0 80px rgba(0,200,150,0.4), 0 0 160px rgba(0,200,150,0.2)", margin: 0 }}>{s.num}</p>
                  )}
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "rgba(255,255,255,0.6)", marginTop: 16, lineHeight: 1.5, maxWidth: 200, margin: "16px auto 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 80, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 16, padding: "40px 60px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40 }}>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "#fff", lineHeight: 1.3, flex: 1 }}>
              Every review you don&apos;t collect is a customer your competitor wins instead.
            </p>
            <a href="/signup" style={{ background: G, color: "#fff", borderRadius: 9999, padding: "18px 36px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
              Fix it with Vomni →
            </a>
          </div>
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <button
              onClick={scrollToBookDemo}
              style={{ background: G, color: "#fff", borderRadius: 9999, padding: "16px 40px", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GD; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
            >
              See How Vomni Fixes This →
            </button>
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ────────────────────────────────────────────────── */}
      <section id="demo" className="section-pad" style={{ background: OW, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: N, textAlign: "center" }}>
            Everything you need.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TS, textAlign: "center", marginTop: 16 }}>
            See the product. All of it.
          </p>

          {/* Tabs — sticky while browser frame is in view */}
          <div className="product-tabs tabs-row" style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 48, flexWrap: "wrap", position: "sticky", top: 80, zIndex: 50, background: OW, padding: "16px 0" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
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
          <div style={{ maxWidth: 1000, margin: "48px auto 0", background: "#fff", borderRadius: 20, boxShadow: "0 40px 100px rgba(0,0,0,0.12)", overflow: "hidden" }}>
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
                title: "Set up email forwarding once. That\u2019s it.",
                body: "Set up one email forward from your booking system to Vomni. That is literally it - you never need to touch it again.",
                icon: (
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                ),
              },
              {
                num: "02",
                title: "We send the perfect review request.",
                body: "After every appointment your customer gets a personalised SMS at the right time. It reads like it came from you personally.",
                icon: (
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Happy customers go to Google.",
                body: "4-5 stars go straight to your Google review page. 1-3 stars come to you privately so you can fix it before it goes public.",
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
          {/* SMS conversation mockup */}
          <div className="sms-mockup" style={{ background: "#fff", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.10)", maxWidth: 600, margin: "80px auto 0", padding: 32 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ background: OW, borderRadius: 9999, padding: "6px 16px", fontFamily: "Inter, sans-serif", fontSize: 13, color: TM, fontWeight: 500 }}>SMS · Kings Cuts London</span>
            </div>
            {/* Message from Kings Cuts */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <div style={{ background: "#fff", border: `1.5px solid ${G}`, borderRadius: "18px 18px 4px 18px", padding: "14px 18px", maxWidth: "80%", fontFamily: "Inter, sans-serif", fontSize: 15, color: N, lineHeight: 1.5 }}>
                Hi James, thanks for your cut at Kings Cuts today! How was your experience? Tap to rate us: vomni.app/r/kc ✂️
              </div>
            </div>
            {/* Star rating response */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "20px 0" }}>
              {Array.from({ length: 5 }).map((_, i) => <StarSVG key={i} size={28} />)}
            </div>
            {/* Redirect confirmation */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 20 }}>
              <div style={{ background: G, borderRadius: "18px 18px 18px 4px", padding: "14px 18px", maxWidth: "80%", fontFamily: "Inter, sans-serif", fontSize: 15, color: "#fff", lineHeight: 1.5 }}>
                Thanks James! We&apos;ve sent you to Google to leave your review 🙏
              </div>
            </div>
            {/* Notification */}
            <div style={{ background: OW, borderRadius: 12, borderLeft: `3px solid ${G}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, fontWeight: 500 }}>New 5-star review on Google · Omar Abdullah</span>
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
            Built for businesses that run on reputation.
          </h2>
          <div className="testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 80 }}>
            {[
              { quote: "34 reviews to 180 in four months. We're now the first result for barber Shoreditch.", name: "Marcus T.", biz: "Kings Cuts London",         avatar: "https://i.pravatar.cc/80?img=11" },
              { quote: "Three complaints resolved privately last month. None of them reached Google.",         name: "Priya K.",  biz: "Glamour Hair Studio",        avatar: "https://i.pravatar.cc/80?img=47" },
              { quote: "Eight minutes to set up. Sixty new reviews. I haven't touched it since day one.",     name: "Tom B.",    biz: "The Oak Table Restaurant",   avatar: "https://i.pravatar.cc/80?img=33" },
            ].map((t, i) => (
              <div
                key={i}
                className="testimonial-card"
                style={{ background: "#fff", borderRadius: 24, padding: 44, boxShadow: "0 2px 24px rgba(0,0,0,0.06)", transition: "transform 0.25s, box-shadow 0.25s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.10)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 24px rgba(0,0,0,0.06)"; }}
              >
                <Stars count={5} size={20} />
                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, color: N, fontStyle: "italic", lineHeight: 1.5, marginTop: 24 }}>
                  {t.quote}
                </p>
                <hr style={{ border: "none", borderTop: `1px solid ${BD}`, margin: "28px 0" }} />
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
      <section style={{ background: OW, padding: "100px 0" }}>
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
          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 56, flexWrap: "wrap" }}>
            {/* Card 1 — Kings Cuts London */}
            <div
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
                {["4.3★ rating", "66% completion", "28 reviews/mo"].map((s) => (
                  <span key={s} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: TM }}>{s}</span>
                ))}
              </div>
              <a
                href="/demo/kings-cuts-london"
                style={{ display: "block", marginTop: 24, background: N, color: "#fff", borderRadius: 9999, padding: "14px 0", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", transition: "background 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1a2035"; }}
                onMouseLeave={e => { e.currentTarget.style.background = N; }}
              >
                Explore This Dashboard →
              </a>
            </div>
            {/* Card 2 — Bella Vista Restaurant */}
            <div
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
                href="/demo/bella-vista-restaurant"
                style={{ display: "block", marginTop: 24, background: N, color: "#fff", borderRadius: 9999, padding: "14px 0", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", transition: "background 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1a2035"; }}
                onMouseLeave={e => { e.currentTarget.style.background = N; }}
              >
                Explore This Dashboard →
              </a>
            </div>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textAlign: "center", marginTop: 32 }}>
            These are live demo accounts with real product functionality.
          </p>
        </div>
      </section>

      {/* ── BOOK A DEMO ─────────────────────────────────────────────────────── */}
      <section id="book-demo" style={{ background: N, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

          {/* Left — copy */}
          <div>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: G, textTransform: "uppercase" }}>BOOK A DEMO</p>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginTop: 16 }}>
              See exactly how Vomni works for your business.
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginTop: 16 }}>
              Omri will walk you through the product, show you what your dashboard would look like, and answer every question you have. No pressure. 30 minutes.
            </p>
            <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
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

          {/* Right — booking form card */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 40, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
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
                  Omri will be in touch within a few hours to confirm your time. Check your email for confirmation.
                </p>
                <span style={{ display: "inline-block", marginTop: 20, background: "rgba(0,200,150,0.1)", color: G, borderRadius: 9999, padding: "8px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>
                  {"We'll see you soon"}
                </span>
              </div>
            ) : (
              <form onSubmit={submitBooking}>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>Book your free demo</h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TS, marginTop: 6, marginBottom: 28 }}>Pick a time that works for you</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
      <section id="pricing" className="section-pad" style={{ background: N, padding: "120px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: "#fff", textAlign: "center" }}>
            One price. Everything included.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TM, textAlign: "center", marginTop: 16 }}>
            No setup fees. No long contracts. Cancel whenever.
          </p>
          <div className="pricing-flex" style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 28, marginTop: 80, maxWidth: 860, marginLeft: "auto", marginRight: "auto" }}>

            {/* Monthly */}
            <div style={{ background: "#fff", borderRadius: 24, padding: 48, flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: TS }}>MONTHLY</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 72, fontWeight: 900, color: N, lineHeight: 1 }}>£70</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS }}>/month</span>
              </div>
              <hr style={{ border: "none", borderTop: `1px solid ${BD}`, margin: "28px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                {["Cancel anytime", "Unlimited review requests", "Full dashboard and analytics", "24/7 customer support"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckIcon />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: TS }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="/signup" style={{ display: "block", marginTop: 36, background: G, color: "#fff", borderRadius: 9999, padding: "18px 0", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
                Get Started
              </a>
            </div>

            {/* Annual */}
            <div style={{ background: "#fff", borderRadius: 24, padding: 48, flex: 1, border: `2.5px solid ${G}`, position: "relative", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: G, color: "#fff", borderRadius: 9999, padding: "6px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                SAVE £240
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: TS }}>ANNUAL</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 72, fontWeight: 900, color: N, lineHeight: 1 }}>£600</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: TS }}>/year</span>
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: G, fontWeight: 600, marginTop: 6 }}>That&apos;s £50/month - save £240</p>
              <hr style={{ border: "none", borderTop: `1px solid ${BD}`, margin: "28px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                {["2 months free", "Everything in monthly", "Priority support"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckIcon />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: TS }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="/signup" style={{ display: "block", marginTop: 36, background: G, color: "#fff", borderRadius: 9999, padding: "18px 0", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
                Get Started - Best Value
              </a>
            </div>
          </div>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: TM, textAlign: "center", marginTop: 40 }}>
            Not seeing more reviews in your first 14 days? Full refund. No forms. No questions.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section className="section-pad" style={{ background: "#fff", padding: "120px 0", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <h2 className="section-headline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 80, fontWeight: 800, color: N, lineHeight: 1.0, letterSpacing: "-0.03em" }}>
            Your competitors are collecting reviews right now.
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: TS, marginTop: 24 }}>
            Every day without Vomni, your competitor gets the review instead.
          </p>
          <a
            href="/signup"
            style={{ display: "inline-block", marginTop: 48, background: G, color: "#fff", borderRadius: 9999, padding: "22px 56px", fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, textDecoration: "none", boxShadow: "0 0 40px rgba(0,200,150,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(0,200,150,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 40px rgba(0,200,150,0.3)"; }}
          >
            Start Today - from £50/month →
          </a>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, marginTop: 16 }}>14-day money back guarantee</p>

        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: N, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "48px 0" }}>
        <div className="container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff" }}>Vomni</span>
          <div style={{ display: "flex", gap: 32 }}>
            {["Pricing", "Contact", "Privacy", "Terms"].map((l) => (
              <a key={l} href="#" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: TM }}>© 2026 Vomni.</span>
        </div>
      </footer>
    </>
  );
}
