"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Mail, Phone, Star, TrendingUp,
  Users, ExternalLink, Clock, CheckCircle, AlertCircle,
} from "lucide-react";

const G  = "#00C896";
const N  = "#0A0F1E";
const AM = "#F59E0B";
const RD = "#EF4444";
const BD = "#E5E7EB";

function fmtDate(ts: string) {
  try {
    return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "-"; }
}

function fmtDateShort(ts: string) {
  try {
    return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return "-"; }
}

function fmtAgo(ts: string | null) {
  if (!ts) return "Never";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:                        { label: "Pending",          bg: "#F3F4F6", color: "#6B7280" },
  sms_sent:                       { label: "SMS Sent",         bg: "#FEF3C7", color: "#B45309" },
  form_opened:                    { label: "Opened",           bg: "#FEF3C7", color: "#B45309" },
  form_submitted:                 { label: "Rated",            bg: "#D1FAE5", color: "#065F46" },
  redirected_to_google:           { label: "→ Google ✓",       bg: "#D1FAE5", color: "#065F46" },
  private_feedback:               { label: "Private Feedback", bg: "#FEE2E2", color: "#991B1B" },
  private_feedback_from_positive: { label: "Private (pos)",    bg: "#FEF3C7", color: "#B45309" },
  reviewed_positive:              { label: "Positive",         bg: "#D1FAE5", color: "#065F46" },
  reviewed_negative:              { label: "Negative",         bg: "#FEE2E2", color: "#991B1B" },
  redirected:                     { label: "Redirected",       bg: "#D1FAE5", color: "#065F46" },
};

interface Booking {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  review_status: string | null;
  sms_sent_at: string | null;
  created_at: string;
  rating: number | null;
}

interface Business {
  id: string;
  name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  plan: string | null;
  status: string | null;
  business_type: string | null;
  notification_email: string | null;
  google_review_link: string | null;
  onboarding_step: number | null;
  onboarding_gdpr_accepted: boolean | null;
  onboarding_gdpr_accepted_at: string | null;
  created_at: string;
  weekly_google_redirects: number | null;
}

interface Stats {
  totalBookings: number;
  reviewsThisMonth: number;
  completionRate: number;
  totalRedirected: number;
  lastActivity: string | null;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BD}`, borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon size={16} style={{ color: color ?? G }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: N }}>{value}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AdminBusinessView() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const [biz,          setBiz]          = useState<Business | null>(null);
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/businesses/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.business) setBiz(data.business);
        if (data.bookings) setBookings(data.bookings);
        if (data.stats)    setStats(data.stats);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    return (
      (b.customer_name ?? "").toLowerCase().includes(q) ||
      (b.review_status ?? "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ fontFamily: "Inter, sans-serif", color: "#9CA3AF" }}>Loading account…</div>
      </div>
    );
  }

  if (!biz) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: RD }}>Business not found.</div>
    );
  }

  async function handleImpersonate() {
    if (!biz) return;
    setImpersonating(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: biz.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.link) {
        alert(data.error ?? "Failed to generate access link");
        return;
      }
      // Open the magic link in a new tab — logs in as the customer
      window.open(data.link, "_blank");
    } catch {
      alert("Failed to generate access link");
    } finally {
      setImpersonating(false);
    }
  }

  const planLabel = biz.plan === "pro" ? "Pro ★" : biz.plan === "growth" ? "Growth" : biz.plan === "starter" ? "Starter" : (biz.plan ?? "Unknown");
  const planBg    = biz.plan === "pro" ? "rgba(245,166,35,0.15)" : biz.plan === "growth" ? "rgba(0,200,150,0.12)" : "#F3F4F6";
  const planColor = biz.plan === "pro" ? "#F5A623" : biz.plan === "growth" ? "#00C896" : "#6B7280";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginBottom: 24, padding: 0 }}
      >
        <ArrowLeft size={15} /> Back to Admin
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: N, margin: 0 }}>
              {biz.name ?? "Unnamed Business"}
            </h1>
            <button
              onClick={handleImpersonate}
              disabled={impersonating}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
                background: impersonating ? "#D1D5DB" : N,
                color: "#fff", border: "none", cursor: impersonating ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
              }}
            >
              {impersonating ? "Opening…" : "🔑 Access Account"}
            </button>
            <span style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: planBg, color: planColor }}>
              {planLabel}
            </span>
            {biz.status === "active" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "#D1FAE5", color: "#065F46" }}>
                <CheckCircle size={12} /> Active
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "#FEE2E2", color: "#991B1B" }}>
                <AlertCircle size={12} /> {biz.status ?? "Unknown"}
              </span>
            )}
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", marginTop: 6 }}>
            {biz.business_type ?? "Unknown type"} · Joined {fmtDateShort(biz.created_at)} · Last activity {fmtAgo(stats?.lastActivity ?? null)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard icon={Star}      label="Reviews This Month" value={stats?.reviewsThisMonth ?? 0} />
        <StatCard icon={TrendingUp} label="Completion Rate"   value={`${stats?.completionRate ?? 0}%`} color={stats && stats.completionRate >= 50 ? G : RD} />
        <StatCard icon={Users}     label="Total Bookings"     value={stats?.totalBookings ?? 0} />
        <StatCard icon={CheckCircle} label="Total Redirected" value={stats?.totalRedirected ?? 0} color={G} />
      </div>

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

        {/* Contact */}
        <div style={{ background: "#fff", border: `1px solid ${BD}`, borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={16} style={{ color: G }} /> Contact & Account
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Owner"   value={biz.owner_name ?? "-"} />
            <Row label="Email"   value={biz.owner_email ?? "-"} icon={<Mail size={13} style={{ color: "#9CA3AF" }} />} />
            <Row label="Notify"  value={biz.notification_email ?? biz.owner_email ?? "-"} icon={<Phone size={13} style={{ color: "#9CA3AF" }} />} />
            <Row label="Step"    value={biz.onboarding_step === null ? "-" : biz.onboarding_step >= 10 ? "✅ Complete" : `Step ${biz.onboarding_step}/10`} />
            <Row label="GDPR"    value={biz.onboarding_gdpr_accepted ? `Accepted ${biz.onboarding_gdpr_accepted_at ? fmtDateShort(biz.onboarding_gdpr_accepted_at) : ""}` : "⚠️ Not accepted"} />
          </div>
        </div>

        {/* Settings */}
        <div style={{ background: "#fff", border: `1px solid ${BD}`, borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Star size={16} style={{ color: G }} /> Review Settings
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>Google Review Link</span>
              {biz.google_review_link ? (
                <a
                  href={biz.google_review_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontFamily: "Inter, sans-serif", fontSize: 13, color: G, textDecoration: "none", wordBreak: "break-all" }}
                >
                  <ExternalLink size={12} /> {biz.google_review_link.length > 50 ? biz.google_review_link.slice(0, 50) + "…" : biz.google_review_link}
                </a>
              ) : (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: RD, margin: "4px 0 0" }}>⚠️ Not set</p>
              )}
            </div>
            <Row label="Weekly Redirects" value={biz.weekly_google_redirects ?? 0} />
          </div>
        </div>

      </div>

      {/* Bookings table */}
      <div style={{ background: "#fff", border: `1px solid ${BD}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={15} style={{ color: G }} /> Recent Bookings
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 400, color: "#9CA3AF" }}>({bookings.length} total)</span>
          </h3>
          <input
            placeholder="Search by name or status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, color: N, outline: "none", width: 240 }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${BD}` }}>
                {["Customer", "Rating", "Status", "SMS Sent", "Added"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>
                    {search ? "No results found" : "No bookings yet"}
                  </td>
                </tr>
              ) : filtered.map(b => {
                const badge = STATUS_BADGE[b.review_status ?? ""] ?? { label: b.review_status ?? "Unknown", bg: "#F3F4F6", color: "#6B7280" };
                return (
                  <tr key={b.id} style={{ borderBottom: `1px solid #F3F4F6` }}>
                    <td style={{ padding: "11px 16px", fontWeight: 500, color: N }}>
                      {b.customer_name ?? <span style={{ color: "#9CA3AF" }}>Anonymised</span>}
                    </td>
                    <td style={{ padding: "11px 16px", color: b.rating ? AM : "#9CA3AF" }}>
                      {b.rating ? `${"★".repeat(b.rating)}${"☆".repeat(5 - b.rating)}` : "-"}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", color: "#9CA3AF", whiteSpace: "nowrap" }}>
                      {b.sms_sent_at ? fmtDateShort(b.sms_sent_at) : "-"}
                    </td>
                    <td style={{ padding: "11px 16px", color: "#9CA3AF", whiteSpace: "nowrap" }}>
                      {fmtDateShort(b.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
        {icon}{String(value)}
      </p>
    </div>
  );
}
