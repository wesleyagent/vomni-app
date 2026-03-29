"use client";

import { useState, useEffect } from "react";
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
  { href: "/dashboard/customers", label: "Customers",      key: "customers" },
  { href: "/dashboard/feedback",  label: "Feedback Inbox", key: "feedback"  },
  { href: "/dashboard/analytics", label: "Analytics",      key: "analytics" },
  { href: "/dashboard/settings",  label: "Settings",       key: "settings"  },
];

interface Notification {
  id: string;
  type: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [ctx,           setCtx]           = useState<{ businessId: string; businessName: string; ownerName: string; email: string } | null>(null);
  const [bizPlan,       setBizPlan]       = useState<string | null>(null);
  const [smsUsed,       setSmsUsed]       = useState<number>(0);
  const [smsLimit,      setSmsLimit]      = useState<number | null>(null);
  const [smsAnnual,     setSmsAnnual]     = useState<boolean>(false);
  const [loading,       setLoading]       = useState(true);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [trialInfo,     setTrialInfo]     = useState<{ isTrial: boolean; daysRemaining: number; trialExpired: boolean } | null>(null);
  const [subscribing,   setSubscribing]   = useState(false);

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
          plan:              (meta.plan         as string) ?? "monthly",
          status:            "active",
          billing_anchor_day: new Date().getDate(),
          created_at:        new Date().toISOString(),
        }).select().single();
        biz = created;
      }

      if (biz) {
        const step = biz.onboarding_step ?? 5;
        if (step < 5) { router.replace("/onboarding"); return; }
        setCtx({ businessId: biz.id, businessName: biz.name ?? "My Business", ownerName: biz.owner_name ?? "", email: user.email });
        const plan = (biz as typeof biz & { plan?: string }).plan ?? null;
        setBizPlan(plan);
        // Credit-based SMS limits removed — usage tracking deprecated
        setSmsAnnual(false);
        setSmsUsed(0);
        setSmsLimit(null);
        loadNotifications(biz.id);
        loadTrialStatus(biz.id);
      } else {
        setCtx({ businessId: user.id, businessName: "My Business", ownerName: "", email: user.email });
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

  async function handleSubscribe() {
    if (!ctx?.email || subscribing) return;
    setSubscribing(true);
    try {
      const res = await fetch("/api/lemonsqueezy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: 1460277, email: ctx.email, businessId: ctx.businessId, isUpgrade: true }),
      });
      const data = await res.json();
      if (data.url) {
        // Append checkout[email] param for pre-fill
        const checkoutUrl = new URL(data.url);
        checkoutUrl.searchParams.set("checkout[email]", ctx.email);
        window.location.href = checkoutUrl.toString();
      }
    } catch { /* silently fail */ }
    setSubscribing(false);
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
  const feedbackAlerts = notifications.filter(n => !n.read && (n.type === "negative_review" || n.type === "low_rating" || n.type === "feedback")).length;
  const initials = ctx?.businessName ? ctx.businessName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  function fmtAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
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
    <BusinessContext.Provider value={ctx ?? { businessId: "", businessName: "My Business", ownerName: "", email: "" }}>
      <div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", flexDirection: "column" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
          .nav-tab:hover { color: #00C896 !important; border-bottom-color: rgba(0,200,150,0.3) !important; }
        `}</style>

        {/* Top Header */}
        <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 64 }}>
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

            {/* Right: Bell + Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
          <div style={{ display: "flex", gap: 0, padding: "0 40px", background: "#fff", borderTop: "1px solid #F3F4F6" }}>
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
              disabled={subscribing}
              style={{
                background: G,
                color: "#fff",
                border: "none",
                borderRadius: 9999,
                padding: "10px 24px",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: subscribing ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!subscribing) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
              onMouseLeave={e => { if (!subscribing) (e.currentTarget as HTMLElement).style.background = G; }}
            >
              {subscribing ? "Loading…" : "Subscribe now →"}
            </button>
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
              disabled={subscribing}
              style={{
                background: G,
                color: "#fff",
                border: "none",
                borderRadius: 9999,
                padding: "16px 40px",
                fontFamily: "Inter, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                cursor: subscribing ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!subscribing) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
              onMouseLeave={e => { if (!subscribing) (e.currentTarget as HTMLElement).style.background = G; }}
            >
              {subscribing ? "Loading…" : "Subscribe to Pro — £149/mo →"}
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
            <div style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 380, background: "#fff",
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
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: G, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {n.type.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>
                          {fmtAgo(n.created_at)}
                        </span>
                      </div>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, margin: 0, lineHeight: 1.5 }}>{n.message}</p>
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
      </div>
    </BusinessContext.Provider>
  );
}
