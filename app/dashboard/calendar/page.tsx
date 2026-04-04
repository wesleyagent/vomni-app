"use client";

import { useState, useEffect, useContext, useRef } from "react";
import { BusinessContext } from "../_context";
import { db, getAuthToken } from "@/lib/db";
import { BOOKING_STATUS_LABELS, type BookingStatus, DAY_NAMES_SHORT_EN } from "@/types/booking";
import { Plus, X, Phone, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const MUTED = "#9CA3AF";
const GREY = "#F7F8FA";

interface CalendarBooking {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service_name: string | null;
  service_duration_minutes: number | null;
  service_price: number | null;
  appointment_at: string | null;
  status: string | null;
  notes: string | null;
  internal_notes: string | null;
  staff_id: string | null;
  booking_source: string | null;
  is_recurring: boolean | null;
  recurring_group_id: string | null;
}

interface StaffMember {
  id: string;
  name: string;
}

type ViewMode = "day" | "fiveday" | "month";

const STAFF_COLORS = [
  "#00C896", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const ctx = useContext(BusinessContext);
  const [view, setView] = useState<ViewMode>("fiveday");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [serviceList, setServiceList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  // New booking form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [recurringInterval, setRecurringInterval] = useState(1);

  // Staff filter
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Review invite modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalBooking, setReviewModalBooking] = useState<CalendarBooking | null>(null);
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualSending, setManualSending] = useState(false);
  const [manualSent, setManualSent] = useState(false);

  // Google Calendar events
  interface GCalEvent { id: string; title: string; start: string; end: string; allDay: boolean; }
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalError, setGcalError] = useState(false);

  // Swipe detection
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Date strip scroll ref
  const dateStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ctx?.businessId) loadData();
  }, [ctx?.businessId, currentDate, view]);

  // Scroll date strip to keep current date centered
  useEffect(() => {
    if (view !== "day" || !dateStripRef.current) return;
    const strip = dateStripRef.current;
    const selected = strip.querySelector("[data-selected='true']") as HTMLElement | null;
    if (selected) {
      const offset = selected.offsetLeft - strip.offsetWidth / 2 + selected.offsetWidth / 2;
      strip.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [currentDate, view]);

  // Animate bottom sheet in when booking selected
  useEffect(() => {
    if (selectedBooking) {
      requestAnimationFrame(() => setSheetVisible(true));
    } else {
      setSheetVisible(false);
    }
  }, [selectedBooking]);

  async function loadData() {
    setLoading(true);
    const bizId = ctx!.businessId;

    let startDate: string, endDate: string;
    if (view === "day") {
      const ds = formatDateStr(currentDate);
      startDate = `${ds}T00:00:00`;
      endDate = `${ds}T23:59:59`;
    } else if (view === "fiveday") {
      const sun = new Date(currentDate);
      sun.setDate(sun.getDate() - sun.getDay());
      const thu = new Date(sun);
      thu.setDate(thu.getDate() + 4);
      startDate = `${formatDateStr(sun)}T00:00:00`;
      endDate = `${formatDateStr(thu)}T23:59:59`;
    } else {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      startDate = `${formatDateStr(first)}T00:00:00`;
      endDate = `${formatDateStr(last)}T23:59:59`;
    }

    const { data: bks } = await db
      .from("bookings")
      .select("id, customer_name, customer_phone, customer_email, service_name, service_duration_minutes, service_price, appointment_at, status, notes, internal_notes, staff_id, booking_source, is_recurring, recurring_group_id")
      .eq("business_id", bizId)
      .neq("status", "cancelled")
      .gte("appointment_at", startDate)
      .lte("appointment_at", endDate)
      .order("appointment_at", { ascending: true });

    setBookings((bks ?? []) as CalendarBooking[]);

    const { data: staffData } = await db.from("staff").select("id, name").eq("business_id", bizId).eq("is_active", true);
    setStaffList((staffData ?? []) as StaffMember[]);

    const { data: svcData } = await db.from("services").select("id, name").eq("business_id", bizId).eq("is_active", true);
    setServiceList((svcData ?? []) as { id: string; name: string }[]);

    // Fetch Google Calendar events (non-blocking)
    fetch(`/api/calendar/google/events?business_id=${bizId}&start=${startDate}&end=${endDate}`)
      .then(r => r.json())
      .then((d: { events?: GCalEvent[]; connected?: boolean; error?: string }) => {
        setGcalEvents(d.events ?? []);
        setGcalConnected(d.connected ?? false);
        // Show error banner if connected but fetch failed (expired token etc.)
        setGcalError(!!(d.connected && d.error));
      })
      .catch(() => {});

    setLoading(false);
  }

  function navigateDay(offset: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    setCurrentDate(d);
  }

  function navigateWeek(offset: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset * 7);
    setCurrentDate(d);
  }

  function navigateMonth(offset: number) {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + offset);
    setCurrentDate(d);
  }

  function getStaffColor(staffId: string | null): string {
    if (!staffId) return G;
    const idx = staffList.findIndex(s => s.id === staffId);
    return STAFF_COLORS[idx % STAFF_COLORS.length];
  }

  function getStaffName(staffId: string | null): string {
    if (!staffId) return "";
    return staffList.find(s => s.id === staffId)?.name ?? "";
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => setSelectedBooking(null), 280);
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    const slug = ctx?.businessId ? (await db.from("businesses").select("booking_slug").eq("id", ctx.businessId).single()).data?.booking_slug : null;
    const res = await fetch(`/api/booking/${slug ?? "x"}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, status }),
    });
    if (res.ok) {
      closeSheet();
      loadData();
    }
  }

  async function saveInternalNotes(bookingId: string, notes: string) {
    await db.from("bookings").update({ internal_notes: notes }).eq("id", bookingId);
  }

  async function createManualBooking() {
    if (!newName || !newPhone || !newDate || !newTime) return;
    setSaving(true);
    const svc = serviceList.find(s => s.id === newServiceId);
    const groupId = isRecurring ? crypto.randomUUID() : null;
    const occurrences = isRecurring ? recurringWeeks : 1;

    const rows = Array.from({ length: occurrences }, (_, i) => {
      const apptDate = new Date(`${newDate}T${newTime}:00`);
      apptDate.setDate(apptDate.getDate() + i * recurringInterval * 7);
      return {
        business_id: ctx!.businessId,
        customer_name: newName,
        customer_phone: newPhone,
        service: svc?.name ?? "Walk-in",
        service_name: svc?.name ?? "Walk-in",
        service_id: newServiceId || null,
        staff_id: newStaffId || null,
        appointment_at: apptDate.toISOString(),
        booking_source: "manual",
        status: "confirmed",
        sms_status: "pending",
        notes: newNotes || null,
        created_at: new Date().toISOString(),
        is_recurring: isRecurring,
        recurring_group_id: groupId,
        recurring_interval_weeks: isRecurring ? recurringInterval : null,
      };
    });

    // Atomic transaction via RPC — rolls back all if any slot is taken
    const { data: rpcResult, error: rpcErr } = await db.rpc("insert_recurring_bookings", {
      p_rows: rows as unknown as Record<string, unknown>[],
    });

    if (rpcErr || (rpcResult && !(rpcResult as { success: boolean }).success)) {
      const errMsg = (rpcResult as { error?: string } | null)?.error;
      alert(
        errMsg === "slot_taken"
          ? "One or more of these slots was just taken. Please choose different times."
          : "Failed to create bookings. Please try again."
      );
      setSaving(false);
      return;
    }

    setShowNewForm(false);
    setNewName(""); setNewPhone(""); setNewServiceId(""); setNewStaffId("");
    setNewDate(""); setNewTime(""); setNewNotes("");
    setIsRecurring(false); setRecurringWeeks(4); setRecurringInterval(1);
    setSaving(false);
    loadData();
  }

  const todayStr = formatDateStr(new Date());
  const currentDateStr = formatDateStr(currentDate);
  const isToday = currentDateStr === todayStr;

  const showTodayBtn = view === "day" ? !isToday
    : view === "fiveday" ? (() => {
        const t = new Date();
        const sun = new Date(currentDate);
        sun.setDate(sun.getDate() - sun.getDay());
        const thu = new Date(sun);
        thu.setDate(thu.getDate() + 4);
        return t < sun || t > thu;
      })()
    : (() => {
        const t = new Date();
        return t.getMonth() !== currentDate.getMonth() || t.getFullYear() !== currentDate.getFullYear();
      })();

  // Filtered bookings based on selected staff
  const filteredBookings = selectedStaffId
    ? bookings.filter(b => b.staff_id === selectedStaffId)
    : bookings;

  // Build 28-day strip centred on today
  const dateStripDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 7 + i);
    return d;
  });

  // Swipe handlers (day view only)
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (view !== "day") return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 50 && dy < 60) {
      navigateDay(dx < 0 ? 1 : -1);
    }
  }

  return (
    <div style={{ padding: "24px 24px 100px", maxWidth: 1200, margin: "0 auto", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .booking-card:active { transform: scale(0.98); }
        .date-strip { scrollbar-width: none; }
        .date-strip::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>Calendar</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, margin: "3px 0 0" }}>
            {view === "day" && (isToday ? "Today" : currentDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}
            {view === "fiveday" && (() => {
              const sun = new Date(currentDate);
              sun.setDate(sun.getDate() - sun.getDay());
              const thu = new Date(sun);
              thu.setDate(thu.getDate() + 4);
              return `${sun.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${thu.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
            })()}
            {view === "month" && currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => { setShowNewForm(true); setNewDate(currentDateStr); }}
            style={{
              background: G, border: "none", borderRadius: 9999,
              padding: "7px 16px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <Plus size={15} strokeWidth={2.5} /> New Booking
          </button>

          {showTodayBtn && (
            <button
              onClick={() => setCurrentDate(new Date())}
              style={{
                background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9999,
                padding: "7px 14px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                color: N, cursor: "pointer",
              }}
            >Today</button>
          )}

          <div style={{ display: "flex", gap: 3 }}>
            <button
              onClick={() => view === "day" ? navigateDay(-1) : view === "fiveday" ? navigateDay(-7) : navigateMonth(-1)}
              style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 7, cursor: "pointer", display: "flex", alignItems: "center" }}
            ><ChevronLeft size={17} color={SECONDARY} /></button>
            <button
              onClick={() => view === "day" ? navigateDay(1) : view === "fiveday" ? navigateDay(7) : navigateMonth(1)}
              style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 7, cursor: "pointer", display: "flex", alignItems: "center" }}
            ><ChevronRight size={17} color={SECONDARY} /></button>
          </div>

          <div style={{ display: "flex", background: GREY, borderRadius: 10, padding: 3 }}>
            {(["day", "fiveday", "month"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "6px 13px", borderRadius: 7, border: "none",
                  background: view === v ? "#fff" : "transparent",
                  boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: view === v ? 600 : 500,
                  color: view === v ? N : SECONDARY, cursor: "pointer",
                }}
              >{v === "fiveday" ? "5-Day" : v === "month" ? "Month" : "Day"}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DATE STRIP (day view only) ── */}
      {view === "day" && (
        <div
          ref={dateStripRef}
          className="date-strip"
          style={{
            display: "flex", gap: 6, overflowX: "auto", marginBottom: 20,
            paddingBottom: 4,
          }}
        >
          {dateStripDays.map((d, i) => {
            const ds = formatDateStr(d);
            const isSelected = ds === currentDateStr;
            const isDayToday = ds === todayStr;
            const dayName = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];

            return (
              <button
                key={i}
                data-selected={isSelected}
                onClick={() => setCurrentDate(new Date(d))}
                style={{
                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "8px 10px", borderRadius: 12, border: "none",
                  background: isSelected ? G : isDayToday ? `${G}15` : "#fff",
                  cursor: "pointer", minWidth: 46,
                  boxShadow: isSelected ? "0 2px 8px rgba(0,200,150,0.3)" : "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{
                  fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600,
                  color: isSelected ? "rgba(255,255,255,0.8)" : MUTED,
                  textTransform: "uppercase", marginBottom: 3,
                }}>{dayName}</span>
                <span style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700,
                  color: isSelected ? "#fff" : isDayToday ? G : N,
                }}>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      )}


      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* ── DAY VIEW (scrollable list) ── */}
          {view === "day" && (
            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              style={{ userSelect: "none" }}
            >
              {/* Google Calendar events for this day */}
              {gcalConnected && gcalEvents.filter(e => e.start.substring(0, 10) === formatDateStr(currentDate)).map(e => (
                <div key={e.id} style={{
                  background: "#EFF6FF", borderRadius: 12, border: "1px solid #BFDBFE",
                  padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
                }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: "#3B82F6", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#1D4ED8", margin: 0 }}>
                      {e.allDay ? "All day" : `${e.start.substring(11, 16)} – ${e.end.substring(11, 16)}`}
                    </p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1E40AF", margin: "2px 0 0" }}>{e.title}</p>
                  </div>
                  <span style={{ fontSize: 11, color: "#93C5FD", fontFamily: "Inter, sans-serif" }}>Google Calendar</span>
                </div>
              ))}
              {filteredBookings.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredBookings.map(b => {
                    const status = (b.status ?? "confirmed") as BookingStatus;
                    const label = BOOKING_STATUS_LABELS[status] ?? BOOKING_STATUS_LABELS.confirmed;
                    const staffColor = getStaffColor(b.staff_id);
                    const time = b.appointment_at ? b.appointment_at.substring(11, 16) : "";
                    const dur = b.service_duration_minutes ?? 30;
                    const endTime = (() => {
                      if (!b.appointment_at) return "";
                      const [h, m] = b.appointment_at.substring(11, 16).split(":").map(Number);
                      const totalMin = h * 60 + m + dur;
                      return `${String(Math.floor(totalMin / 60) % 24).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
                    })();

                    return (
                      <button
                        key={b.id}
                        className="booking-card"
                        onClick={() => setSelectedBooking(b)}
                        style={{
                          display: "flex", alignItems: "center", gap: 0, width: "100%",
                          background: "#fff", borderRadius: 14,
                          border: `1px solid ${BORDER}`,
                          cursor: "pointer", textAlign: "left", overflow: "hidden",
                          transition: "transform 0.1s",
                        }}
                      >
                        {/* Color accent bar */}
                        <div style={{ width: 4, alignSelf: "stretch", background: staffColor, flexShrink: 0 }} />

                        {/* Time column */}
                        <div style={{
                          padding: "16px 14px", flexShrink: 0, minWidth: 68,
                          borderRight: `1px solid ${BORDER}`,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N }}>{time}</span>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED, marginTop: 2 }}>{endTime}</span>
                        </div>

                        {/* Main content */}
                        <div style={{ flex: 1, padding: "14px 16px" }}>
                          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N }}>
                            {b.customer_name ?? "Unknown"}
                          </div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginTop: 3 }}>
                            {b.service_name ?? "Service"}
                            {b.staff_id && staffList.length > 1 && ` · ${getStaffName(b.staff_id)}`}
                            {` · ${dur} min`}
                          </div>
                        </div>

                        {/* Status + recurring badges */}
                        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span style={{
                            display: "inline-block", padding: "4px 10px", borderRadius: 9999,
                            fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600,
                            background: label.bg, color: label.color, whiteSpace: "nowrap",
                          }}>{label.en}</span>
                          {b.is_recurring && (
                            <span style={{
                              display: "inline-block", padding: "3px 8px", borderRadius: 9999,
                              fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600,
                              background: "#EEF2FF", color: "#6366F1", whiteSpace: "nowrap",
                            }}>↻ Recurring</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 5-DAY VIEW (Sun–Thu) ── */}
          {view === "fiveday" && (() => {
            const sun = new Date(currentDate);
            sun.setDate(sun.getDate() - sun.getDay());
            const DAY_NAMES_5 = ["Sun", "Mon", "Tue", "Wed", "Thu"];
            const days = Array.from({ length: 5 }, (_, i) => {
              const d = new Date(sun);
              d.setDate(d.getDate() + i);
              return d;
            });
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {days.map((d, i) => {
                  const ds = formatDateStr(d);
                  const dayBookings = filteredBookings.filter(b => b.appointment_at?.substring(0, 10) === ds);
                  const isDayToday = ds === todayStr;
                  return (
                    <div key={i} style={{
                      background: "#fff", borderRadius: 12, border: `1px solid ${isDayToday ? G : BORDER}`,
                      overflow: "hidden", minHeight: 200,
                    }}>
                      <div style={{
                        padding: "10px 12px", borderBottom: `1px solid ${BORDER}`,
                        background: isDayToday ? `${G}08` : "transparent", textAlign: "center",
                      }}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase" }}>
                          {DAY_NAMES_5[i]}
                        </div>
                        <div style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700,
                          color: isDayToday ? G : N, marginTop: 2,
                        }}>{d.getDate()}</div>
                      </div>
                      <div style={{ padding: 6 }}>
                        {dayBookings.map(b => (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBooking(b)}
                            style={{
                              display: "block", width: "100%", padding: "6px 8px", borderRadius: 6,
                              background: `${getStaffColor(b.staff_id)}12`,
                              borderLeft: `2px solid ${getStaffColor(b.staff_id)}`,
                              marginBottom: 4, cursor: "pointer", textAlign: "left", border: "none",
                            }}
                          >
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: N }}>
                              {b.appointment_at ? b.appointment_at.substring(11, 16) : ""}
                            </div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: SECONDARY, marginTop: 1 }}>
                              {b.customer_name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── UPCOMING LIST ── */}
          {/* ── MONTH VIEW ── */}
          {view === "month" && (() => {
            const y = currentDate.getFullYear();
            const m = currentDate.getMonth();
            const firstDay = new Date(y, m, 1);
            const lastDay = new Date(y, m + 1, 0);
            const startDow = firstDay.getDay();
            const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;
            const cells = Array.from({ length: totalCells }, (_, i) => {
              return new Date(y, m, i - startDow + 1);
            });
            const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
                  {DAY_HEADERS.map(h => (
                    <div key={h} style={{ textAlign: "center", padding: "6px 0", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase" }}>
                      {h}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                  {cells.map((d, i) => {
                    const ds = formatDateStr(d);
                    const isCurrentMonth = d.getMonth() === m;
                    const isDayToday = ds === todayStr;
                    const dayBookings = filteredBookings.filter(b => b.appointment_at?.substring(0, 10) === ds);
                    return (
                      <div
                        key={i}
                        onClick={() => { if (isCurrentMonth) { setCurrentDate(d); setView("day"); } }}
                        style={{
                          minHeight: 80, borderRadius: 10,
                          border: `1px solid ${isDayToday ? G : BORDER}`,
                          background: isCurrentMonth ? "#fff" : GREY,
                          padding: "6px 8px",
                          cursor: isCurrentMonth ? "pointer" : "default",
                          opacity: isCurrentMonth ? 1 : 0.4,
                        }}
                      >
                        <div style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700,
                          color: isDayToday ? G : isCurrentMonth ? N : MUTED,
                          marginBottom: 4,
                        }}>{d.getDate()}</div>
                        {dayBookings.slice(0, 3).map(b => (
                          <div
                            key={b.id}
                            onClick={e => { e.stopPropagation(); setSelectedBooking(b); }}
                            style={{
                              fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: 600,
                              color: "#fff", background: getStaffColor(b.staff_id),
                              borderRadius: 3, padding: "1px 4px", marginBottom: 2,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              cursor: "pointer",
                            }}
                          >
                            {b.appointment_at?.substring(11, 16)} {b.customer_name}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div style={{ fontSize: 10, fontFamily: "Inter, sans-serif", color: MUTED }}>
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ── Google Calendar sync error banner ── */}
      {gcalError && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 12,
          padding: "10px 20px", zIndex: 999,
          display: "flex", alignItems: "center", gap: 10,
          fontFamily: "Inter, sans-serif", fontSize: 13, color: "#92400E",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
        }}>
          ⚠️ Google Calendar sync error —{" "}
          <a href="/dashboard/calendar/settings" style={{ color: "#92400E", fontWeight: 600, textDecoration: "underline" }}>
            Reconnect in Settings
          </a>
        </div>
      )}

      {/* ── APPOINTMENT DETAIL BOTTOM SHEET ── */}
      {selectedBooking && (
        <>
          <div
            onClick={closeSheet}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
              zIndex: 45, animation: "fadeIn 0.2s ease-out",
            }}
          />
          <div style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            maxHeight: "85vh", background: "#fff",
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -4px 40px rgba(0,0,0,0.18)",
            zIndex: 50, display: "flex", flexDirection: "column",
            transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.28s cubic-bezier(0.32,0.72,0,1)",
            overflowY: "auto",
          }}>
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E5E7EB" }} />
            </div>

            <div style={{ padding: "16px 24px 8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N }}>
                  {selectedBooking.customer_name}
                </div>
                {selectedBooking.customer_phone && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, marginTop: 2 }}>{selectedBooking.customer_phone}</div>
                )}
                {selectedBooking.customer_email && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>{selectedBooking.customer_email}</div>
                )}
              </div>
              <button onClick={closeSheet} style={{ background: GREY, border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={16} color={SECONDARY} />
              </button>
            </div>

            <div style={{ padding: "0 24px 32px" }}>
              {/* Recurring badge */}
              {selectedBooking.is_recurring && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 9999, background: "#EEF2FF",
                  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6366F1",
                  marginBottom: 16,
                }}>
                  ↻ Recurring appointment
                </div>
              )}

              {/* Service info */}
              <div style={{ background: GREY, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 600, color: N, marginBottom: 8 }}>
                  {selectedBooking.service_name}
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY }}>
                  📅 {selectedBooking.appointment_at
                    ? new Date(selectedBooking.appointment_at.substring(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
                    : "—"} at {selectedBooking.appointment_at
                    ? selectedBooking.appointment_at.substring(11, 16)
                    : "—"}
                </div>
                {selectedBooking.service_duration_minutes && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginTop: 4 }}>
                    ⏱ {selectedBooking.service_duration_minutes} min
                  </div>
                )}
                {selectedBooking.service_price != null && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginTop: 4 }}>
                    💰 ₪{selectedBooking.service_price}
                  </div>
                )}
                {selectedBooking.staff_id && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginTop: 4 }}>
                    👤 {getStaffName(selectedBooking.staff_id)}
                  </div>
                )}
              </div>

              {/* Customer notes */}
              {selectedBooking.notes && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Customer Notes</div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, margin: 0 }}>{selectedBooking.notes}</p>
                </div>
              )}

              {/* Internal notes */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Internal Notes</div>
                <textarea
                  defaultValue={selectedBooking.internal_notes ?? ""}
                  onBlur={e => saveInternalNotes(selectedBooking.id, e.target.value)}
                  rows={2}
                  placeholder="Add private notes..."
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14,
                    color: N, outline: "none", resize: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Contact buttons */}
              {selectedBooking.customer_phone && (
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  <a
                    href={`tel:${selectedBooking.customer_phone}`}
                    style={{
                      flex: 1, padding: "11px 14px", borderRadius: 10,
                      background: GREY, textDecoration: "none",
                      fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                      color: N, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  ><Phone size={14} /> Call</a>
                  <a
                    href={`https://wa.me/${selectedBooking.customer_phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    style={{
                      flex: 1, padding: "11px 14px", borderRadius: 10,
                      background: "#25D366", textDecoration: "none",
                      fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  ><MessageCircle size={14} /> WhatsApp</a>
                </div>
              )}

              {/* Status actions */}
              {selectedBooking.status === "confirmed" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={() => updateBookingStatus(selectedBooking.id, "completed")}
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 12,
                      background: N, color: "#fff", border: "none",
                      fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}
                  >Mark Complete</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, "no_show")}
                      style={{
                        flex: 1, padding: "12px 16px", borderRadius: 12,
                        background: "#FEF2F2", color: "#EF4444", border: `1px solid #FECACA`,
                        fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >No-Show</button>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, "cancelled")}
                      style={{
                        flex: 1, padding: "12px 16px", borderRadius: 12,
                        background: "#fff", color: "#EF4444", border: `1px solid ${BORDER}`,
                        fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >Cancel</button>
                  </div>
                </div>
              )}

              {selectedBooking.status && selectedBooking.status !== "confirmed" && (
                <div style={{
                  padding: 16, borderRadius: 12, textAlign: "center",
                  background: BOOKING_STATUS_LABELS[(selectedBooking.status as BookingStatus)]?.bg ?? GREY,
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                  color: BOOKING_STATUS_LABELS[(selectedBooking.status as BookingStatus)]?.color ?? SECONDARY,
                }}>
                  {BOOKING_STATUS_LABELS[(selectedBooking.status as BookingStatus)]?.en ?? selectedBooking.status}
                </div>
              )}

              {/* Review Invite button — shown for completed or confirmed bookings */}
              {(selectedBooking.status === "completed" || selectedBooking.status === "confirmed") && (
                <button
                  onClick={() => {
                    setReviewModalBooking(selectedBooking);
                    const reviewUrl = `${typeof window !== "undefined" ? window.location.origin : "https://vomni.io"}/review-invite/${ctx?.businessId}`;
                    const name = selectedBooking.customer_name ?? "there";
                    const bName = ctx?.businessName ?? "us";
                    setReviewMessage(`Hi ${name}! Thanks for visiting ${bName}. We'd love to hear your feedback — could you leave us a quick Google review? 🌟 ${reviewUrl}`);
                    setShowQR(false);
                    setShowReviewModal(true);
                  }}
                  style={{
                    marginTop: 12, width: "100%", padding: "13px 16px", borderRadius: 12,
                    background: `${G}15`, color: G, border: `1.5px solid ${G}`,
                    fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span>⭐</span> Request Review
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── REVIEW INVITE MODAL ── */}
      {showReviewModal && reviewModalBooking && (
        <>
          <div
            onClick={() => { setShowReviewModal(false); setReviewLinkCopied(false); setShowQR(false); setManualName(""); setManualPhone(""); setManualSent(false); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60 }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "min(400px, calc(100vw - 32px))", background: "#fff", borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)", zIndex: 70, padding: 28,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
                Request a Review
              </h3>
              <button
                onClick={() => { setShowReviewModal(false); setReviewLinkCopied(false); setShowQR(false); setManualName(""); setManualPhone(""); setManualSent(false); }}
                style={{ background: GREY, border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} color={SECONDARY} />
              </button>
            </div>

            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY, marginBottom: 16 }}>
              For <strong style={{ color: N }}>{reviewModalBooking.customer_name}</strong>
              {reviewModalBooking.service_name && <> — {reviewModalBooking.service_name}</>}
            </div>

            {/* Editable message */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</label>
              <textarea
                value={reviewMessage}
                onChange={e => setReviewMessage(e.target.value)}
                rows={4}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13,
                  color: N, outline: "none", resize: "none", boxSizing: "border-box",
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => {
                  const reviewUrl = `${typeof window !== "undefined" ? window.location.origin : "https://vomni.io"}/review-invite/${ctx?.businessId}`;
                  navigator.clipboard.writeText(reviewUrl);
                  setReviewLinkCopied(true);
                  setTimeout(() => setReviewLinkCopied(false), 2000);
                }}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10,
                  background: reviewLinkCopied ? `${G}15` : GREY,
                  color: reviewLinkCopied ? G : N,
                  border: `1px solid ${reviewLinkCopied ? G : BORDER}`,
                  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {reviewLinkCopied ? "✓ Copied!" : "📋 Copy Link"}
              </button>
              {reviewModalBooking.customer_phone && (
                <a
                  href={`https://wa.me/${reviewModalBooking.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(reviewMessage)}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: 10,
                    background: "#25D36620", color: "#128C7E",
                    border: "1px solid #25D36640",
                    fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                    textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  💬 WhatsApp
                </a>
              )}
              <button
                onClick={() => setShowQR(q => !q)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10,
                  background: showQR ? `${N}10` : GREY, color: N,
                  border: `1px solid ${showQR ? N : BORDER}`,
                  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                🔗 QR Code
              </button>
            </div>

            {/* QR Code */}
            {showQR && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
                <div style={{ background: GREY, borderRadius: 12, padding: 16, border: `1px solid ${BORDER}` }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : "https://vomni.io"}/review-invite/${ctx?.businessId}`)}`}
                    alt="QR Code"
                    width={180}
                    height={180}
                    style={{ display: "block", borderRadius: 6 }}
                  />
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED, margin: "10px 0 0", textAlign: "center" }}>
                  Show this to the customer to scan
                </p>
              </div>
            )}

            {/* Send to a customer directly */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginBottom: 16 }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Send to a customer directly
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Customer name"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, outline: "none", boxSizing: "border-box", width: "100%" }}
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, outline: "none", boxSizing: "border-box", width: "100%" }}
                />
              </div>
              <button
                disabled={!manualName.trim() || !manualPhone.trim() || manualSending || manualSent}
                onClick={async () => {
                  if (!ctx?.businessId || !manualName.trim() || !manualPhone.trim()) return;
                  setManualSending(true);
                  try {
                    const token = await getAuthToken();
                    await fetch("/api/crm/send-review-request", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                      body: JSON.stringify({ business_id: ctx.businessId, name: manualName.trim(), phone: manualPhone.trim() }),
                    });
                    setManualSent(true);
                    setManualName("");
                    setManualPhone("");
                    setTimeout(() => setManualSent(false), 3000);
                  } catch {
                    // ignore
                  } finally {
                    setManualSending(false);
                  }
                }}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 10,
                  background: manualSent ? `${G}15` : (!manualName.trim() || !manualPhone.trim() || manualSending) ? "#F3F4F6" : `${G}15`,
                  color: manualSent ? G : (!manualName.trim() || !manualPhone.trim() || manualSending) ? MUTED : G,
                  border: `1px solid ${manualSent ? G : BORDER}`,
                  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                  cursor: (!manualName.trim() || !manualPhone.trim() || manualSending || manualSent) ? "not-allowed" : "pointer",
                }}
              >
                {manualSent ? "✓ Sent!" : manualSending ? "Sending…" : "Send"}
              </button>
            </div>

            <button
              onClick={() => { setShowReviewModal(false); setReviewLinkCopied(false); setShowQR(false); setManualName(""); setManualPhone(""); setManualSent(false); }}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12,
                background: G, color: "#fff", border: "none",
                fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >Done</button>
          </div>
        </>
      )}

      {/* ── NEW BOOKING MODAL ── */}
      {showNewForm && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 45 }} onClick={() => setShowNewForm(false)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "min(440px, calc(100vw - 32px))", background: "#fff", borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 50, padding: 28,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, color: N, margin: 0 }}>
                New Appointment
              </h3>
              <button onClick={() => setShowNewForm(false)} style={{ background: GREY, border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={SECONDARY} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {serviceList.length > 0 && (
                <select
                  value={newServiceId} onChange={e => setNewServiceId(e.target.value)}
                  style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none" }}
                >
                  <option value="">Select service...</option>
                  {serviceList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {staffList.length > 0 && (
                <select
                  value={newStaffId} onChange={e => setNewStaffId(e.target.value)}
                  style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none" }}
                >
                  <option value="">Select staff...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <input
                value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name"
                style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none" }}
              />
              <input
                value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone number" type="tel"
                style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none" }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  value={newDate} onChange={e => setNewDate(e.target.value)} type="date"
                  style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none" }}
                />
                <input
                  value={newTime} onChange={e => setNewTime(e.target.value)} type="time"
                  style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none" }}
                />
              </div>
              <textarea
                value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
                style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, outline: "none", resize: "none" }}
              />

              {/* Recurring toggle */}
              <div style={{ background: GREY, borderRadius: 12, padding: "14px 16px" }}>
                <div
                  onClick={() => setIsRecurring(!isRecurring)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>Repeat appointment</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED, marginTop: 2 }}>Create multiple recurring bookings</div>
                  </div>
                  <div style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: isRecurring ? G : "#D1D5DB",
                    position: "relative", transition: "background 0.2s", cursor: "pointer",
                  }}>
                    <div style={{
                      position: "absolute", top: 3, left: isRecurring ? 23 : 3,
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </div>
                {isRecurring && (
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase" }}>Every</div>
                      <select
                        value={recurringInterval}
                        onChange={e => setRecurringInterval(Number(e.target.value))}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, outline: "none", background: "#fff" }}
                      >
                        <option value={1}>1 week</option>
                        <option value={2}>2 weeks</option>
                        <option value={3}>3 weeks</option>
                        <option value={4}>4 weeks</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase" }}>Occurrences</div>
                      <select
                        value={recurringWeeks}
                        onChange={e => setRecurringWeeks(Number(e.target.value))}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, outline: "none", background: "#fff" }}
                      >
                        {[2, 3, 4, 6, 8, 12].map(n => <option key={n} value={n}>{n}×</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1", fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY }}>
                      ↻ Will create {recurringWeeks} appointments every {recurringInterval} week{recurringInterval > 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={createManualBooking}
                disabled={saving || !newName || !newPhone || !newDate || !newTime}
                style={{
                  width: "100%", padding: "14px 20px", borderRadius: 9999,
                  background: (!newName || !newPhone || !newDate || !newTime) ? "#D1D5DB" : G,
                  color: "#fff", border: "none",
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700,
                  cursor: (!newName || !newPhone || !newDate || !newTime) ? "default" : "pointer",
                  marginTop: 4,
                }}
              >
                {saving ? "Saving..." : "Create Appointment"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
