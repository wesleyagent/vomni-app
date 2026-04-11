"use client";

import { useState, useEffect, useContext } from "react";
import { BusinessContext } from "../../_context";
import { db } from "@/lib/db";
import { currencySymbol } from "@/lib/currencyUtils";
import { Plus, Trash2, Copy, Check, ExternalLink, Link as LinkIcon } from "lucide-react";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const MUTED = "#9CA3AF";
const GREY = "#F7F8FA";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ServiceRow {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  display_order: number;
  color: string | null;
}

interface HourRow {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface BlockedTime {
  id: string;
  label: string | null;
  date: string | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  day_of_week: number | null;
}

const DEFAULT_HOURS: HourRow[] = [
  { day_of_week: 0, is_open: true,  open_time: "09:00", close_time: "18:00" },
  { day_of_week: 1, is_open: true,  open_time: "09:00", close_time: "18:00" },
  { day_of_week: 2, is_open: true,  open_time: "09:00", close_time: "18:00" },
  { day_of_week: 3, is_open: true,  open_time: "09:00", close_time: "18:00" },
  { day_of_week: 4, is_open: true,  open_time: "09:00", close_time: "18:00" },
  { day_of_week: 5, is_open: true,  open_time: "09:00", close_time: "14:00" },
  { day_of_week: 6, is_open: false, open_time: "09:00", close_time: "18:00" },
];

const SERVICE_COLORS = ["#00C896","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316"];

function inputStyle(focused = false): React.CSSProperties {
  return {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${focused ? G : BORDER}`,
    boxShadow: focused ? "0 0 0 3px rgba(0,200,150,0.12)" : "none",
    fontFamily: "Inter, sans-serif", fontSize: 14, color: N,
    outline: "none", boxSizing: "border-box", background: "#fff",
  };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 20px" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function CalendarSettingsPage() {
  const ctx = useContext(BusinessContext);
  const sym = currencySymbol(ctx?.currency ?? "ILS");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);

  // Booking link
  const [bookingSlug, setBookingSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const [pageOrigin, setPageOrigin] = useState("");

  // Working hours
  const [hours, setHours] = useState<HourRow[]>(DEFAULT_HOURS.map(h => ({ ...h })));
  const [savingHours, setSavingHours] = useState(false);

  // Services
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editSvcId, setEditSvcId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState(30);
  const [svcPrice, setSvcPrice] = useState("");
  const [svcColor, setSvcColor] = useState(SERVICE_COLORS[0]);
  const [savingSvc, setSavingSvc] = useState(false);

  // Blocked times
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockLabel, setBlockLabel] = useState("Lunch break");
  const [blockStartTime, setBlockStartTime] = useState("13:00");
  const [blockEndTime, setBlockEndTime] = useState("14:00");
  const [blockIsRecurring, setBlockIsRecurring] = useState(true);
  const [blockDayOfWeek, setBlockDayOfWeek] = useState<number | null>(null); // null = all days
  const [blockDate, setBlockDate] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);

  // Calendar feed (iCal)
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [feedCopied, setFeedCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [waitlistToast, setWaitlistToast] = useState(false);

  // Google Calendar two-way sync
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState<string | null>(null);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  // Microsoft Calendar two-way sync
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftCalendarId, setMicrosoftCalendarId] = useState<string | null>(null);
  const [disconnectingMicrosoft, setDisconnectingMicrosoft] = useState(false);

  useEffect(() => {
    setPageOrigin(window.location.origin);
    if (ctx?.businessId) loadAll();
  }, [ctx?.businessId]);

  async function loadAll() {
    setLoading(true);
    const bizId = ctx!.businessId;

    // Business info
    const { data: biz } = await db.from("businesses")
      .select("booking_slug, calendar_token")
      .eq("id", bizId).single();
    if (biz) {
      setBookingSlug(biz.booking_slug ?? "");
      setCalendarToken(biz.calendar_token ?? null);
    }

    // Hours
    const { data: hoursData } = await db.from("business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("business_id", bizId)
      .order("day_of_week");
    if (hoursData && hoursData.length > 0) {
      const merged = DEFAULT_HOURS.map(def => {
        const found = hoursData.find(h => h.day_of_week === def.day_of_week);
        return found ? { day_of_week: found.day_of_week, is_open: found.is_open, open_time: found.open_time, close_time: found.close_time } : def;
      });
      setHours(merged);
    }

    // Services
    const { data: svcData } = await db.from("services")
      .select("id, name, duration_minutes, price, is_active, display_order, color")
      .eq("business_id", bizId)
      .order("display_order");
    setServices((svcData ?? []) as ServiceRow[]);

    // Blocked times
    const { data: blockedData } = await db.from("blocked_times")
      .select("id, label, date, start_time, end_time, is_recurring, day_of_week")
      .eq("business_id", bizId)
      .order("start_time");
    setBlockedTimes((blockedData ?? []) as BlockedTime[]);

    // Google Calendar connection status
    try {
      const res = await fetch(`/api/calendar/google/status?business_id=${bizId}`);
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected ?? false);
        setGoogleCalendarId(data.calendar_id ?? null);
      }
    } catch {}

    // Microsoft Calendar connection status
    try {
      const res = await fetch(`/api/calendar/microsoft/status?business_id=${bizId}`);
      if (res.ok) {
        const data = await res.json();
        setMicrosoftConnected(data.connected ?? false);
        setMicrosoftCalendarId(data.calendar_id ?? null);
      }
    } catch {}

    // Check URL params for OAuth result
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("calendar_connected") === "google") {
        flash("Google Calendar connected!");
        window.history.replaceState({}, "", window.location.pathname);
        setGoogleConnected(true);
      } else if (params.get("calendar_connected") === "microsoft") {
        flash("Microsoft Calendar connected!");
        window.history.replaceState({}, "", window.location.pathname);
        setMicrosoftConnected(true);
      } else if (params.get("calendar_error")) {
        flash("Error: " + params.get("calendar_error"));
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    setLoading(false);
  }

  async function disconnectGoogle() {
    setDisconnectingGoogle(true);
    await fetch(`/api/calendar/google/status?business_id=${ctx!.businessId}`, { method: "DELETE" });
    setGoogleConnected(false);
    setGoogleCalendarId(null);
    setDisconnectingGoogle(false);
    flash("Google Calendar disconnected");
  }

  async function disconnectMicrosoft() {
    setDisconnectingMicrosoft(true);
    await fetch(`/api/calendar/microsoft/status?business_id=${ctx!.businessId}`, { method: "DELETE" });
    setMicrosoftConnected(false);
    setMicrosoftCalendarId(null);
    setDisconnectingMicrosoft(false);
    flash("Microsoft Calendar disconnected");
  }

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2500);
  }

  // ── Working hours ──────────────────────────────────────────────────────────
  async function saveHours() {
    setSavingHours(true);
    const bizId = ctx!.businessId;
    try {
      const res = await fetch("/api/business-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: bizId, hours }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash("Failed to save hours: " + (data.error ?? res.statusText));
      } else {
        flash("Working hours saved");
      }
    } catch (err) {
      flash("Failed to save hours");
    } finally {
      setSavingHours(false);
    }
  }

  function updateHour(day: number, field: keyof HourRow, value: boolean | string) {
    setHours(prev => prev.map(h => h.day_of_week === day ? { ...h, [field]: value } : h));
  }

  // ── Services ───────────────────────────────────────────────────────────────
  function openNewSvc() {
    setEditSvcId(null); setSvcName(""); setSvcDuration(30); setSvcPrice(""); setSvcColor(SERVICE_COLORS[0]);
    setShowSvcForm(true);
  }

  function openEditSvc(s: ServiceRow) {
    setEditSvcId(s.id); setSvcName(s.name); setSvcDuration(s.duration_minutes);
    setSvcPrice(s.price != null ? String(s.price) : ""); setSvcColor(s.color ?? SERVICE_COLORS[0]);
    setShowSvcForm(true);
  }

  async function saveSvc() {
    if (!svcName) return;
    setSavingSvc(true);
    const bizId = ctx!.businessId;
    const display_order = editSvcId ? services.find(s => s.id === editSvcId)?.display_order ?? 0 : services.length;

    if (editSvcId) {
      setServices(prev => prev.map(s => s.id === editSvcId ? {
        ...s, name: svcName, duration_minutes: svcDuration,
        price: svcPrice ? parseFloat(svcPrice) : null, color: svcColor,
      } : s));
      try {
        const res = await fetch("/api/services", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editSvcId, name: svcName, duration_minutes: svcDuration,
            price: svcPrice ? parseFloat(svcPrice) : null, is_active: true,
            color: svcColor, display_order,
          }),
        });
        if (!res.ok) { flash("Failed to update service"); loadAll(); }
        else flash("Service updated");
      } catch { flash("Failed to update service"); loadAll(); }
    } else {
      const tempId = "temp-" + Date.now();
      setServices(prev => [...prev, {
        id: tempId, name: svcName, duration_minutes: svcDuration,
        price: svcPrice ? parseFloat(svcPrice) : null, is_active: true,
        color: svcColor, display_order,
      } as ServiceRow]);
      try {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: bizId, name: svcName, duration_minutes: svcDuration,
            price: svcPrice ? parseFloat(svcPrice) : null, is_active: true,
            color: svcColor, display_order,
          }),
        });
        if (!res.ok) { flash("Failed to add service"); setServices(prev => prev.filter(s => s.id !== tempId)); }
        else {
          const data = await res.json();
          setServices(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s));
          flash("Service added");
        }
      } catch { flash("Failed to add service"); setServices(prev => prev.filter(s => s.id !== tempId)); }
    }

    setShowSvcForm(false);
    setSavingSvc(false);
  }

  async function toggleSvc(id: string, active: boolean) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !active } : s));
    try {
      const res = await fetch("/api/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !active }),
      });
      if (!res.ok) { flash("Failed to update service"); loadAll(); }
    } catch { flash("Failed to update service"); loadAll(); }
  }

  async function deleteSvc(id: string) {
    if (!confirm("Delete this service? This won't affect existing bookings.")) return;
    setServices(prev => prev.filter(s => s.id !== id));
    try {
      await fetch(`/api/services?id=${id}`, { method: "DELETE" });
    } catch { flash("Failed to delete service"); loadAll(); }
  }

  // ── Blocked times ──────────────────────────────────────────────────────────
  async function saveBlock() {
    setSavingBlock(true);
    const bizId = ctx!.businessId;
    try {
      const res = await fetch("/api/blocked-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: bizId,
          label: blockLabel || null,
          start_time: blockStartTime,
          end_time: blockEndTime,
          is_recurring: blockIsRecurring,
          day_of_week: blockIsRecurring ? blockDayOfWeek : null,
          date: !blockIsRecurring && blockDate ? blockDate : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash("Failed to save: " + (data.error ?? res.statusText));
        setSavingBlock(false);
        return;
      }
      setShowBlockForm(false);
      setBlockLabel("Lunch break"); setBlockStartTime("13:00"); setBlockEndTime("14:00");
      setBlockIsRecurring(true); setBlockDayOfWeek(null); setBlockDate("");
      flash("Time block added");
      loadAll();
    } catch {
      flash("Failed to save blocked time");
    } finally {
      setSavingBlock(false);
    }
  }

  async function deleteBlock(id: string) {
    await fetch(`/api/blocked-times?id=${id}`, { method: "DELETE" });
    loadAll();
  }

  // ── Calendar Token ─────────────────────────────────────────────────────────
  async function generateCalendarToken() {
    setGeneratingToken(true);
    const token = crypto.randomUUID().replace(/-/g, "");
    try {
      const res = await fetch("/api/business-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: ctx!.businessId, calendar_token: token }),
      });
      if (res.ok) {
        setCalendarToken(token);
        flash("Calendar token generated");
      } else {
        flash("Failed to generate token");
      }
    } catch {
      flash("Failed to generate token");
    } finally {
      setGeneratingToken(false);
    }
  }

  const bookingUrl = bookingSlug && pageOrigin ? `${pageOrigin}/book/${bookingSlug}` : null;

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Waitlist toast */}
      {waitlistToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: N, color: "#fff", padding: "12px 24px", borderRadius: 9999,
          fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 101,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={16} color={G} /> You&apos;re on the waitlist!
        </div>
      )}

      {/* Toast */}
      {saved && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: N, color: "#fff", padding: "12px 24px", borderRadius: 9999,
          fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 100,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={16} color={G} /> {saved}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>
          Calendar Settings
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: "4px 0 0" }}>
          Manage your services, hours, and integrations
        </p>
      </div>

      {/* ── 1. BOOKING LINK ── */}
      <SectionCard title="Your Booking Link">
        {bookingUrl ? (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: GREY, borderRadius: 12, padding: "14px 18px", marginBottom: 16,
              border: `1px solid ${BORDER}`,
            }}>
              <LinkIcon size={16} color={G} style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N, flex: 1 }}>
                {bookingUrl}
              </span>
              <button
                onClick={copyLink}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13,
                  fontWeight: 600, color: copied ? G : N, cursor: "pointer",
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <a
                href={bookingUrl}
                target="_blank"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13,
                  fontWeight: 600, color: N, textDecoration: "none",
                }}
              >
                <ExternalLink size={13} /> Preview
              </a>
            </div>
            <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "14px 18px", border: "1px solid #BBF7D0" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.6 }}>
                <strong>Share this link with customers:</strong> Add it to your Google Business profile, Instagram bio, WhatsApp status, or send it directly. Customers click it to book an appointment instantly.
              </p>
            </div>
          </>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: MUTED, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
            Enable booking in <a href="/dashboard/settings/booking" style={{ color: G }}>Settings → Booking</a> to get your link.
          </div>
        )}
      </SectionCard>

      {/* ── 2. SYNC WITH YOUR CALENDAR ── */}
      <SectionCard title="Sync with Your Calendar">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {/* hidden placeholder */}
          <div style={{ display: "none" }} />

          {/* Card 2: Google Calendar two-way sync */}
          <div style={{
            flex: "1 1 280px", background: googleConnected ? "#F0FDF9" : "#fff", borderRadius: 16,
            border: `1px solid ${googleConnected ? "#A7F3D0" : BORDER}`, padding: "20px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N }}>
                  Google Calendar
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY }}>
                  Two-way sync
                </div>
              </div>
              {googleConnected && (
                <div style={{ marginLeft: "auto", background: "#D1FAE5", color: "#065F46", padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
                  Connected
                </div>
              )}
            </div>

            {googleConnected ? (
              <>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 6px", lineHeight: 1.6 }}>
                  ✓ New bookings automatically appear in your Google Calendar.
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 14px", lineHeight: 1.6 }}>
                  ✓ Events you add to Google Calendar block availability in Vomni.
                </p>
                {googleCalendarId && (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED, margin: "0 0 14px" }}>
                    Calendar: {googleCalendarId}
                  </p>
                )}
                <button
                  onClick={disconnectGoogle}
                  disabled={disconnectingGoogle}
                  style={{
                    padding: "8px 18px", borderRadius: 9999, background: "#fff",
                    border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#EF4444", cursor: "pointer",
                  }}
                >
                  {disconnectingGoogle ? "Disconnecting..." : "Disconnect"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 16px", lineHeight: 1.6 }}>
                  Connect your Google Calendar for real two-way sync. Bookings appear in Google Calendar, and Google events block your availability.
                </p>
                <button
                  onClick={() => {
                    window.location.href = `/api/auth/google-calendar?business_id=${ctx?.businessId}`;
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 18px", borderRadius: 9999, background: N,
                    border: "none", fontFamily: "Inter, sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Connect Google Calendar
                </button>
              </>
            )}
          </div>

          {/* Card: Microsoft Calendar two-way sync */}
          <div style={{
            flex: "1 1 280px", background: microsoftConnected ? "#F0F4FF" : "#fff", borderRadius: 16,
            border: `1px solid ${microsoftConnected ? "#BFDBFE" : BORDER}`, padding: "20px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {/* Microsoft logo */}
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                  <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
                  <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N }}>
                  Microsoft Calendar
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY }}>
                  Two-way sync
                </div>
              </div>
              {microsoftConnected && (
                <div style={{ marginLeft: "auto", background: "#DBEAFE", color: "#1E40AF", padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
                  Connected
                </div>
              )}
            </div>

            {microsoftConnected ? (
              <>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 6px", lineHeight: 1.6 }}>
                  ✓ New bookings automatically appear in your Microsoft Calendar.
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 14px", lineHeight: 1.6 }}>
                  ✓ Events you add to Microsoft Calendar block availability in Vomni.
                </p>
                {microsoftCalendarId && (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED, margin: "0 0 14px" }}>
                    Account: {microsoftCalendarId}
                  </p>
                )}
                <button
                  onClick={disconnectMicrosoft}
                  disabled={disconnectingMicrosoft}
                  style={{
                    padding: "8px 18px", borderRadius: 9999, background: "#fff",
                    border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#EF4444", cursor: "pointer",
                  }}
                >
                  {disconnectingMicrosoft ? "Disconnecting..." : "Disconnect"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 16px", lineHeight: 1.6 }}>
                  Connect your Microsoft / Outlook Calendar for real two-way sync. Bookings appear in your calendar, and calendar events block your availability.
                </p>
                <button
                  onClick={() => {
                    window.location.href = `/api/auth/microsoft-calendar?business_id=${ctx?.businessId}`;
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 18px", borderRadius: 9999, background: N,
                    border: "none", fontFamily: "Inter, sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
                    <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
                    <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  Connect Microsoft Calendar
                </button>
              </>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── 3. WORKING HOURS ── */}
      <SectionCard title="Working Hours">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {hours.map(h => (
            <div key={h.day_of_week} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, width: 120, cursor: "pointer" }}>
                <div
                  onClick={() => updateHour(h.day_of_week, "is_open", !h.is_open)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, background: h.is_open ? G : "#D1D5DB",
                    position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: h.is_open ? 21 : 3,
                    width: 16, height: 16, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: h.is_open ? N : MUTED }}>
                  {DAY_NAMES[h.day_of_week]}
                </span>
              </label>
              {h.is_open ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="time" value={h.open_time}
                    onChange={e => updateHour(h.day_of_week, "open_time", e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, outline: "none" }}
                  />
                  <span style={{ color: MUTED, fontSize: 12 }}>to</span>
                  <input
                    type="time" value={h.close_time}
                    onChange={e => updateHour(h.day_of_week, "close_time", e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, outline: "none" }}
                  />
                </div>
              ) : (
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>Closed</span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={saveHours}
          disabled={savingHours}
          style={{
            padding: "10px 24px", borderRadius: 9999, background: G, color: "#fff",
            border: "none", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
            cursor: savingHours ? "default" : "pointer", opacity: savingHours ? 0.7 : 1,
          }}
        >
          {savingHours ? "Saving..." : "Save Hours"}
        </button>
      </SectionCard>

      {/* ── 4. BLOCKED TIMES ── */}
      <SectionCard title="Blocked Times">
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "0 0 16px" }}>
          Block out lunch breaks, personal time, or one-off closures so no bookings appear during those times.
        </p>

        {blockedTimes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {blockedTimes.map(b => (
              <div key={b.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 10, background: GREY, border: `1px solid ${BORDER}`,
              }}>
                <div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>
                    {b.label ?? "Blocked"}
                  </span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginLeft: 12 }}>
                    {b.start_time} – {b.end_time}
                    {b.is_recurring && b.day_of_week != null && ` · Every ${DAY_NAMES[b.day_of_week]}`}
                    {b.is_recurring && b.day_of_week == null && " · Every day"}
                    {!b.is_recurring && b.date && ` · ${b.date}`}
                  </span>
                </div>
                <button
                  onClick={() => deleteBlock(b.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showBlockForm ? (
          <div style={{ background: GREY, borderRadius: 12, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Label</label>
                <input
                  value={blockLabel} onChange={e => setBlockLabel(e.target.value)}
                  placeholder="e.g. Lunch break"
                  style={inputStyle()}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Start</label>
                  <input type="time" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)} style={inputStyle()} />
                </div>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>End</label>
                  <input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} style={inputStyle()} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, color: N }}>
                <input type="radio" checked={blockIsRecurring} onChange={() => setBlockIsRecurring(true)} style={{ accentColor: G }} />
                Recurring
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, color: N }}>
                <input type="radio" checked={!blockIsRecurring} onChange={() => setBlockIsRecurring(false)} style={{ accentColor: G }} />
                One-off date
              </label>
            </div>
            {blockIsRecurring ? (
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Repeat on</label>
                <select
                  value={blockDayOfWeek ?? "all"}
                  onChange={e => setBlockDayOfWeek(e.target.value === "all" ? null : Number(e.target.value))}
                  style={{ ...inputStyle(), width: "auto" }}
                >
                  <option value="all">Every day</option>
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>Every {d}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Date</label>
                <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} style={{ ...inputStyle(), width: "auto" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={saveBlock}
                disabled={savingBlock}
                style={{
                  padding: "10px 20px", borderRadius: 9999, background: G, color: "#fff",
                  border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                {savingBlock ? "Adding..." : "Add Block"}
              </button>
              <button
                onClick={() => setShowBlockForm(false)}
                style={{ padding: "10px 16px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowBlockForm(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 9999, border: `1px dashed ${BORDER}`,
              background: "#fff", color: SECONDARY, fontFamily: "Inter, sans-serif",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Time Block
          </button>
        )}
      </SectionCard>

      {/* ── 5. SERVICES ── */}
      <SectionCard title="Services & Pricing">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {services.map(svc => (
            <div key={svc.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 10, background: "#fff",
              border: `1px solid ${BORDER}`, opacity: svc.is_active ? 1 : 0.5,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: svc.color ?? G, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{svc.name}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, marginTop: 2 }}>
                  {svc.duration_minutes} min
                  {svc.price != null && ` · ${sym}${svc.price}`}
                </div>
              </div>
              <button
                onClick={() => openEditSvc(svc)}
                style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: N, cursor: "pointer" }}
              >
                Edit
              </button>
              <button
                onClick={() => toggleSvc(svc.id, svc.is_active)}
                style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${BORDER}`, background: svc.is_active ? GREY : `${G}15`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: svc.is_active ? SECONDARY : G, cursor: "pointer" }}
              >
                {svc.is_active ? "Pause" : "Enable"}
              </button>
              <button
                onClick={() => deleteSvc(svc.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {showSvcForm ? (
          <div style={{ background: GREY, borderRadius: 12, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N, margin: "0 0 16px" }}>
              {editSvcId ? "Edit Service" : "New Service"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Service Name</label>
                <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="e.g. Haircut" style={inputStyle()} />
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Duration</label>
                <select value={svcDuration} onChange={e => setSvcDuration(Number(e.target.value))} style={inputStyle()}>
                  {[10,15,20,30,45,60,75,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Price ({sym})</label>
                <input value={svcPrice} onChange={e => setSvcPrice(e.target.value)} placeholder="Optional" type="number" min="0" style={inputStyle()} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 8, textTransform: "uppercase" }}>Colour</label>
              <div style={{ display: "flex", gap: 8 }}>
                {SERVICE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSvcColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: "50%", background: c, border: "none",
                      cursor: "pointer", outline: svcColor === c ? `3px solid ${N}` : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveSvc}
                disabled={savingSvc || !svcName}
                style={{
                  padding: "10px 20px", borderRadius: 9999, background: !svcName ? "#D1D5DB" : G,
                  color: "#fff", border: "none", fontFamily: "Inter, sans-serif",
                  fontSize: 13, fontWeight: 600, cursor: !svcName ? "default" : "pointer",
                }}
              >
                {savingSvc ? "Saving..." : editSvcId ? "Save Changes" : "Add Service"}
              </button>
              <button
                onClick={() => setShowSvcForm(false)}
                style={{ padding: "10px 16px", borderRadius: 9999, background: "#fff", color: SECONDARY, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={openNewSvc}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 9999, border: `1px dashed ${BORDER}`,
              background: "#fff", color: SECONDARY, fontFamily: "Inter, sans-serif",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Service
          </button>
        )}
      </SectionCard>
    </div>
  );
}
