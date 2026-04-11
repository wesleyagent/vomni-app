"use client";

import { useState, useEffect, useContext } from "react";
import { BusinessContext } from "../_context";
import { db } from "@/lib/db";
import { Plus, Trash2, Check, X, Lock } from "lucide-react";
import { getMaxStaff } from "@/lib/planFeatures";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const MUTED = "#9CA3AF";
const GREY = "#F7F8FA";

const STAFF_COLORS = [
  "#3B82F6", "#00C896", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

interface StaffRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
}

interface ServiceRow {
  id: string;
  name: string;
}

interface StaffService {
  staff_id: string;
  service_id: string;
}

interface StaffInvite {
  id: string;
  staff_id: string;
  email: string;
  status: "pending" | "accepted" | "cancelled";
  created_at: string;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 4px" }}>{title}</h2>
      {subtitle && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 20px" }}>{subtitle}</p>}
      {!subtitle && <div style={{ height: 16 }} />}
      {children}
    </div>
  );
}

export default function TeamPage() {
  const ctx = useContext(BusinessContext);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [bizPlan, setBizPlan] = useState<string | null>(null);

  // Staff
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [staffServices, setStaffServices] = useState<StaffService[]>([]);

  // Add staff form
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffColor, setStaffColor] = useState(STAFF_COLORS[0]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [savingStaff, setSavingStaff] = useState(false);

  // Invites
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteStaffId, setInviteStaffId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (ctx?.businessId) loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.businessId]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadAll() {
    setLoading(true);
    const bizId = ctx!.businessId;

    const [staffRes, svcRes, ssRes, invRes, bizRes] = await Promise.all([
      db.from("staff").select("id, name, email, phone, color, is_active, display_order").eq("business_id", bizId).eq("is_active", true).order("display_order"),
      db.from("services").select("id, name").eq("business_id", bizId).eq("is_active", true).order("display_order"),
      db.from("staff_services").select("staff_id, service_id").eq("business_id", bizId),
      db.from("staff_invites").select("id, staff_id, email, status, created_at").eq("business_id", bizId).order("created_at", { ascending: false }),
      db.from("businesses").select("plan").eq("id", bizId).single(),
    ]);

    setStaff((staffRes.data ?? []) as StaffRow[]);
    setBizPlan((bizRes.data as { plan?: string } | null)?.plan ?? null);
    setServices((svcRes.data ?? []) as ServiceRow[]);
    setStaffServices((ssRes.data ?? []) as StaffService[]);
    setInvites((invRes.data ?? []) as StaffInvite[]);
    setLoading(false);
  }

  function getStaffServices(staffId: string): ServiceRow[] {
    const ids = staffServices.filter(ss => ss.staff_id === staffId).map(ss => ss.service_id);
    return services.filter(s => ids.includes(s.id));
  }

  function openNewStaff() {
    const maxStaff = getMaxStaff(bizPlan);
    if (staff.length >= maxStaff) {
      flash(`Your ${bizPlan ?? "current"} plan allows up to ${maxStaff} staff member${maxStaff === 1 ? "" : "s"}. Upgrade to add more.`);
      return;
    }
    setEditStaffId(null);
    setStaffName(""); setStaffEmail(""); setStaffPhone("");
    setStaffColor(STAFF_COLORS[staff.length % STAFF_COLORS.length]);
    setSelectedServices(services.map(s => s.id)); // Select all by default
    setShowStaffForm(true);
  }

  function openEditStaff(s: StaffRow) {
    setEditStaffId(s.id);
    setStaffName(s.name);
    setStaffEmail(s.email ?? "");
    setStaffPhone(s.phone ?? "");
    setStaffColor(s.color ?? STAFF_COLORS[0]);
    setSelectedServices(getStaffServices(s.id).map(sv => sv.id));
    setShowStaffForm(true);
  }

  async function saveStaff() {
    if (!staffName) return;
    setSavingStaff(true);
    const bizId = ctx!.businessId;

    if (editStaffId) {
      // Optimistic update
      setStaff(prev => prev.map(s => s.id === editStaffId ? { ...s, name: staffName, email: staffEmail || null, phone: staffPhone || null, color: staffColor } : s));
      const { error } = await db.from("staff").update({
        name: staffName, email: staffEmail || null, phone: staffPhone || null, color: staffColor,
      }).eq("id", editStaffId);
      if (!error) {
        // Update staff_services
        await db.from("staff_services").delete().eq("staff_id", editStaffId);
        if (selectedServices.length > 0) {
          await db.from("staff_services").insert(selectedServices.map(svcId => ({ staff_id: editStaffId, service_id: svcId, business_id: bizId })));
        }
        setStaffServices(prev => {
          const filtered = prev.filter(ss => ss.staff_id !== editStaffId);
          return [...filtered, ...selectedServices.map(svcId => ({ staff_id: editStaffId!, service_id: svcId }))];
        });
      }
      if (error) { flash("Failed to update staff member"); loadAll(); }
    } else {
      const tempId = "temp-" + Date.now();
      const newStaff: StaffRow = { id: tempId, name: staffName, email: staffEmail || null, phone: staffPhone || null, color: staffColor, is_active: true, display_order: staff.length };
      setStaff(prev => [...prev, newStaff]);

      const { data, error } = await db.from("staff").insert({
        business_id: bizId, name: staffName, email: staffEmail || null,
        phone: staffPhone || null, color: staffColor, is_active: true, display_order: staff.length,
      }).select("id").single();

      if (error) {
        flash("Failed to add staff member");
        setStaff(prev => prev.filter(s => s.id !== tempId));
      } else {
        setStaff(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s));
        // Insert staff_services
        if (selectedServices.length > 0) {
          await db.from("staff_services").insert(selectedServices.map(svcId => ({ staff_id: data.id, service_id: svcId, business_id: bizId })));
          setStaffServices(prev => [...prev, ...selectedServices.map(svcId => ({ staff_id: data.id, service_id: svcId }))]);
        }
      }
    }

    setShowStaffForm(false);
    setSavingStaff(false);
    flash(editStaffId ? "Staff member updated" : "Staff member added");
  }

  async function removeStaff(id: string) {
    if (!confirm("Remove this team member? They won't be able to receive bookings.")) return;
    // Optimistic update
    setStaff(prev => prev.filter(s => s.id !== id));
    await db.from("staff").update({ is_active: false }).eq("id", id);
    flash("Staff member removed");
  }

  // Invites
  function openInviteForm() {
    const staffWithoutInvite = staff.filter(s => !invites.find(i => i.staff_id === s.id && i.status === "pending"));
    if (staffWithoutInvite.length === 0) {
      flash("All team members already have pending invites");
      return;
    }
    const first = staffWithoutInvite[0];
    setInviteStaffId(first.id);
    setInviteEmail(first.email ?? "");
    setShowInviteForm(true);
  }

  async function sendInvite() {
    if (!inviteStaffId || !inviteEmail) return;
    setSendingInvite(true);
    const res = await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: inviteStaffId, email: inviteEmail, business_id: ctx!.businessId }),
    });
    setSendingInvite(false);
    setShowInviteForm(false);
    if (res.ok) {
      flash("Invite sent!");
      loadAll();
    } else {
      flash("Failed to send invite — please try again");
    }
  }

  async function cancelInvite(id: string) {
    await db.from("staff_invites").update({ status: "cancelled" }).eq("id", id);
    setInvites(prev => prev.filter(i => i.id !== id));
    flash("Invite cancelled");
  }

  const staffWithoutPendingInvite = staff.filter(s => !invites.find(i => i.staff_id === s.id && i.status === "pending"));
  const activeInvites = invites.filter(i => i.status === "pending" || i.status === "accepted");

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 860, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: N, color: "#fff", padding: "12px 24px", borderRadius: 9999,
          fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 100,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={16} color={G} /> {toast}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>Team</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: "4px 0 0" }}>
          Manage your staff and their access
        </p>
      </div>

      {/* ── SECTION 1: Team Members ── */}
      <SectionCard title="Team Members" subtitle="Manage your staff and which services they offer">
        {/* Staff list */}
        {staff.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {staff.map(s => {
              const svcList = getStaffServices(s.id);
              return (
                <div key={s.id} style={{
                  background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`,
                  padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: s.color ?? "#3B82F6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700,
                    fontSize: 18, color: "#fff", flexShrink: 0,
                  }}>
                    {getInitials(s.name)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N }}>
                      {s.name}
                    </div>
                    {s.email && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginTop: 2 }}>{s.email}</div>}
                    {s.phone && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY }}>{s.phone}</div>}
                    {svcList.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {svcList.map(sv => (
                          <span key={sv.id} style={{
                            padding: "3px 10px", borderRadius: 9999,
                            background: `${s.color ?? "#3B82F6"}15`,
                            border: `1px solid ${s.color ?? "#3B82F6"}30`,
                            fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600,
                            color: s.color ?? "#3B82F6",
                          }}>{sv.name}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => openEditStaff(s)}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
                        background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13,
                        fontWeight: 600, color: N, cursor: "pointer",
                      }}
                    >Edit</button>
                    <button
                      onClick={() => removeStaff(s.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 6, display: "flex", alignItems: "center" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {staff.length === 0 && !showStaffForm && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: MUTED, fontFamily: "Inter, sans-serif", fontSize: 14, marginBottom: 16 }}>
            No team members yet. Add your first staff member below.
          </div>
        )}

        {/* Add staff form */}
        {showStaffForm ? (
          <div style={{ background: GREY, borderRadius: 12, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N, margin: "0 0 16px" }}>
              {editStaffId ? "Edit Staff Member" : "Add Team Member"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Name *</label>
                <input
                  value={staffName} onChange={e => setStaffName(e.target.value)}
                  placeholder="e.g. Sarah Cohen"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Email</label>
                <input
                  value={staffEmail} onChange={e => setStaffEmail(e.target.value)}
                  placeholder="sarah@example.com" type="email"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Phone</label>
                <input
                  value={staffPhone} onChange={e => setStaffPhone(e.target.value)}
                  placeholder="+972..."  type="tel"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Colour</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STAFF_COLORS.map(c => (
                    <button
                      key={c} onClick={() => setStaffColor(c)}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: staffColor === c ? `3px solid ${N}` : "none", outlineOffset: 2 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {services.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 10, textTransform: "uppercase" }}>Services</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {services.map(svc => {
                    const checked = selectedServices.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        onClick={() => setSelectedServices(prev => checked ? prev.filter(id => id !== svc.id) : [...prev, svc.id])}
                        style={{
                          padding: "6px 14px", borderRadius: 9999, border: `1.5px solid ${checked ? staffColor : BORDER}`,
                          background: checked ? `${staffColor}15` : "#fff",
                          fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                          color: checked ? staffColor : SECONDARY, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        {checked && <Check size={12} />}{svc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveStaff} disabled={savingStaff || !staffName}
                style={{
                  padding: "10px 20px", borderRadius: 9999, background: !staffName ? "#D1D5DB" : G,
                  color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                  cursor: !staffName ? "default" : "pointer",
                }}
              >
                {savingStaff ? "Saving..." : editStaffId ? "Save Changes" : "Add Member"}
              </button>
              <button
                onClick={() => setShowStaffForm(false)}
                style={{ padding: "10px 16px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer" }}
              >Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={openNewStaff}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 9999, border: `1px dashed ${BORDER}`,
              background: "#fff", color: SECONDARY, fontFamily: "Inter, sans-serif",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {staff.length >= getMaxStaff(bizPlan) ? <Lock size={15} /> : <Plus size={15} />}
            {staff.length >= getMaxStaff(bizPlan) ? "Upgrade to Add More Staff" : "Add Team Member"}
          </button>
        )}
      </SectionCard>

      {/* ── SECTION 2: Invite Staff Login Access ── */}
      <SectionCard title="Invite Staff Login Access" subtitle="Give team members their own login to view their schedule and mark appointments as done">
        <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 18px", marginBottom: 20, border: "1px solid #BBF7D0" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.6 }}>
            Invite team members so they can view their own schedule and mark appointments as done. Each staff member gets their own secure login.
          </p>
        </div>

        {/* Active invites */}
        {activeInvites.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {activeInvites.map(inv => {
              const staffMember = staff.find(s => s.id === inv.staff_id);
              const isAccepted = inv.status === "accepted";
              return (
                <div key={inv.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 12, background: isAccepted ? "#F0FDF4" : GREY,
                  border: `1px solid ${isAccepted ? "#BBF7D0" : BORDER}`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: staffMember?.color ?? "#3B82F6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700,
                    fontSize: 14, color: "#fff", flexShrink: 0,
                  }}>
                    {staffMember ? getInitials(staffMember.name) : "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>
                      {staffMember?.name ?? "Unknown"}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, marginTop: 1 }}>{inv.email}</div>
                  </div>
                  {isAccepted ? (
                    <span style={{
                      padding: "4px 12px", borderRadius: 9999, background: "#D1FAE5",
                      fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#059669",
                    }}>✓ Active</span>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/staff/invite", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ staff_id: inv.staff_id, email: inv.email, business_id: ctx!.businessId }),
                          });
                          if (res.ok) flash("Invite resent!");
                          else flash("Failed to resend invite");
                        }}
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: N, cursor: "pointer" }}
                      >Resend</button>
                      <button
                        onClick={() => cancelInvite(inv.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4, display: "flex", alignItems: "center" }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Invite form */}
        {showInviteForm ? (
          <div style={{ background: GREY, borderRadius: 12, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N, margin: "0 0 16px" }}>
              Invite a Team Member
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Team Member</label>
                <select
                  value={inviteStaffId}
                  onChange={e => {
                    setInviteStaffId(e.target.value);
                    const s = staff.find(st => st.id === e.target.value);
                    setInviteEmail(s?.email ?? "");
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none" }}
                >
                  <option value="">Select staff...</option>
                  {staffWithoutPendingInvite.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Email</label>
                <input
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="staff@example.com" type="email"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={sendInvite} disabled={sendingInvite || !inviteStaffId || !inviteEmail}
                style={{
                  padding: "10px 20px", borderRadius: 9999,
                  background: (!inviteStaffId || !inviteEmail) ? "#D1D5DB" : G,
                  color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                  cursor: (!inviteStaffId || !inviteEmail) ? "default" : "pointer",
                }}
              >
                {sendingInvite ? "Sending..." : "Send Invite"}
              </button>
              <button
                onClick={() => setShowInviteForm(false)}
                style={{ padding: "10px 16px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer" }}
              >Cancel</button>
            </div>
          </div>
        ) : (
          staff.length > 0 ? (
            <button
              onClick={openInviteForm}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 9999, border: `1px dashed ${BORDER}`,
                background: "#fff", color: SECONDARY, fontFamily: "Inter, sans-serif",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Plus size={15} /> Invite a Team Member
            </button>
          ) : (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: MUTED }}>
              Add team members first before sending invites.
            </p>
          )
        )}
      </SectionCard>
    </div>
  );
}
