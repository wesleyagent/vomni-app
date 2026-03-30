"use client";

import { useState, useEffect, useContext } from "react";
import { BusinessContext } from "../../_context";
import { db } from "@/lib/db";
import { DAY_NAMES_EN } from "@/types/booking";
import { Plus, Trash2, GripVertical, Check, Copy, X } from "lucide-react";

const G = "#00C896";
const GD = "#00A87D";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const MUTED = "#9CA3AF";
const GREY = "#F7F8FA";

interface ServiceRow { id: string; name: string; name_he: string; duration_minutes: number; price: number | null; display_order: number; }
interface StaffRow { id: string; name: string; name_he: string; email: string; phone: string; is_active: boolean; }
interface HourRow { id: string; day_of_week: number; is_open: boolean; open_time: string; close_time: string; }

const DEFAULT_HOURS = [
  { day: 0, open: true,  from: "09:00", to: "18:00" }, // Sunday
  { day: 1, open: true,  from: "09:00", to: "18:00" }, // Monday
  { day: 2, open: true,  from: "09:00", to: "18:00" }, // Tuesday
  { day: 3, open: true,  from: "09:00", to: "18:00" }, // Wednesday
  { day: 4, open: true,  from: "09:00", to: "18:00" }, // Thursday
  { day: 5, open: true,  from: "09:00", to: "14:00" }, // Friday
  { day: 6, open: false, from: "09:00", to: "18:00" }, // Saturday
];

export default function BookingSettingsPage() {
  const ctx = useContext(BusinessContext);
  const [loading, setLoading] = useState(true);

  // Setup wizard state
  const [wizardStep, setWizardStep] = useState(0); // 0 = not in wizard
  const [bookingEnabled, setBookingEnabled] = useState(false);

  // Business hours
  const [hours, setHours] = useState(DEFAULT_HOURS.map(h => ({ ...h })));

  // Services
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcNameHe, setSvcNameHe] = useState("");
  const [svcDuration, setSvcDuration] = useState(30);
  const [svcPrice, setSvcPrice] = useState("");
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);

  // Staff
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffNameHe, setStaffNameHe] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");

  // Slug
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Settings
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [advanceDays, setAdvanceDays] = useState(30);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [confirmationMsgHe, setConfirmationMsgHe] = useState("");
  const [bookingPaused, setBookingPaused] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [calendarToken, setCalendarToken] = useState("");

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slugDebounce, setSlugDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ctx?.businessId) loadData();
  }, [ctx?.businessId]);

  async function loadData() {
    setLoading(true);
    const bizId = ctx!.businessId;

    // Load business booking settings
    const { data: biz } = await db
      .from("businesses")
      .select("booking_slug, booking_enabled, booking_buffer_minutes, booking_advance_days, booking_cancellation_hours, booking_confirmation_message, booking_confirmation_message_he, whatsapp_enabled, google_maps_url, instagram_handle, calendar_token")
      .eq("id", bizId)
      .single();

    if (biz) {
      setBookingEnabled(biz.booking_enabled ?? false);
      setSlug(biz.booking_slug ?? "");
      setBufferMinutes(biz.booking_buffer_minutes ?? 0);
      setAdvanceDays(biz.booking_advance_days ?? 30);
      setCancellationHours(biz.booking_cancellation_hours ?? 24);
      setConfirmationMsg(biz.booking_confirmation_message ?? "");
      setConfirmationMsgHe(biz.booking_confirmation_message_he ?? "");
      setWhatsappEnabled(biz.whatsapp_enabled ?? false);
      setGoogleMapsUrl(biz.google_maps_url ?? "");
      setInstagramHandle(biz.instagram_handle ?? "");
      setCalendarToken(biz.calendar_token ?? "");

      if (!biz.booking_enabled) {
        setWizardStep(1);
      }
    }

    // Load hours
    const { data: hoursData } = await db
      .from("business_hours")
      .select("id, day_of_week, is_open, open_time, close_time")
      .eq("business_id", bizId)
      .order("day_of_week");

    if (hoursData && hoursData.length > 0) {
      setHours(hoursData.map((h: HourRow) => ({
        day: h.day_of_week,
        open: h.is_open,
        from: h.open_time.substring(0, 5),
        to: h.close_time.substring(0, 5),
      })));
    }

    // Load services
    const { data: svcData } = await db
      .from("services")
      .select("id, name, name_he, duration_minutes, price, display_order")
      .eq("business_id", bizId)
      .eq("is_active", true)
      .order("display_order");
    setServices((svcData ?? []) as ServiceRow[]);

    // Load staff
    const { data: staffData } = await db
      .from("staff")
      .select("id, name, name_he, email, phone, is_active")
      .eq("business_id", bizId)
      .eq("is_active", true);
    setStaffList((staffData ?? []) as StaffRow[]);

    setLoading(false);
  }

  async function saveHours() {
    setSaving(true);
    const bizId = ctx!.businessId;

    // Delete existing and re-insert
    await db.from("business_hours").delete().eq("business_id", bizId);
    await db.from("business_hours").insert(
      hours.map(h => ({
        business_id: bizId,
        day_of_week: h.day,
        is_open: h.open,
        open_time: h.from,
        close_time: h.to,
      }))
    );
    setSaving(false);
  }

  async function addService() {
    if (!svcName) return;
    setSaving(true);
    const bizId = ctx!.businessId;

    if (editingSvcId) {
      const { error } = await db.from("services").update({
        name: svcName, name_he: svcNameHe || null,
        duration_minutes: svcDuration, price: svcPrice ? parseFloat(svcPrice) : null,
      }).eq("id", editingSvcId);
      if (error) { console.error(error); alert("Failed to save: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await db.from("services").insert({
        business_id: bizId, name: svcName, name_he: svcNameHe || null,
        duration_minutes: svcDuration, price: svcPrice ? parseFloat(svcPrice) : null,
        display_order: services.length, is_active: true,
      });
      if (error) { console.error(error); alert("Failed to save: " + error.message); setSaving(false); return; }
    }

    setShowServiceForm(false);
    setSvcName(""); setSvcNameHe(""); setSvcDuration(30); setSvcPrice(""); setEditingSvcId(null);
    setSaving(false);
    loadData();
  }

  async function deleteService(id: string) {
    await db.from("services").update({ is_active: false }).eq("id", id);
    loadData();
  }

  async function addStaff() {
    if (!staffName) return;
    setSaving(true);
    const bizId = ctx!.businessId;

    const { data: newStaff, error: staffErr } = await db.from("staff").insert({
      business_id: bizId, name: staffName, name_he: staffNameHe || null,
      email: staffEmail || null, phone: staffPhone || null,
      is_active: true, display_order: staffList.length,
    }).select("id").single();
    if (staffErr) { console.error(staffErr); alert("Failed to save: " + staffErr.message); setSaving(false); return; }

    // Assign all services to this staff member
    if (newStaff) {
      const assignments = services.map(s => ({ staff_id: newStaff.id, service_id: s.id }));
      if (assignments.length > 0) {
        await db.from("staff_services").insert(assignments);
      }
    }

    setShowStaffForm(false);
    setStaffName(""); setStaffNameHe(""); setStaffEmail(""); setStaffPhone("");
    setSaving(false);
    loadData();
  }

  async function removeStaff(id: string) {
    await db.from("staff").update({ is_active: false }).eq("id", id);
    loadData();
  }

  async function checkSlugAvailability(value?: string) {
    const check = value ?? slug;
    if (!check) return;
    setCheckingSlug(true);
    const { data } = await db
      .from("businesses")
      .select("id")
      .eq("booking_slug", check)
      .neq("id", ctx!.businessId);
    setSlugAvailable(!data || data.length === 0);
    setCheckingSlug(false);
  }

  function onSlugChange(val: string) {
    // Only allow lowercase letters, numbers, hyphens
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(clean);
    setSlugAvailable(null);
    if (slugDebounce) clearTimeout(slugDebounce);
    if (clean.length >= 3) {
      const t = setTimeout(() => checkSlugAvailability(clean), 600);
      setSlugDebounce(t);
    }
  }

  async function generateCalendarToken() {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    setCalendarToken(token);
    await db.from("businesses").update({ calendar_token: token }).eq("id", ctx!.businessId);
  }

  async function saveSlugAndEnable() {
    setSaving(true);
    const bizId = ctx!.businessId;
    await db.from("businesses").update({
      booking_slug: slug,
      booking_enabled: true,
    }).eq("id", bizId);
    setBookingEnabled(true);
    setWizardStep(0);
    setSaving(false);
  }

  async function saveSettings() {
    setSaving(true);
    await db.from("businesses").update({
      booking_buffer_minutes: bufferMinutes,
      booking_advance_days: advanceDays,
      booking_cancellation_hours: cancellationHours,
      booking_confirmation_message: confirmationMsg || null,
      booking_confirmation_message_he: confirmationMsgHe || null,
      booking_enabled: !bookingPaused,
      whatsapp_enabled: whatsappEnabled,
      google_maps_url: googleMapsUrl || null,
      instagram_handle: instagramHandle || null,
    }).eq("id", ctx!.businessId);
    setSaving(false);
  }

  function copyBookingUrl() {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const bookingUrl = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${slug}` : "";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── SETUP WIZARD ──
  if (wizardStep > 0 && !bookingEnabled) {
    return (
      <div style={{ padding: "32px 40px", maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, margin: "0 0 8px" }}>
          Set Up Your Booking Page
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY, margin: "0 0 32px" }}>
          You&apos;re almost live! Set up your booking page and customers can start booking directly — no more phone calls.
        </p>

        {/* Progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3, 4].map(step => (
            <div key={step} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: wizardStep >= step ? G : "#E5E7EB",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Step 1: Hours */}
        {wizardStep === 1 && (
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: "0 0 20px" }}>
              Business Hours
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {hours.map((h, i) => (
                <div key={h.day} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`,
                }}>
                  <label style={{
                    display: "flex", alignItems: "center", gap: 8, width: 120,
                    fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: N,
                  }}>
                    <input
                      type="checkbox" checked={h.open}
                      onChange={e => { const next = [...hours]; next[i].open = e.target.checked; setHours(next); }}
                      style={{ width: 18, height: 18, accentColor: G }}
                    />
                    {DAY_NAMES_EN[h.day]}
                  </label>
                  {h.open && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <input
                        type="time" value={h.from}
                        onChange={e => { const next = [...hours]; next[i].from = e.target.value; setHours(next); }}
                        style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }}
                      />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>to</span>
                      <input
                        type="time" value={h.to}
                        onChange={e => { const next = [...hours]; next[i].to = e.target.value; setHours(next); }}
                        style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }}
                      />
                    </div>
                  )}
                  {!h.open && (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>Closed</span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={async () => { await saveHours(); setWizardStep(2); }}
              disabled={saving}
              style={{
                marginTop: 24, padding: "14px 32px", borderRadius: 9999,
                background: G, color: "#fff", border: "none",
                fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700,
                cursor: "pointer",
              }}
            >Continue</button>
          </div>
        )}

        {/* Step 2: Services */}
        {wizardStep === 2 && (
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: "0 0 20px" }}>
              Your Services
            </h2>

            {services.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {services.map(svc => (
                  <div key={svc.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`,
                  }}>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{svc.name}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>
                        {svc.duration_minutes} min{svc.price ? ` · ₪${svc.price}` : ""}
                      </div>
                    </div>
                    <button onClick={() => deleteService(svc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showServiceForm ? (
              <div style={{ background: GREY, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Service name (English)" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
                  <input value={svcNameHe} onChange={e => setSvcNameHe(e.target.value)} placeholder="שם השירות (עברית)" dir="rtl" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <select value={svcDuration} onChange={e => setSvcDuration(Number(e.target.value))} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}>
                    {[15, 20, 30, 45, 60, 75, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                  <input value={svcPrice} onChange={e => setSvcPrice(e.target.value)} placeholder="Price (₪)" type="number" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addService} disabled={!svcName || saving} style={{ padding: "10px 20px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {editingSvcId ? "Update" : "Add Service"}
                  </button>
                  <button onClick={() => { setShowServiceForm(false); setEditingSvcId(null); }} style={{ padding: "10px 20px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowServiceForm(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
                  borderRadius: 12, border: `1px dashed ${BORDER}`, background: "#fff",
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: SECONDARY,
                  cursor: "pointer", width: "100%", justifyContent: "center",
                }}
              >
                <Plus size={16} /> Add a service
              </button>
            )}

            <button
              onClick={() => setWizardStep(3)}
              disabled={services.length === 0}
              style={{
                marginTop: 24, padding: "14px 32px", borderRadius: 9999,
                background: services.length === 0 ? "#D1D5DB" : G, color: "#fff", border: "none",
                fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700,
                cursor: services.length === 0 ? "default" : "pointer",
              }}
            >Continue</button>
          </div>
        )}

        {/* Step 3: Staff */}
        {wizardStep === 3 && (
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: "0 0 8px" }}>
              Staff Members
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: "0 0 20px" }}>
              Skip this step if you work alone — we&apos;ll set you up as the only staff member.
            </p>

            {staffList.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {staffList.map(s => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: G, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 14,
                      }}>{s.name[0]}</div>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{s.name}</span>
                    </div>
                    <button onClick={() => removeStaff(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showStaffForm ? (
              <div style={{ background: GREY, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Name (English)" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
                  <input value={staffNameHe} onChange={e => setStaffNameHe(e.target.value)} placeholder="שם (עברית)" dir="rtl" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <input value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder="Email (optional)" type="email" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
                  <input value={staffPhone} onChange={e => setStaffPhone(e.target.value)} placeholder="Phone (optional)" type="tel" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addStaff} disabled={!staffName || saving} style={{ padding: "10px 20px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Add Staff
                  </button>
                  <button onClick={() => setShowStaffForm(false)} style={{ padding: "10px 20px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowStaffForm(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
                  borderRadius: 12, border: `1px dashed ${BORDER}`, background: "#fff",
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: SECONDARY,
                  cursor: "pointer", width: "100%", justifyContent: "center",
                }}
              >
                <Plus size={16} /> Add a staff member
              </button>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setWizardStep(4)}
                style={{
                  padding: "14px 32px", borderRadius: 9999,
                  background: G, color: "#fff", border: "none",
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700,
                  cursor: "pointer",
                }}
              >{staffList.length === 0 ? "Skip — I work alone" : "Continue"}</button>
            </div>
          </div>
        )}

        {/* Step 4: Slug + Enable */}
        {wizardStep === 4 && (
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: "0 0 8px" }}>
              Your Booking URL
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: "0 0 20px" }}>
              Choose a short, memorable URL for your booking page.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: MUTED }}>vomni.io/book/</span>
              <input
                value={slug}
                onChange={e => onSlugChange(e.target.value)}
                placeholder="your-business"
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${slugAvailable === true ? G : slugAvailable === false ? "#EF4444" : BORDER}`,
                  fontFamily: "Inter, sans-serif", fontSize: 15, color: N, outline: "none",
                }}
              />
              {checkingSlug && <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>Checking...</span>}
              {slugAvailable === true && <Check size={20} color={G} />}
              {slugAvailable === false && <X size={20} color="#EF4444" />}
            </div>
            {slugAvailable === true && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: G, margin: "0 0 4px" }}>✓ This URL is available!</p>
            )}
            {slugAvailable === false && (
              <div style={{ margin: "0 0 16px" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", margin: "0 0 6px" }}>This URL is taken. Try one of these:</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[`${slug}hq`, `${slug}il`, `${slug}2`].map(s => (
                    <button key={s} onClick={() => onSlugChange(s)} style={{ background: GREY, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "4px 10px", fontFamily: "Inter, sans-serif", fontSize: 12, color: N, cursor: "pointer" }}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={saveSlugAndEnable}
              disabled={!slug || slugAvailable === false || saving}
              style={{
                marginTop: 24, padding: "14px 32px", borderRadius: 9999,
                background: (!slug || slugAvailable === false) ? "#D1D5DB" : G,
                color: "#fff", border: "none",
                fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700,
                cursor: (!slug || slugAvailable === false) ? "default" : "pointer",
              }}
            >
              {saving ? "Enabling..." : "Enable Booking Page"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── ONGOING SETTINGS (booking is enabled) ──
  return (
    <div style={{ padding: "32px 40px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, margin: 0 }}>
            Booking Settings
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: "4px 0 0" }}>
            Manage your booking page, services, and staff
          </p>
        </div>
        {/* Booking URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>{bookingUrl}</span>
          <button onClick={copyBookingUrl} style={{
            background: GREY, border: "none", borderRadius: 8, padding: "6px 12px",
            fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: N,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Pause toggle */}
        <div style={{
          background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 600, color: N }}>
              Booking Page Status
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginTop: 2 }}>
              {bookingPaused ? "New bookings are paused" : "Accepting new bookings"}
            </div>
          </div>
          <button
            onClick={() => { setBookingPaused(!bookingPaused); }}
            style={{
              padding: "8px 20px", borderRadius: 9999, border: "none",
              background: bookingPaused ? "#FEE2E2" : `${G}15`,
              color: bookingPaused ? "#EF4444" : G,
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {bookingPaused ? "Paused" : "Active"}
          </button>
        </div>

        {/* Business Hours */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 16px" }}>
            Business Hours
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hours.map((h, i) => (
              <div key={h.day} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, width: 120, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: N }}>
                  <input type="checkbox" checked={h.open} onChange={e => { const next = [...hours]; next[i].open = e.target.checked; setHours(next); }} style={{ accentColor: G }} />
                  {DAY_NAMES_EN[h.day]}
                </label>
                {h.open ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="time" value={h.from} onChange={e => { const next = [...hours]; next[i].from = e.target.value; setHours(next); }} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }} />
                    <span style={{ color: MUTED, fontSize: 13 }}>to</span>
                    <input type="time" value={h.to} onChange={e => { const next = [...hours]; next[i].to = e.target.value; setHours(next); }} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }} />
                  </div>
                ) : <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>Closed</span>}
              </div>
            ))}
          </div>
          <button onClick={saveHours} disabled={saving} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Hours"}
          </button>
        </div>

        {/* Services */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>
              Services
            </h2>
            <button
              onClick={() => { setShowServiceForm(true); setEditingSvcId(null); setSvcName(""); setSvcNameHe(""); setSvcDuration(30); setSvcPrice(""); }}
              style={{ background: G, color: "#fff", border: "none", borderRadius: 9999, padding: "6px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            ><Plus size={14} /> Add</button>
          </div>
          {services.map(svc => (
            <div key={svc.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8,
            }}>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{svc.name}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>{svc.duration_minutes} min{svc.price ? ` · ₪${svc.price}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setEditingSvcId(svc.id); setSvcName(svc.name); setSvcNameHe(svc.name_he ?? ""); setSvcDuration(svc.duration_minutes); setSvcPrice(svc.price?.toString() ?? ""); setShowServiceForm(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: SECONDARY, fontFamily: "Inter, sans-serif", fontSize: 12 }}>Edit</button>
                <button onClick={() => deleteService(svc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {showServiceForm && (
            <div style={{ background: GREY, borderRadius: 12, padding: 16, marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Service name" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }} />
                <input value={svcNameHe} onChange={e => setSvcNameHe(e.target.value)} placeholder="שם (עברית)" dir="rtl" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <select value={svcDuration} onChange={e => setSvcDuration(Number(e.target.value))} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }}>
                  {[15, 20, 30, 45, 60, 75, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
                <input value={svcPrice} onChange={e => setSvcPrice(e.target.value)} placeholder="Price (₪)" type="number" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addService} disabled={!svcName} style={{ padding: "8px 16px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editingSvcId ? "Update" : "Add"}</button>
                <button onClick={() => setShowServiceForm(false)} style={{ padding: "8px 16px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Staff */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: 0 }}>Staff</h2>
            <button onClick={() => setShowStaffForm(true)} style={{ background: G, color: "#fff", border: "none", borderRadius: 9999, padding: "6px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Plus size={14} /> Add
            </button>
          </div>
          {staffList.length === 0 ? (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>No staff members — solo mode</p>
          ) : (
            staffList.map(s => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: G, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{s.name[0]}</div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{s.name}</span>
                </div>
                <button onClick={() => removeStaff(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}><Trash2 size={14} /></button>
              </div>
            ))
          )}
          {showStaffForm && (
            <div style={{ background: GREY, borderRadius: 12, padding: 16, marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <input value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Name" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }} />
                <input value={staffNameHe} onChange={e => setStaffNameHe(e.target.value)} placeholder="שם (עברית)" dir="rtl" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addStaff} disabled={!staffName} style={{ padding: "8px 16px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
                <button onClick={() => setShowStaffForm(false)} style={{ padding: "8px 16px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Booking preferences */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 16px" }}>
            Booking Preferences
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>Buffer between appointments</label>
              <select value={bufferMinutes} onChange={e => setBufferMinutes(Number(e.target.value))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}>
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>Advance booking window</label>
              <select value={advanceDays} onChange={e => setAdvanceDays(Number(e.target.value))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}>
                {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>Cancellation policy</label>
              <select value={cancellationHours} onChange={e => setCancellationHours(Number(e.target.value))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}>
                {[2, 4, 6, 12, 24, 48].map(h => <option key={h} value={h}>{h} hours notice</option>)}
              </select>
            </div>
          </div>

          {/* WhatsApp toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "16px 18px", borderRadius: 12, background: whatsappEnabled ? "rgba(37,211,102,0.06)" : GREY, border: `1px solid ${whatsappEnabled ? "rgba(37,211,102,0.3)" : BORDER}` }}>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>WhatsApp Confirmations</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, marginTop: 2 }}>Send confirmation &amp; reminder via WhatsApp instead of SMS</div>
            </div>
            <button
              onClick={() => setWhatsappEnabled(!whatsappEnabled)}
              style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: whatsappEnabled ? "#25D366" : "#D1D5DB", position: "relative", transition: "background 0.2s" }}
            >
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: whatsappEnabled ? 23 : 3, transition: "left 0.2s" }} />
            </button>
          </div>

          <button onClick={saveSettings} disabled={saving} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Get More Bookings */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 6px" }}>
            Get More Bookings
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 20px" }}>
            Share your booking page everywhere customers can find you.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Booking URL */}
            <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18 }}>🔗</span>
                </div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Booking Link</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>{bookingUrl || "Set a slug above to get your link"}</div>
                </div>
              </div>
              {slug && <button onClick={copyBookingUrl} style={{ background: GREY, border: "none", borderRadius: 8, padding: "6px 12px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: N, cursor: "pointer" }}>
                {copied ? "Copied!" : "Copy"}
              </button>}
            </div>

            {/* Google Maps */}
            <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: googleMapsUrl ? 10 : 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Google Business Profile</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>Add your booking link to your Google Maps listing</div>
                </div>
              </div>
              <input
                value={googleMapsUrl}
                onChange={e => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Instagram */}
            <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18 }}>📸</span>
                </div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Instagram Bio Link</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>Put your booking URL in your Instagram bio</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, lineHeight: "36px" }}>@</span>
                <input
                  value={instagramHandle}
                  onChange={e => setInstagramHandle(e.target.value.replace(/^@/, ""))}
                  placeholder="yourbusiness"
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }}
                />
              </div>
            </div>

            {/* WhatsApp share */}
            <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E8F8EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18 }}>💬</span>
                </div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Share via WhatsApp</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>Send your booking link directly to customers</div>
                </div>
              </div>
              {slug && <a
                href={`https://wa.me/?text=${encodeURIComponent(`Book an appointment: ${bookingUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 9999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
              >Share</a>}
            </div>

            {/* Calendar feed (ICS) */}
            <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: calendarToken ? 10 : 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18 }}>📅</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Calendar Sync (iCal)</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED }}>Subscribe to your bookings in Google Calendar or Apple Calendar</div>
                </div>
                {!calendarToken && <button onClick={generateCalendarToken} style={{ background: GREY, border: "none", borderRadius: 8, padding: "6px 12px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: N, cursor: "pointer" }}>Enable</button>}
              </div>
              {calendarToken && slug && (
                <div style={{ background: GREY, borderRadius: 8, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 11, color: SECONDARY, wordBreak: "break-all" }}>
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/api/booking/${slug}/calendar.ics?token=${calendarToken}`}
                </div>
              )}
            </div>

          </div>
          <button onClick={saveSettings} disabled={saving} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 9999, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}
