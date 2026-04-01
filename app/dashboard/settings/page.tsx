"use client";

import { useEffect, useState } from "react";
import { Save, Building2, Bell, Lock, Smartphone, ExternalLink, CheckCircle, ImageIcon, ArrowRight, Users, Download } from "lucide-react";
import { useBusinessContext } from "../_context";
import { db, getMyBusiness, updateBusiness, type DBBusiness } from "@/lib/db";

const G  = "#00C896";
const N  = "#0A0F1E";
const BD = "#E5E7EB";

const inputStyle: React.CSSProperties = {
  width: "100%", border: `1px solid ${BD}`, borderRadius: 10,
  padding: "13px 16px", fontFamily: "Inter, sans-serif", fontSize: 14,
  color: N, outline: "none", boxSizing: "border-box", background: "#fff",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const disabledInputStyle: React.CSSProperties = { ...inputStyle, background: "#F9FAFB", color: "#6B7280" };

const BIZ_TYPES = ["Barbershop", "Hair Salon", "Beauty Salon", "Restaurant", "Dentist", "Tattoo Studio", "Nail Salon", "Spa", "Gym", "Other"];

function SI({ disabled: dis, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} disabled={dis} style={dis ? disabledInputStyle : inputStyle}
      onFocus={e => { if (!dis) { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)"; } }}
      onBlur={e  => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>{label}</label>
      {children}
      {hint && <p style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }}>{hint}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BD}`, padding: 28, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Icon size={20} style={{ color: G }} />
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 600, color: N, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <>
      <style>{`@keyframes toastIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 100, padding: "13px 22px", borderRadius: 12, background: type === "success" ? G : "#EF4444", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", animation: "toastIn 0.25s ease", display: "flex", alignItems: "center", gap: 8 }}>
        {type === "success" ? "✓" : "✕"} {message}
      </div>
    </>
  );
}

export default function SettingsPage() {
  const { businessId, email } = useBusinessContext();

  const [biz,          setBiz]          = useState<DBBusiness | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [name,         setName]         = useState("");
  const [bizType,      setBizType]      = useState("");
  const [ownerName,    setOwnerName]    = useState("");
  const [googleLink,   setGoogleLink]   = useState("");
  const [notifEmail,   setNotifEmail]   = useState("");
  const [googleValid,  setGoogleValid]  = useState<boolean | null>(null);

  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [pwSaving,     setPwSaving]     = useState(false);
  const [pwError,      setPwError]      = useState("");

  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [logoFile,     setLogoFile]     = useState<File | null>(null);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);
  const [logoUploading,setLogoUploading]= useState(false);

  useEffect(() => {
    if (!email) { setLoading(false); return; }
    getMyBusiness(email).then(async data => {
      if (data) {
        setBiz(data);
        setName(data.name ?? "");
        setBizType(data.business_type ?? "");
        setOwnerName(data.owner_name ?? "");
        setGoogleLink(data.google_review_link ?? "");
        setNotifEmail(data.notification_email ?? email);
        setLogoUrl((data as DBBusiness & { logo_url?: string }).logo_url ?? null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [email]);

  useEffect(() => {
    if (!googleLink) { setGoogleValid(null); return; }
    setGoogleValid(googleLink.includes("google.com") || googleLink.includes("g.page"));
  }, [googleLink]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    const ok = await updateBusiness(businessId, {
      name,
      business_type:      bizType,
      owner_name:         ownerName,
      google_review_link: googleLink,
      notification_email: notifEmail,
    });
    showToast(ok ? "Settings saved successfully" : "Failed to save settings", ok ? "success" : "error");
    setSaving(false);
  }

  async function handleLogoUpload(file: File) {
    if (!businessId) return;
    if (file.size > 5 * 1024 * 1024) { showToast("File must be under 5MB", "error"); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("business_id", businessId);
      const { data: { session } } = await db.auth.getSession();
      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: fd,
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setLogoUrl(json.publicUrl);
      setLogoPreview(null);
      setLogoFile(null);
      showToast("Logo updated successfully");
    } catch (err) {
      console.error("Logo upload failed:", err);
      showToast("Failed to upload logo", "error");
    }
    setLogoUploading(false);
  }

  async function handleLogoRemove() {
    if (!businessId) return;
    await db.from("businesses").update({ logo_url: null } as Record<string,unknown>).eq("id", businessId);
    setLogoUrl(null);
    setLogoPreview(null);
    setLogoFile(null);
    showToast("Logo removed");
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwSaving(true);
    const { error } = await db.auth.updateUser({ password: newPw });
    if (error) { setPwError(error.message); }
    else { setCurrentPw(""); setNewPw(""); setConfirmPw(""); showToast("Password updated successfully"); }
    setPwSaving(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const bizDisplayName = name || "Your Business";

  return (
    <div style={{ padding: "32px 32px", maxWidth: 720, margin: "0 auto" }}>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>Settings</h1>
        <p style={{ marginTop: 4, fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>Manage your business details and preferences</p>
      </div>

      {/* Business Details */}
      <form onSubmit={handleSave}>
        <SectionCard icon={Building2} title="Business Details">
          <Field label="Business Name">
            <SI type="text" value={name} onChange={e => setName(e.target.value)} placeholder="King's Cuts London" required />
          </Field>

          <Field label="Business Type">
            <select
              value={bizType}
              onChange={e => setBizType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
              onFocus={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)"; }}
              onBlur={e  => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = "none"; }}
            >
              <option value="">Select type…</option>
              {BIZ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Owner Name">
            <SI type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Marcus Johnson" />
          </Field>

          <Field label="Account Email" hint="Your login email - contact support@vomni.io to change this">
            <SI type="email" value={email} disabled />
          </Field>

          {biz?.plan && (
            <Field label="Plan">
              <div style={{ display: "inline-flex", padding: "8px 16px", borderRadius: 9999, background: "rgba(0,200,150,0.1)", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: G }}>
                {biz.plan.charAt(0).toUpperCase() + biz.plan.slice(1)}
              </div>
            </Field>
          )}

          <Field
            label="Google Review Link"
            hint='Go to your Google Business profile → click "Get more reviews" → copy and paste the link here'
          >
            <div style={{ position: "relative" }}>
              <SI type="url" value={googleLink} onChange={e => setGoogleLink(e.target.value)} placeholder="https://g.page/r/XXXX/review" />
              {googleLink && googleValid !== null && (
                <div style={{ position: "absolute", right: googleLink ? 36 : 12, top: "50%", transform: "translateY(-50%)" }}>
                  {googleValid
                    ? <CheckCircle size={16} style={{ color: G }} />
                    : <span style={{ fontSize: 12, color: "#EF4444", fontFamily: "Inter, sans-serif" }}>Invalid</span>
                  }
                </div>
              )}
              {googleLink && (
                <a href={googleLink} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: G }}>
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </Field>
        </SectionCard>

        {/* Logo */}
        <SectionCard icon={ImageIcon} title="Business Logo">
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: 0 }}>
            Your logo appears on the customer-facing rating page. It makes the experience feel personal.
          </p>

          {(logoPreview || logoUrl) && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src={logoPreview ?? logoUrl!}
                alt="Business logo"
                style={{ height: 64, maxWidth: 160, objectFit: "contain", borderRadius: 8, border: `1px solid ${BD}`, padding: 4, background: "#fff" }}
              />
              {logoUrl && !logoPreview && (
                <button
                  onClick={handleLogoRemove}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#EF4444", background: "none", border: `1px solid #FECACA`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
                >
                  Remove logo
                </button>
              )}
            </div>
          )}

          <label htmlFor="settings-logo-upload" style={{ display: "inline-block", cursor: "pointer" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: `1px solid ${BD}`, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: N, cursor: logoUploading ? "not-allowed" : "pointer" }}>
              {logoUploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
            </div>
            <input
              id="settings-logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLogoFile(file);
                const reader = new FileReader();
                reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
                reader.readAsDataURL(file);
                handleLogoUpload(file);
              }}
            />
          </label>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>PNG, JPG or SVG · Max 2MB</p>
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={Bell} title="Notifications">
          <Field label="Notification Email" hint="Vomni sends an alert to this address whenever a customer leaves negative feedback">
            <SI type="email" value={notifEmail} onChange={e => setNotifEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
        </SectionCard>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <button
            type="submit"
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, background: saving ? "#9CA3AF" : G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
            onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = G; }}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* SMS Preview - Read Only */}
      <SectionCard icon={Smartphone} title="Your Automated Review Request">
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: 0 }}>
          Sent automatically by Vomni&apos;s system 24 hours after each appointment.
        </p>
        {/* Phone mockup */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 260, background: "#F3F4F6", borderRadius: 24, padding: "24px 16px", border: "6px solid #1F2937", position: "relative" }}>
            {/* Notch */}
            <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 60, height: 6, background: "#1F2937", borderRadius: 99 }} />
            <div style={{ background: "#fff", borderRadius: 16, padding: "16px 14px", marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: N, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 12, color: "#fff" }}>V</span>
                </div>
                <div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: N, margin: 0 }}>Vomni</p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#9CA3AF", margin: 0 }}>Text message</p>
                </div>
              </div>
              <div style={{ background: "#F3F4F6", borderRadius: 12, borderTopLeftRadius: 2, padding: "10px 12px" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: N, margin: 0, lineHeight: 1.6 }}>
                  Hi <strong>{bizDisplayName}</strong>, thanks for visiting! How was your experience? Please rate us here: [link] - Reply STOP to opt out
                </p>
              </div>
            </div>
          </div>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", textAlign: "center", margin: "12px 0 0" }}>
          Want to customise this? Contact{" "}
          <a href="mailto:support@vomni.io" style={{ color: G }}>support@vomni.io</a>
        </p>
      </SectionCard>

      {/* Password Change */}
      <form onSubmit={handlePasswordChange} style={{ marginTop: 0 }}>
        <SectionCard icon={Lock} title="Change Password">
          {pwError && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEE2E2", border: "1px solid #FECACA", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#DC2626" }}>
              {pwError}
            </div>
          )}
          <Field label="New Password">
            <SI type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 8 characters" minLength={8} />
          </Field>
          <Field label="Confirm New Password">
            <SI type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
          </Field>
          <div>
            <button
              type="submit"
              disabled={pwSaving || !newPw || !confirmPw}
              style={{ padding: "11px 24px", borderRadius: 10, background: pwSaving || !newPw ? "#9CA3AF" : N, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: pwSaving || !newPw || !confirmPw ? "not-allowed" : "pointer" }}
            >
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </SectionCard>
      </form>

      {/* Switch to Vomni */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BD}`, padding: 28, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <ArrowRight size={20} style={{ color: G }} />
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 600, color: N, margin: 0 }}>Switch to Vomni</h2>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.6 }}>
          Moving from another booking platform? Import your entire client list in minutes — no data lost, no downtime.
        </p>
        <a
          href="/dashboard/switch"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 10, background: G, color: "#fff", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600 }}
        >
          Start migration wizard →
        </a>
      </div>

      {/* Your Data */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BD}`, padding: 28, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Users size={20} style={{ color: G }} />
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 600, color: N, margin: 0 }}>Your Data</h2>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
          Your client data belongs to you. Export it anytime — no restrictions, no hoops to jump through.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {businessId && (
            <a
              href={`/api/migration/export-clients?business_id=${businessId}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1px solid ${BD}`, background: "#fff", color: N, textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}
            >
              <Download size={15} /> Export all clients (CSV)
            </a>
          )}
          <a
            href="/data-ownership"
            target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1px solid #A7F3D0`, background: "#F0FDF9", color: G, textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}
          >
            🔒 Our data promise
          </a>
        </div>
      </div>

      {/* Sign Out */}
      <div style={{ marginTop: 8, padding: 24, borderRadius: 16, border: "1px solid #FEE2E2", background: "#FFF5F5" }}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 600, color: "#DC2626", margin: "0 0 8px" }}>Sign Out</h3>
        <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif", margin: "0 0 16px" }}>You will be redirected to the homepage.</p>
        <button
          onClick={async () => { await db.auth.signOut(); window.location.href = "/"; }}
          style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#fff", color: "#DC2626", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
