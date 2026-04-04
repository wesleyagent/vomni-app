"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";

// ── Colours ────────────────────────────────────────────────────────────────

const G       = "#00C896";
const GD      = "#00A87D";
const N       = "#0A0F1E";
const BORDER  = "#E5E7EB";
const MUTED   = "#9CA3AF";
const SEC     = "#6B7280";
const GREY    = "#F7F8FA";

// ── Types ─────────────────────────────────────────────────────────────────

type View =
  | "manage"
  | "confirm-cancel"
  | "cancelled"
  | "rescheduling"
  | "rescheduled";

interface BookingProps {
  id: string;
  customerName: string;
  serviceName: string;
  staffName: string | null;
  appointmentAt: string;
  staffId: string | null;
  serviceId: string | null;
}

interface BusinessProps {
  name: string;
  googleReviewLink: string | null;
  bookingSlug: string | null;
  timezone: string;
  bufferMinutes: number;
}

interface Props {
  token: string;
  booking: BookingProps;
  business: BusinessProps;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz,
    });
  } catch {
    return iso.substring(0, 10);
  }
}

function fmtDateHe(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz,
    });
  } catch {
    return iso.substring(0, 10);
  }
}

function fmtTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
    });
  } catch {
    return iso.substring(11, 16);
  }
}

function todayStr(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── ManageClient ─────────────────────────────────────────────────────────

export default function ManageClient({ token, booking, business }: Props) {
  const [view, setView] = useState<View>("manage");
  const [rescheduledAt, setRescheduledAt] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  // Cancel state
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reschedule state
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selDate,  setSelDate]  = useState<string | null>(null);
  const [slots,    setSlots]    = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selSlot,  setSelSlot]  = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Fetch available slots when a date is selected
  const fetchSlots = useCallback(async (date: string) => {
    if (!business.bookingSlug || !booking.serviceId) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelSlot(null);
    setRescheduleError(null);
    try {
      const url = `/api/booking/${business.bookingSlug}/availability?date=${date}&service_id=${booking.serviceId}&staff_id=${booking.staffId ?? "any"}`;
      const res = await fetch(url);
      const data = await res.json() as { slots?: string[] };
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    }
    setSlotsLoading(false);
  }, [business.bookingSlug, booking.serviceId, booking.staffId]);

  useEffect(() => {
    if (selDate) fetchSlots(selDate);
  }, [selDate, fetchSlots]);

  // ── Cancel ──────────────────────────────────────────────────────────────

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/booking/cancel-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setView("cancelled");
      } else {
        const data = await res.json() as { error?: string };
        setCancelError(data.error ?? "Failed to cancel. Please try again.");
      }
    } catch {
      setCancelError("Connection error. Please try again.");
    }
    setCancelling(false);
  }

  // ── Reschedule ──────────────────────────────────────────────────────────

  async function handleReschedule() {
    if (!selDate || !selSlot || !booking.staffId) return;
    setConfirming(true);
    setRescheduleError(null);
    const newAt = `${selDate}T${selSlot}:00`;
    try {
      const res = await fetch("/api/booking/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_appointment_at: newAt,
          new_staff_id: booking.staffId,
        }),
      });
      const data = await res.json() as {
        success?: boolean;
        error?: string;
        new_token?: string;
        new_appointment_at?: string;
      };
      if (res.status === 409) {
        setRescheduleError("Sorry, that slot was just taken. Please choose another time.");
        setSelSlot(null);
      } else if (res.ok && data.success) {
        setRescheduledAt(data.new_appointment_at ?? newAt);
        setNewToken(data.new_token ?? null);
        setView("rescheduled");
      } else {
        setRescheduleError(data.error ?? "Failed to reschedule. Please try again.");
      }
    } catch {
      setRescheduleError("Connection error. Please try again.");
    }
    setConfirming(false);
  }

  // ── Calendar helpers ─────────────────────────────────────────────────────

  const today = todayStr(business.timezone);
  const totalDays   = daysInMonth(calYear, calMonth);
  const startOffset = firstDayOfMonth(calYear, calMonth);
  const calDays: (number | null)[] = [
    ...Array.from({ length: startOffset }, (): null => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  function dayStr(day: number) {
    return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // ── Shared card wrapper ──────────────────────────────────────────────────

  const cardStyle: CSSProperties = {
    background: "#fff",
    borderRadius: 20,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    padding: "32px 28px",
    maxWidth: 480,
    width: "100%",
    margin: "0 auto",
  };

  const shell: CSSProperties = {
    minHeight: "100vh",
    background: GREY,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 16px",
  };

  // ── CANCELLED ───────────────────────────────────────────────────────────

  if (view === "cancelled") {
    return (
      <div style={shell}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✕</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: N, margin: "0 0 8px" }}>
            Your appointment has been cancelled.
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SEC, margin: "0 0 4px" }}>
            We hope to see you soon.
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: MUTED }}>
            הפגישה שלך בוטלה. מקווים לראותך שוב בקרוב.
          </p>
        </div>
      </div>
    );
  }

  // ── RESCHEDULED ─────────────────────────────────────────────────────────

  if (view === "rescheduled" && rescheduledAt) {
    const newManageUrl = newToken
      ? `${window.location.origin}/manage/${newToken}`
      : null;
    return (
      <div style={shell}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: N, margin: "0 0 8px" }}>
            Done — your appointment has been moved.
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: G, fontWeight: 600, marginBottom: 4 }}>
            {fmtDate(rescheduledAt, business.timezone)} · {fmtTime(rescheduledAt, business.timezone)}
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, marginBottom: 20 }}>
            {fmtDateHe(rescheduledAt, business.timezone)} · {fmtTime(rescheduledAt, business.timezone)}
          </p>
          {newManageUrl && (
            <a
              href={newManageUrl}
              style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: G, textDecoration: "none" }}
            >
              Manage this appointment →
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN MANAGE PAGE ────────────────────────────────────────────────────

  return (
    <div style={shell}>
      <div style={{ maxWidth: 480, width: "100%" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, margin: "0 0 4px" }}>
            {business.name}
          </p>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: N, margin: 0 }}>
            Your appointment
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, margin: "4px 0 0" }}>
            הפגישה שלך
          </p>
        </div>

        {/* ── Appointment card ── */}
        <div style={cardStyle}>
          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 4px" }}>
            {booking.serviceName}{booking.staffName ? ` with ${booking.staffName}` : ""}
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, margin: "0 0 2px" }}>
            {booking.staffName ? `${booking.serviceName} עם ${booking.staffName}` : booking.serviceName}
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SEC, margin: "12px 0 0" }}>
            {fmtDate(booking.appointmentAt, business.timezone)} · {fmtTime(booking.appointmentAt, business.timezone)}
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, margin: "2px 0 0" }}>
            {fmtDateHe(booking.appointmentAt, business.timezone)} · {fmtTime(booking.appointmentAt, business.timezone)}
          </p>

          {/* Action buttons */}
          {view === "manage" && (
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={() => {
                  setView("rescheduling");
                  setSelDate(null);
                  setSlots([]);
                  setSelSlot(null);
                  setRescheduleError(null);
                }}
                style={{
                  flex: 1, padding: "13px 16px", borderRadius: 12,
                  background: N, color: "#fff", border: "none",
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Change date or time<br />
                <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.7 }}>שינוי תאריך / שעה</span>
              </button>
              <button
                onClick={() => { setView("confirm-cancel"); setCancelError(null); }}
                style={{
                  flex: 1, padding: "13px 16px", borderRadius: 12,
                  background: "#fff", color: "#EF4444",
                  border: "1.5px solid #EF4444",
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel appointment<br />
                <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.7 }}>ביטול פגישה</span>
              </button>
            </div>
          )}

          {/* ── Confirm cancel ── */}
          {view === "confirm-cancel" && (
            <div style={{ marginTop: 24, padding: 20, background: "#FEF2F2", borderRadius: 14, border: "1.5px solid #FECACA" }}>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: "#991B1B", margin: "0 0 4px" }}>
                Are you sure you want to cancel?
              </p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#B91C1C", margin: "0 0 4px" }}>
                This cannot be undone.
              </p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#EF4444", margin: "0 0 16px" }}>
                האם אתה בטוח שברצונך לבטל? לא ניתן לבטל פעולה זו.
              </p>
              {cancelError && (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#DC2626", margin: "0 0 12px" }}>
                  {cancelError}
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
                    background: "#EF4444", color: "#fff",
                    fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700,
                    cursor: cancelling ? "default" : "pointer",
                    opacity: cancelling ? 0.7 : 1,
                  }}
                >
                  {cancelling ? "Cancelling..." : "Yes, cancel my appointment"}
                </button>
                <button
                  onClick={() => { setView("manage"); setCancelError(null); }}
                  disabled={cancelling}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 10,
                    border: `1.5px solid ${BORDER}`, background: "#fff", color: N,
                    fontFamily: "Inter, sans-serif", fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Keep it<br />
                  <span style={{ fontSize: 12, color: MUTED }}>השאר</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Inline reschedule picker ── */}
        {view === "rescheduling" && (
          <div style={{ ...cardStyle, marginTop: 16 }}>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 4px" }}>
              Choose a new date &amp; time
            </p>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, margin: "0 0 20px" }}>
              בחר תאריך ושעה חדשים
            </p>

            {/* Month navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: SEC, padding: "4px 10px" }}>‹</button>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: SEC, padding: "4px 10px" }}>›</button>
            </div>

            {/* Day header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
              {DAY_HEADERS.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: MUTED, paddingBottom: 6 }}>{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {calDays.map((day, idx) => {
                if (!day) return <div key={`e${idx}`} />;
                const ds = dayStr(day);
                const isPast   = ds < today;
                const isToday  = ds === today;
                const isSel    = ds === selDate;
                return (
                  <button
                    key={ds}
                    onClick={() => !isPast && setSelDate(ds)}
                    disabled={isPast}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      border: isToday && !isSel ? `1.5px solid ${G}` : "1.5px solid transparent",
                      background: isSel ? G : "transparent",
                      color: isPast ? "#D1D5DB" : isSel ? "#fff" : N,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: isSel || isToday ? 700 : 400,
                      cursor: isPast ? "default" : "pointer",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selDate && (
              <div style={{ marginTop: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, margin: "0 0 12px" }}>
                  Available times for {new Date(selDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}:
                </p>
                {slotsLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : slots.length === 0 ? (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, textAlign: "center" }}>
                    No available slots on this day.<br />
                    <span style={{ fontSize: 12 }}>אין זמינות ביום זה.</span>
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {slots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelSlot(slot)}
                        style={{
                          padding: "10px 0",
                          borderRadius: 10,
                          border: `1.5px solid ${selSlot === slot ? G : BORDER}`,
                          background: selSlot === slot ? "rgba(0,200,150,0.08)" : "#fff",
                          color: selSlot === slot ? G : N,
                          fontFamily: "Inter, sans-serif",
                          fontSize: 14,
                          fontWeight: selSlot === slot ? 700 : 400,
                          cursor: "pointer",
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reschedule error */}
            {rescheduleError && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#DC2626", marginTop: 12, textAlign: "center" }}>
                {rescheduleError}
              </p>
            )}

            {/* Confirm buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={handleReschedule}
                disabled={!selDate || !selSlot || confirming}
                style={{
                  flex: 1, padding: "13px 0", borderRadius: 12, border: "none",
                  background: selDate && selSlot ? G : "#E5E7EB",
                  color: selDate && selSlot ? "#fff" : MUTED,
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: selDate && selSlot && !confirming ? "pointer" : "default",
                  opacity: confirming ? 0.7 : 1,
                  transition: "background 0.15s",
                }}
              >
                {confirming ? "Confirming..." : "Confirm new time"}
              </button>
              <button
                onClick={() => { setView("manage"); setSelDate(null); setSlots([]); setSelSlot(null); setRescheduleError(null); }}
                disabled={confirming}
                style={{
                  padding: "13px 16px", borderRadius: 12,
                  border: `1.5px solid ${BORDER}`, background: "#fff", color: SEC,
                  fontFamily: "Inter, sans-serif", fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── Google review footer ── */}
        {business.googleReviewLink && view !== "confirm-cancel" && (
          <div style={{ textAlign: "center", marginTop: 24, padding: "16px 24px", background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED, margin: "0 0 8px" }}>
              Enjoyed your visit? · נהנית מהביקור?
            </p>
            <a
              href={business.googleReviewLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700,
                color: G, textDecoration: "none",
              }}
            >
              Leave us a review → השאר לנו ביקורת
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
