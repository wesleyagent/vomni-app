"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, X } from "lucide-react";
import dynamic from "next/dynamic";
import { db, getMyBusiness } from "@/lib/db";
import { BusinessContext } from "./_context";
import { getPlanName } from "@/lib/planFeatures";

const ChatWidget = dynamic(() => import("@/components/ChatWidget"), { ssr: false });

const G = "#00C896";
const N = "#0A0F1E";

const TABS = [
  { href: "/dashboard",           label: "Overview",       key: "overview"  },
  { href: "/dashboard/calendar",  label: "Calendar",       key: "calendar"  },
  { href: "/dashboard/customers", label: "Customers",      key: "customers" },
  { href: "/dashboard/feedback",  label: "Feedback Inbox", key: "feedback"  },
  { href: "/dashboard/analytics", label: "Analytics",      key: "analytics" },
  { href: "/dashboard/settings",  label: "Settings",       key: "settings"  },
];

interface Notification {
  id: string;
  type: string;
  title?: string;
  body?: string;
  message?: string; // legacy
  link?: string;
  read: boolean;
  created_at: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [ctx,           setCtx]           = useState<{ businessId: string; businessName: string; ownerName: string; email: string; timezone: string; currency: string } | null>(null);
  const [bizPlan,       setBizPlan]       = useState<string | null>(null);
  const [smsUsed,       setSmsUsed]       = useState<number>(0);
  const [smsLimit,      setSmsLimit]      = useState<number | null>(null);
  const [smsAnnual,     setSmsAnnual]     = useState<boolean>(false);
  const [loading,       setLoading]       = useState(true);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [trialInfo,     setTrialInfo]     = useState<{ isTrial: boolean; daysRemaining: number; trialExpired: boolean } | null>(null);

  // IL invoice onboarding
  const [showInvoiceBanner, setShowInvoiceBanner] = useState(false);
  const [showInvoiceModal,  setShowInvoiceModal]  = useState(false);
  const [invoiceLegalName,  setInvoiceLegalName]  = useState("");
  const [invoiceAddress,    setInvoiceAddress]    = useState("");
  const [invoiceOsekType,   setInvoiceOsekType]   = useState<"osek_patur" | "osek_murshe">("osek_patur");
  const [invoiceMursheNum,  setInvoiceMursheNum]  = useState("");
  const [invoiceSaving,     setInvoiceSaving]     = useState(false);

  // Review request modal
  const [showReviewModal,  setShowReviewModal]  = useState(false);
  const [reviewMessage,    setReviewMessage]    = useState("");
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false);
  const [showQR,           setShowQR]           = useState(false);
  const reviewUrlRef = useRef("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user?.email) { router.replace("/login"); return; }

      let biz = await getMyBusiness(user.email);

      if (!biz) {
        const meta     = user.user_metadata ?? {};
        const { data: created } = await db.from("businesses").insert({
          id:                user.id,
          name:              (meta.business_name as string) ?? "My Business",
          owner_name:        (meta.owner_name   as string) ?? "",
          owner_email:       user.email,
          plan:              "trial",
          status:            "active",
          billing_anchor_day: new Date().getDate(),
          created_at:        new Date().toISOString(),
        }).select().single();
        biz = created;
      }

      if (biz) {
        const step = biz.onboarding_step ?? 5;
        if (step < 5) { router.replace("/onboarding"); return; }
        const bizAny = biz as unknown as Record<string, unknown>;
        const tz = (bizAny.booking_timezone as string | null) ?? "Asia/Jerusalem";
        const cur = (bizAny.booking_currency as string | null) ?? "ILS";
        setCtx({ businessId: biz.id, businessName: biz.name ?? "My Business", ownerName: biz.owner_name ?? "", email: user.email, timezone: tz, currency: cur });
        // Show invoice onboarding banner for IL businesses that haven't set up their legal details
        if (tz === "Asia/Jerusalem") {
          const needsOnboarding = !bizAny.business_legal_name && !bizAny.osek_type;
          setShowInvoiceBanner(needsOnboarding);
        }
        const plan = (biz as typeof biz & { plan?: string }).plan ?? null;
        setBizPlan(plan);
        // Credit-based SMS limits removed — usage tracking deprecated
        setSmsAnnual(false);
        setSmsUsed(0);
        setSmsLimit(null);
        loadNotifications(biz.id);
        loadTrialStatus(biz.id);
      } else {
        setCtx({ businessId: user.id, businessName: "My Business", ownerName: "", email: user.email, timezone: "Asia/Jerusalem", currency: "ILS" });
      }
      setLoading(false);
    })();
  }, [router]);

  async function loadTrialStatus(businessId: string) {
    try {
      const res = await fetch(`/api/trial-status?business_id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setTrialInfo(data);
        // If trial expired, update the plan badge to reflect it
        if (data.trialExpired) setBizPlan("trial_expired");
      }
    } catch { /* silently fail */ }
  }

  function handleSubscribe() {
    router.push("/dashboard/upgrade");
  }

  async function loadNotifications(businessId: string) {
    try {
      const res = await fetch(`/api/notifications?business_id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch { /* silently fail */ }
  }

  async function markAllRead() {
    if (!ctx?.businessId) return;
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: ctx.businessId }),
      });
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    } catch { /* silently fail */ }
  }

  async function signOut() {
    await db.auth.signOut();
    router.push("/");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const unread = notifications.filter(n => !n.read).length;
  const feedbackAlerts = notifications.filter(n => !n.read && (n.type === "negative_review" || n.type === "low_rating" || n.type === "feedback" || n.type === "complaint")).length;
  const initials = ctx?.businessName ? ctx.businessName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  function notifDotColor(type: string) {
    if (type === "complaint") return "#EF4444";
    if (type === "no_show") return "#F59E0B";
    return "#22C55E"; // green for google_redirect, nudge_converted, new_booking, etc.
  }

  function fmtAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function openReviewModal() {
    const bizId = ctx?.businessId;
    const bizName = ctx?.businessName ?? "us";
    const url = typeof window !== "undefined" ? `${window.location.origin}/review-invite/${bizId}` : `/review-invite/${bizId}`;
    reviewUrlRef.current = url;
    setReviewMessage(`Thanks for visiting ${bizName}! We'd love your feedback — could you leave us a quick review? ${url}`);
    setReviewLinkCopied(false);
    setShowQR(false);
    setShowReviewModal(true);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#F7F8FA" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <BusinessContext.Provider value={ctx ?? { businessId: "", businessName: "My Business", ownerName: "", email: "", timezone: "Asia/Jerusalem", currency: "ILS" }}>
      <div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
          .nav-tab:hover { color: #00C896 !important; border-bottom-color: rgba(0,200,150,0.3) !important; }
          .dash-header-inner { padding: 0 40px; }
          .dash-tab-bar { padding: 0 40px; overflow-x: auto; scrollbar-width: none; }
          .dash-tab-bar::-webkit-scrollbar { display: none; }
          .dash-notif-panel { width: 380px; }
          @media (max-width: 768px) {
            .dash-header-inner { padding: 0 16px !important; }
            .dash-tab-bar { padding: 0 8px !important; }
            .dash-notif-panel { width: 100vw !important; }
            .dash-page-outer   { padding: 16px !important; }
            .dash-stats-grid   { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
            .dash-content-grid { grid-template-columns: 1fr !important; }
            .dash-vomni-grid   { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          }
        `}</style>

        {/* Top Header */}
        <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 40 }}>
          <div className="dash-header-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            {/* Logo + Business Name */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link href="/dashboard" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 22, color: N, textDecoration: "none", letterSpacing: "-0.5px" }}>
                vomni
              </Link>
              {ctx?.businessName && (
                <>
                  <span style={{ color: "#D1D5DB", fontSize: 18 }}>/</span>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, color: N }}>
                    {ctx.businessName}
                  </span>
                </>
              )}
              {bizPlan && (
                <a href="/pricing" style={{ textDecoration: "none" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 9999,
                    fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                    background: bizPlan === "trial_expired" ? "#FEE2E2"
                      : trialInfo?.isTrial ? "rgba(59,130,246,0.12)"
                      : bizPlan === "pro" ? "rgba(245,166,35,0.15)"
                      : bizPlan === "starter" ? "#F3F4F6"
                      : "rgba(0,200,150,0.12)",
                    color: bizPlan === "trial_expired" ? "#DC2626"
                      : trialInfo?.isTrial ? "#3B82F6"
                      : bizPlan === "pro" ? "#F5A623"
                      : bizPlan === "starter" ? "#6B7280"
                      : "#00C896",
                    cursor: "pointer",
                  }}>
                    {bizPlan === "trial_expired" ? "Trial Ended"
                      : trialInfo?.isTrial ? "Pro Trial"
                      : bizPlan === "pro" ? "Pro ★"
                      : bizPlan === "starter" ? "Starter"
                      : getPlanName(bizPlan)}
                  </span>
                </a>
              )}
            </div>

            {/* Right: Request Review + Bell + Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Request Review */}
              <button
                onClick={openReviewModal}
                style={{
                  padding: "7px 16px", borderRadius: 9999,
                  background: "transparent", color: "#374151",
                  border: "1.5px solid #D1D5DB",
                  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", whiteSpace: "nowrap",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G; (e.currentTarget as HTMLButtonElement).style.color = G; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#D1D5DB"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
              >
                Request Review
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unread > 0) markAllRead(); }}
                style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#6B7280", display: "flex", alignItems: "center" }}
              >
                <Bell size={22} />
                {unread > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 0, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: G, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13 }}>
                {initials}
              </div>

              {/* Sign out */}
              <button
                onClick={signOut}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif", fontSize: 13 }}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="dash-tab-bar" style={{ display: "flex", gap: 0, background: "#fff", borderTop: "1px solid #F3F4F6" }}>
            {TABS.map(tab => {
              const active = isActive(tab.href);
              const isFeedback = tab.key === "feedback";
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={!active ? "nav-tab" : ""}
                  style={{
                    padding: "14px 20px",
                    textDecoration: "none",
                    fontFamily: active ? "'Bricolage Grotesque', sans-serif" : "Inter, sans-serif",
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    color: active ? G : "#6B7280",
                    borderBottom: active ? `2px solid ${G}` : "2px solid transparent",
                    marginBottom: -1,
                    whiteSpace: "nowrap",
                    transition: "color 0.2s ease, border-bottom-color 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {tab.label}
                  {isFeedback && feedbackAlerts > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                      {feedbackAlerts > 9 ? "9+" : feedbackAlerts}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* SMS Usage Bar */}
          {(() => {
            if (smsLimit === null) return null; // Pro/unlimited — no bar
            const pct = Math.min(100, Math.round((smsUsed / smsLimit) * 100));
            const isHigh   = pct >= 80;
            const isAlmost = pct >= 95;
            const barColor = isAlmost ? "#EF4444" : isHigh ? "#F59E0B" : G;
            return (
              <div style={{ padding: "7px 40px", background: "#FAFAFA", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>
                  Review requests {smsAnnual ? "this year" : "this month"}
                </span>
                <div style={{ flex: 1, height: 6, background: "#E5E7EB", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 9999, transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: isAlmost ? "#EF4444" : isHigh ? "#F59E0B" : "#374151", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {smsUsed}/{smsLimit}
                </span>
                {isHigh && (
                  <a href="/pricing" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Upgrade plan
                  </a>
                )}
              </div>
            );
          })()}
        </header>

        {/* Trial Banner */}
        {trialInfo?.isTrial && !trialInfo.trialExpired && (
          <div style={{
            background: "linear-gradient(90deg, #0A0F1E 0%, #1a2332 100%)",
            padding: "14px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⏱️</span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>
                Your free trial: {trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? "s" : ""} remaining
              </span>
            </div>
            <button
              onClick={handleSubscribe}
              style={{
                background: G,
                color: "#fff",
                border: "none",
                borderRadius: 9999,
                padding: "10px 24px",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
            >
              Subscribe now →
            </button>
          </div>
        )}

        {/* ── IL Invoice Onboarding Banner ── */}
        {showInvoiceBanner && !trialInfo?.trialExpired && (
          <div dir="rtl" style={{
            background: "linear-gradient(90deg, #0A0F1E 0%, #0f1e2e 100%)",
            padding: "12px 40px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            borderTop: "1px solid rgba(0,200,150,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🧾</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#fff" }}>
                השלם את פרטי העסק להנפקת מסמכים
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setShowInvoiceModal(true)}
                style={{
                  background: G, color: "#fff", border: "none", borderRadius: 9999,
                  padding: "8px 18px", fontFamily: "Inter, sans-serif", fontSize: 13,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                השלם עכשיו
              </button>
              <button
                onClick={() => setShowInvoiceBanner(false)}
                style={{
                  background: "transparent", color: "rgba(255,255,255,0.5)", border: "none",
                  cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px",
                }}
                title="סגור"
              >×</button>
            </div>
          </div>
        )}

        {/* Trial Expired Overlay */}
        {trialInfo?.trialExpired && (
          <div style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 16,
            margin: "40px auto",
            maxWidth: 520,
            padding: "48px 40px",
            textAlign: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: "0 0 12px" }}>
              Your free trial has ended
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#6B7280", lineHeight: 1.6, margin: "0 0 28px" }}>
              Subscribe to keep using all Pro features — AI insights, advanced analytics, custom SMS numbers, and more.
            </p>
            <button
              onClick={handleSubscribe}
              style={{
                background: G,
                color: "#fff",
                border: "none",
                borderRadius: 9999,
                padding: "16px 40px",
                fontFamily: "Inter, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
            >
              Choose a plan →
            </button>
          </div>
        )}

        {/* Page content — hidden when trial expired */}
        <main style={{ flex: 1, ...(trialInfo?.trialExpired ? { display: "none" } : {}) }}>{children}</main>

        {/* Notification Panel (slide-in from right) */}
        {notifOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 45 }}
              onClick={() => setNotifOpen(false)}
            />
            <div className="dash-notif-panel" style={{
              position: "fixed", top: 0, right: 0, bottom: 0, background: "#fff",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", zIndex: 50,
              animation: "slideIn 0.2s ease-out",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, color: N, margin: 0 }}>
                  Notifications
                </h3>
                <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 16px" }}>
                    <Bell size={32} style={{ color: "#D1D5DB", margin: "0 auto 12px" }} />
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF" }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      padding: 16, borderRadius: 12, marginBottom: 8,
                      background: n.read ? "#F9FAFB" : "rgba(0,200,150,0.06)",
                      border: n.read ? "1px solid #F3F4F6" : "1px solid rgba(0,200,150,0.2)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: notifDotColor(n.type), flexShrink: 0 }} />
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: G, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {n.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>
                          {fmtAgo(n.created_at)}
                        </span>
                      </div>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, margin: 0, lineHeight: 1.5 }}>
                        {n.title && <strong>{n.title}</strong>}
                        {n.title && (n.body ?? n.message) ? <><br />{n.body ?? n.message}</> : (n.body ?? n.message)}
                      </p>
                      {n.link && (
                        <Link href={n.link} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: G, textDecoration: "none", marginTop: 6, display: "inline-block" }}>
                          View →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <ChatWidget context="dashboard" business={ctx ? { id: ctx.businessId, name: ctx.businessName, ownerName: ctx.ownerName } : null} />

        {/* ── IL Invoice Onboarding Modal ── */}
        {showInvoiceModal && (
          <>
            <div
              onClick={() => setShowInvoiceModal(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }}
            />
            <div dir="rtl" style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(460px, calc(100vw - 32px))", background: "#fff", borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)", zIndex: 210, padding: 28,
              maxHeight: "90vh", overflowY: "auto", fontFamily: "Inter, sans-serif",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
                  פרטי עסק להנפקת מסמכים
                </h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  style={{ background: "#F7F8FA", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} color="#6B7280" />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* שם משפטי */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    שם משפטי של העסק *
                  </label>
                  <input
                    value={invoiceLegalName} onChange={e => setInvoiceLegalName(e.target.value)}
                    placeholder="כפי שמופיע ברשומות רשם החברות"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, color: N, outline: "none", boxSizing: "border-box", direction: "rtl" }}
                  />
                </div>

                {/* כתובת */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    כתובת *
                  </label>
                  <input
                    value={invoiceAddress} onChange={e => setInvoiceAddress(e.target.value)}
                    placeholder="רחוב, עיר, מיקוד"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, color: N, outline: "none", boxSizing: "border-box", direction: "rtl" }}
                  />
                </div>

                {/* סוג עוסק */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    סוג עוסק *
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {(["osek_patur", "osek_murshe"] as const).map(t => (
                      <label key={t} style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 10,
                        padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                        border: `2px solid ${invoiceOsekType === t ? G : "#E5E7EB"}`,
                        background: invoiceOsekType === t ? `${G}10` : "#fff",
                        transition: "border-color 0.15s",
                      }}>
                        <input
                          type="radio"
                          name="osek_type"
                          value={t}
                          checked={invoiceOsekType === t}
                          onChange={() => setInvoiceOsekType(t)}
                          style={{ accentColor: G }}
                        />
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: invoiceOsekType === t ? G : N }}>
                          {t === "osek_patur" ? "עוסק פטור" : "עוסק מורשה"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* מספר עוסק מורשה */}
                {invoiceOsekType === "osek_murshe" && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      מספר עוסק מורשה *
                    </label>
                    <input
                      value={invoiceMursheNum}
                      onChange={e => setInvoiceMursheNum(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="9 ספרות"
                      maxLength={9}
                      style={{
                        width: "100%", padding: "11px 14px", borderRadius: 10,
                        border: `1px solid ${invoiceMursheNum.length > 0 && invoiceMursheNum.length !== 9 ? "#EF4444" : "#E5E7EB"}`,
                        fontSize: 14, color: N, outline: "none", boxSizing: "border-box",
                        direction: "ltr", textAlign: "right",
                      }}
                    />
                    {invoiceMursheNum.length > 0 && invoiceMursheNum.length !== 9 && (
                      <p style={{ fontSize: 12, color: "#EF4444", margin: "4px 0 0" }}>מספר עוסק מורשה חייב להכיל בדיוק 9 ספרות</p>
                    )}
                  </div>
                )}
              </div>

              <button
                disabled={
                  !invoiceLegalName.trim() || !invoiceAddress.trim() ||
                  (invoiceOsekType === "osek_murshe" && invoiceMursheNum.length !== 9) ||
                  invoiceSaving
                }
                onClick={async () => {
                  if (!ctx?.businessId) return;
                  setInvoiceSaving(true);
                  const patch: Record<string, unknown> = {
                    business_legal_name: invoiceLegalName.trim(),
                    business_address:    invoiceAddress.trim(),
                    osek_type:           invoiceOsekType,
                  };
                  if (invoiceOsekType === "osek_murshe") patch.osek_murshe_number = invoiceMursheNum;
                  await db.from("businesses").update(patch).eq("id", ctx.businessId);
                  setShowInvoiceBanner(false);
                  setShowInvoiceModal(false);
                  setInvoiceSaving(false);
                }}
                style={{
                  width: "100%", marginTop: 20, padding: "13px 16px", borderRadius: 12,
                  background: (!invoiceLegalName.trim() || !invoiceAddress.trim() ||
                    (invoiceOsekType === "osek_murshe" && invoiceMursheNum.length !== 9) ||
                    invoiceSaving) ? "#E5E7EB" : G,
                  color: (!invoiceLegalName.trim() || !invoiceAddress.trim() ||
                    (invoiceOsekType === "osek_murshe" && invoiceMursheNum.length !== 9) ||
                    invoiceSaving) ? "#9CA3AF" : "#fff",
                  border: "none", fontFamily: "Inter, sans-serif", fontSize: 15,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                {invoiceSaving ? "שומר..." : "שמור פרטי עסק"}
              </button>
            </div>
          </>
        )}

        {/* ── Request Review Modal ── */}
        {showReviewModal && (
          <>
            <div
              onClick={() => setShowReviewModal(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200 }}
            />
            <div style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(420px, calc(100vw - 32px))", background: "#fff", borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)", zIndex: 210, padding: 28,
              maxHeight: "90vh", overflowY: "auto",
              fontFamily: "Inter, sans-serif",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
                  Request a Review
                </h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  style={{ background: "#F7F8FA", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} color="#6B7280" />
                </button>
              </div>

              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16, lineHeight: 1.5 }}>
                Share this link with any customer to collect a review — no booking required.
              </p>

              {/* Editable message */}
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</label>
              <textarea
                value={reviewMessage}
                onChange={e => setReviewMessage(e.target.value)}
                rows={4}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                  border: "1px solid #E5E7EB", fontFamily: "Inter, sans-serif", fontSize: 13,
                  color: N, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6,
                }}
              />

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reviewUrlRef.current);
                    setReviewLinkCopied(true);
                    setTimeout(() => setReviewLinkCopied(false), 2000);
                  }}
                  style={{
                    flex: 1, padding: "11px 8px", borderRadius: 10,
                    background: reviewLinkCopied ? `${G}15` : "#F7F8FA",
                    color: reviewLinkCopied ? G : N,
                    border: `1px solid ${reviewLinkCopied ? G : "#E5E7EB"}`,
                    fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {reviewLinkCopied ? "✓ Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={() => setShowQR(q => !q)}
                  style={{
                    flex: 1, padding: "11px 8px", borderRadius: 10,
                    background: showQR ? `${N}10` : "#F7F8FA", color: N,
                    border: `1px solid ${showQR ? N : "#E5E7EB"}`,
                    fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {showQR ? "Hide QR" : "Show QR Code"}
                </button>
              </div>

              {/* QR Code */}
              {showQR && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ background: "#F7F8FA", borderRadius: 12, padding: 16, border: "1px solid #E5E7EB" }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewUrlRef.current)}`}
                      alt="QR Code" width={200} height={200}
                      style={{ display: "block", borderRadius: 6 }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: "10px 0 0", textAlign: "center" }}>
                    Show this to the customer to scan
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowReviewModal(false)}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: 12,
                  background: G, color: "#fff", border: "none",
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >Done</button>
            </div>
          </>
        )}
      </div>
    </BusinessContext.Provider>
  );
}
