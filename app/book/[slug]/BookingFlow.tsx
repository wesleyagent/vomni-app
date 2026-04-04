"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DataOwnershipBadge from "@/components/DataOwnershipBadge";
import { formatPrice, formatDuration, formatBookingDate, generateICS } from "@/lib/booking-utils";
import {
  DAY_NAMES_SHORT_HE, DAY_NAMES_SHORT_EN,
  MONTH_NAMES_HE, MONTH_NAMES_EN,
} from "@/types/booking";

const G = "#00C896";
const GD = "#00A87D";
const N = "#0A0F1E";
const GREY = "#F7F8FA";
const BORDER = "#E5E7EB";
const MUTED = "#9CA3AF";
const SECONDARY = "#6B7280";

interface BusinessData {
  id: string;
  name: string | null;
  logo_url: string | null;
  booking_buffer_minutes: number;
  booking_advance_days: number;
  booking_cancellation_hours: number;
  booking_confirmation_message: string | null;
  booking_confirmation_message_he: string | null;
  booking_currency: string;
  booking_timezone: string;
  require_phone: boolean;
  require_email: boolean;
}

interface ServiceData {
  id: string;
  name: string;
  name_he: string | null;
  description: string | null;
  description_he: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
}

interface StaffData {
  id: string;
  name: string;
  name_he: string | null;
  avatar_url: string | null;
}

interface SlotData {
  time: string;
  available: boolean;
}

type Lang = "en" | "he";

const t = (en: string, he: string, lang: Lang) => lang === "he" ? he : en;

export default function BookingFlow({ slug }: { slug: string }) {
  const lang = "en" as Lang;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(null);

  // Data
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [staff, setStaff] = useState<StaffData[]>([]);
  const [staffServices, setStaffServices] = useState<{ staff_id: string; service_id: string }[]>([]);

  // Selection
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Calendar
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation
  const [confirmed, setConfirmed] = useState<{
    id: string;
    appointment_at: string;
    service_name: string;
    service_duration_minutes: number;
    service_price: number | null;
    staff_name: string | null;
    business_name: string;
    cancellation_token: string;
  } | null>(null);

  // Refs for smooth scroll
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const isRTL = lang === "he";
  const dir = isRTL ? "rtl" : "ltr";

  // Load business data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/booking/${slug}`);
        if (!res.ok) {
          setError(lang === "he" ? "העסק לא נמצא" : "Business not found");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setBusiness(data.business);
        setServices(data.services);
        setStaff(data.staff);
        setStaffServices(data.staffServices);
      } catch {
        setError(lang === "he" ? "שגיאה בטעינה" : "Failed to load");
      }
      setLoading(false);
    })();
  }, [slug, lang]);

  // Load available slots when date/service/staff changes
  const loadSlots = useCallback(async (date: string, serviceId: string, staffId: string) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/booking/${slug}/availability?date=${date}&service_id=${serviceId}&staff_id=${staffId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots ?? []);
      }
    } catch { /* silently fail */ }
    setLoadingSlots(false);
  }, [slug]);

  useEffect(() => {
    if (selectedDate && selectedService) {
      loadSlots(selectedDate, selectedService, selectedStaff);
    }
  }, [selectedDate, selectedService, selectedStaff, loadSlots]);

  // Smooth scroll helper
  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }

  // Service selection
  function handleServiceSelect(id: string) {
    setSelectedService(id);
    setSelectedTime(null);
    setSlots([]);
    // Auto-skip staff if only 1
    if (staff.length <= 1) {
      setSelectedStaff(staff.length === 1 ? staff[0].id : "any");
      scrollTo(step3Ref);
    } else {
      scrollTo(step2Ref);
    }
  }

  // Staff selection
  function handleStaffSelect(id: string) {
    setSelectedStaff(id);
    setSelectedTime(null);
    setSlots([]);
    scrollTo(step3Ref);
  }

  // Date selection
  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedTime(null);
  }

  // Time selection
  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    scrollTo(step4Ref);
  }

  // Submit booking
  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime || !firstName || !lastName || !phone) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/booking/${slug}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: selectedService,
          staff_id: selectedStaff,
          date: selectedDate,
          time: selectedTime,
          first_name: firstName,
          last_name: lastName,
          phone,
          email: email || undefined,
          notes: notes || undefined,
          send_reminder: sendReminder,
          marketing_consent: marketingConsent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfirmed(data.booking);
      } else {
        const data = await res.json();
        alert(data.error ?? (lang === "he" ? "שגיאה ביצירת ההזמנה" : "Failed to create booking"));
      }
    } catch {
      alert(lang === "he" ? "שגיאה בחיבור" : "Connection error");
    }
    setSubmitting(false);
  }

  // ICS download
  function downloadICS() {
    if (!confirmed) return;
    const ics = generateICS({
      service_name: confirmed.service_name,
      business_name: confirmed.business_name,
      appointment_at: confirmed.appointment_at,
      duration_minutes: confirmed.service_duration_minutes,
      staff_name: confirmed.staff_name ?? undefined,
    });
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appointment.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay(); // 0=Sunday
  }

  function isDateInPast(dateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  }

  function isDateTooFar(dateStr: string) {
    if (!business) return false;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + business.booking_advance_days);
    return new Date(dateStr) > maxDate;
  }

  function dateStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 440, padding: "0 20px", boxSizing: "border-box" }}>
          {/* Skeleton cards */}
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              width: "100%", height: 80, borderRadius: 16,
              background: `linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }} />
          ))}
          <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !business) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, color: N, margin: "0 0 8px" }}>
            {error || "Page not found"}
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY }}>
            {t("This booking page doesn't exist or is currently disabled.", "עמוד ההזמנות לא נמצא או אינו פעיל כרגע.", lang)}
          </p>
        </div>
      </div>
    );
  }

  // ── Confirmation screen ──
  if (confirmed) {
    return (
      <div dir={dir} style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          {/* Animated checkmark */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: G, margin: "0 auto 24px",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "scaleIn 0.4s ease-out",
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 24, strokeDashoffset: 0, animation: "drawCheck 0.5s ease-out 0.3s both" }} />
            </svg>
          </div>
          <style>{`
            @keyframes scaleIn { 0% { transform: scale(0); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
            @keyframes drawCheck { 0% { stroke-dashoffset: 24; } 100% { stroke-dashoffset: 0; } }
          `}</style>

          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, margin: "0 0 8px" }}>
            {t("Booking Confirmed!", "ההזמנה אושרה!", lang)}
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY, margin: "0 0 32px" }}>
            {t("We've sent a confirmation to your phone.", "שלחנו אישור לטלפון שלך.", lang)}
          </p>

          {/* Summary card */}
          <div style={{
            background: GREY, borderRadius: 16, padding: 24, textAlign: isRTL ? "right" : "left", marginBottom: 24,
          }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, marginBottom: 16 }}>
              {confirmed.service_name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {confirmed.staff_name && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
                  👤 {confirmed.staff_name}
                </div>
              )}
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
                📅 {formatBookingDate(confirmed.appointment_at.substring(0, 10), lang)} {t("at", "בשעה", lang)} {confirmed.appointment_at.substring(11, 16)}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
                ⏱ {formatDuration(confirmed.service_duration_minutes, lang)}
              </div>
              {confirmed.service_price != null && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
                  💰 {formatPrice(confirmed.service_price, business.booking_currency, lang)}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={downloadICS}
              style={{
                background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9999,
                padding: "12px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                color: N, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              📅 {t("Add to Calendar", "הוסף ליומן", lang)}
            </button>
            {typeof navigator !== "undefined" && navigator.share && (
              <button
                onClick={() => {
                  navigator.share({
                    title: t("My Appointment", "הפגישה שלי", lang),
                    text: `${confirmed.service_name} - ${confirmed.business_name}\n${confirmed.appointment_at.substring(0, 10)} ${confirmed.appointment_at.substring(11, 16)}`,
                  });
                }}
                style={{
                  background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9999,
                  padding: "12px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                  color: N, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}
              >
                📤 {t("Share", "שתף", lang)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main booking flow ──
  const selectedServiceData = services.find(s => s.id === selectedService);
  const dayNames = isRTL ? DAY_NAMES_SHORT_HE : DAY_NAMES_SHORT_EN;
  const monthNames = isRTL ? MONTH_NAMES_HE : MONTH_NAMES_EN;

  // Filter staff by selected service
  const eligibleStaff = selectedService
    ? staff.filter(s => staffServices.some(ss => ss.staff_id === s.id && ss.service_id === selectedService))
    : staff;

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "#fff" }}>
      {/* Header */}
      <header style={{
        padding: "24px 20px 20px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: G, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18,
            }}>
              {(business.name ?? "B")[0]}
            </div>
          )}
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
            {business.name}
          </h1>
        </div>
      </header>

      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
        {([
          { label: t("Service", "שירות", lang), done: !!selectedService, skip: false },
          { label: t("Staff", "צוות", lang), done: selectedStaff !== "any" || staff.length <= 1, skip: staff.length <= 1 },
          { label: t("Date & Time", "תאריך", lang), done: !!selectedDate && !!selectedTime, skip: false },
          { label: t("Details", "פרטים", lang), done: false, skip: false },
        ] as { label: string; done: boolean; skip: boolean }[]).filter(s => !s.skip).map((s, i) => (
          <div key={i} style={{ display: "flex", flex: 1, alignItems: "center", maxWidth: 80 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: s.done ? G : BORDER, transition: "background 0.3s" }} />
          </div>
        ))}
      </div>

      {/* Sticky summary bar — appears once service and time are selected */}
      {selectedService && selectedTime && selectedDate && (
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "#fff", borderBottom: `1px solid ${BORDER}`,
          padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: N, overflow: "hidden", flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 600 }}>{selectedServiceData ? (isRTL && selectedServiceData.name_he ? selectedServiceData.name_he : selectedServiceData.name) : ""}</span>
            <span style={{ color: SECONDARY }}>{" · "}{selectedDate} {t("at", "ב-", lang)} {selectedTime}</span>
          </div>
          <button
            onClick={() => { setSelectedTime(null); setSelectedDate(null); }}
            style={{ background: "none", border: "none", color: SECONDARY, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {t("Change", "שנה", lang)}
          </button>
        </div>
      )}

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 60px" }}>

        {/* ── STEP 1: Choose Service ── */}
        <section style={{ padding: "32px 0 0" }}>
          <h2 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N,
            margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: "50%", background: G, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700,
            }}>1</span>
            {t("Choose a Service", "בחר שירות", lang)}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {services.map(svc => {
              const isSelected = selectedService === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => handleServiceSelect(svc.id)}
                  style={{
                    background: "#fff",
                    border: isSelected ? `2px solid ${G}` : `1px solid ${BORDER}`,
                    borderRadius: 16, padding: "20px 24px",
                    cursor: "pointer", textAlign: isRTL ? "right" : "left",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    boxShadow: isSelected ? `0 0 0 3px rgba(0,200,150,0.15)` : "0 2px 8px rgba(0,0,0,0.06)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 600, color: N, marginBottom: 6 }}>
                      {isRTL && svc.name_he ? svc.name_he : svc.name}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED }}>
                      <span>⏱ {formatDuration(svc.duration_minutes, lang)}</span>
                      <span>💰 {formatPrice(svc.price, svc.currency, lang)}</span>
                    </div>
                  </div>
                  <span style={{ color: isSelected ? G : MUTED, fontSize: 20, transform: isRTL ? "scaleX(-1)" : "none" }}>›</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── STEP 2: Choose Staff (skip if 1 or fewer) ── */}
        {selectedService && staff.length > 1 && (
          <section ref={step2Ref} style={{ padding: "32px 0 0", animation: "fadeInUp 0.3s ease-out" }}>
            <style>{`@keyframes fadeInUp { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
            <h2 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N,
              margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", background: G, color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700,
              }}>2</span>
              {t("Choose Staff", "בחר איש צוות", lang)}
            </h2>

            <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
              {/* Any available */}
              <button
                onClick={() => handleStaffSelect("any")}
                style={{
                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "16px 20px", borderRadius: 16, cursor: "pointer",
                  background: "#fff",
                  border: selectedStaff === "any" ? `2px solid ${G}` : `1px solid ${BORDER}`,
                  boxShadow: selectedStaff === "any" ? `0 0 0 3px rgba(0,200,150,0.15)` : "0 2px 8px rgba(0,0,0,0.06)",
                  minWidth: 100,
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: GREY,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Inter, sans-serif", fontSize: 20, color: MUTED,
                }}>✦</div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: N, whiteSpace: "nowrap" }}>
                  {t("Any Available", "כל פנוי", lang)}
                </span>
              </button>

              {eligibleStaff.map(s => {
                const isSelected = selectedStaff === s.id;
                const initials = s.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStaffSelect(s.id)}
                    style={{
                      flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      padding: "16px 20px", borderRadius: 16, cursor: "pointer",
                      background: "#fff",
                      border: isSelected ? `2px solid ${G}` : `1px solid ${BORDER}`,
                      boxShadow: isSelected ? `0 0 0 3px rgba(0,200,150,0.15)` : "0 2px 8px rgba(0,0,0,0.06)",
                      minWidth: 100,
                    }}
                  >
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%", background: G, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18,
                      }}>{initials}</div>
                    )}
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: N, whiteSpace: "nowrap" }}>
                      {isRTL && s.name_he ? s.name_he : s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── STEP 3: Date & Time ── */}
        {selectedService && (staff.length <= 1 || selectedStaff) && (
          <section ref={step3Ref} style={{ padding: "32px 0 0", animation: "fadeInUp 0.3s ease-out" }}>
            <h2 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N,
              margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", background: G, color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700,
              }}>{staff.length > 1 ? "3" : "2"}</span>
              {t("Choose Date & Time", "בחר תאריך ושעה", lang)}
            </h2>

            {/* Smart shortcuts */}
            {selectedService && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <button
                  onClick={async () => {
                    if (!selectedService) return;
                    const res = await fetch(`/api/booking/${slug}/availability?find=next_today&service_id=${selectedService}&staff_id=${selectedStaff}`);
                    if (res.ok) {
                      const data = await res.json();
                      if (data.date) {
                        setNextAvailableDate(data.date);
                        const d = new Date(data.date + "T00:00:00");
                        setCalMonth(d.getMonth()); setCalYear(d.getFullYear());
                        handleDateSelect(data.date);
                      }
                    }
                  }}
                  style={{
                    background: `${G}12`, color: G, border: `1px solid ${G}30`,
                    borderRadius: 9999, padding: "6px 14px",
                    fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  ⚡ {t("Next available today", "פנוי היום", lang)}
                </button>
                <button
                  onClick={async () => {
                    if (!selectedService) return;
                    const res = await fetch(`/api/booking/${slug}/availability?find=next_week&service_id=${selectedService}&staff_id=${selectedStaff}`);
                    if (res.ok) {
                      const data = await res.json();
                      if (data.date) {
                        setNextAvailableDate(data.date);
                        const d = new Date(data.date + "T00:00:00");
                        setCalMonth(d.getMonth()); setCalYear(d.getFullYear());
                        handleDateSelect(data.date);
                      }
                    }
                  }}
                  style={{
                    background: GREY, color: SECONDARY, border: `1px solid ${BORDER}`,
                    borderRadius: 9999, padding: "6px 14px",
                    fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  📅 {t("First available this week", "ראשון פנוי השבוע", lang)}
                </button>
                {nextAvailableDate && (
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: G, alignSelf: "center" }}>
                    {nextAvailableDate}
                  </span>
                )}
              </div>
            )}

            {/* Calendar */}
            <div style={{
              background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16,
              padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              {/* Month navigation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                    else setCalMonth(m => m - 1);
                  }}
                  style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: 20, color: SECONDARY,
                    padding: 8, borderRadius: 8, transform: isRTL ? "scaleX(-1)" : "none",
                  }}
                >‹</button>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N }}>
                  {monthNames[calMonth]} {calYear}
                </span>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                    else setCalMonth(m => m + 1);
                  }}
                  style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: 20, color: SECONDARY,
                    padding: 8, borderRadius: 8, transform: isRTL ? "scaleX(-1)" : "none",
                  }}
                >›</button>
              </div>

              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {dayNames.map((d, i) => (
                  <div key={i} style={{
                    textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                    color: MUTED, padding: "4px 0",
                  }}>{d}</div>
                ))}
              </div>

              {/* Calendar days */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {/* Empty cells before first day */}
                {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Days */}
                {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
                  const day = i + 1;
                  const ds = dateStr(calYear, calMonth, day);
                  const isPast = isDateInPast(ds);
                  const isTooFar = isDateTooFar(ds);
                  const isDisabled = isPast || isTooFar;
                  const isSelected = selectedDate === ds;
                  const isToday = ds === new Date().toISOString().substring(0, 10);

                  return (
                    <button
                      key={day}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleDateSelect(ds)}
                      style={{
                        width: "100%", aspectRatio: "1", borderRadius: "50%",
                        border: isToday && !isSelected ? `1px solid ${G}` : "none",
                        background: isSelected ? G : "transparent",
                        color: isSelected ? "#fff" : isDisabled ? "#D1D5DB" : N,
                        fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: isSelected ? 700 : 500,
                        cursor: isDisabled ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 600, color: N,
                  margin: "0 0 12px",
                }}>
                  {t("Available Times", "שעות פנויות", lang)}
                </h3>

                {loadingSlots ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} style={{
                        height: 44, borderRadius: 12, background: GREY,
                        backgroundSize: "200% 100%",
                        backgroundImage: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                      }} />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: MUTED, margin: "0 0 16px" }}>
                      {t("No available times for this date. Try another date or join the waitlist.", "אין שעות פנויות לתאריך זה. נסה תאריך אחר או הצטרף לרשימת ההמתנה.", lang)}
                    </p>
                    {selectedService && selectedDate && firstName && phone ? (
                      <button
                        onClick={async () => {
                          await fetch(`/api/booking/${slug}/waitlist`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              date: selectedDate,
                              service_id: selectedService,
                              staff_id: selectedStaff !== "any" ? selectedStaff : undefined,
                              customer_name: `${firstName} ${lastName}`.trim(),
                              customer_phone: phone,
                            }),
                          });
                          alert(t("You're on the waitlist! We'll SMS you if a slot opens.", "נוספת לרשימת ההמתנה! נשלח לך SMS אם יפתח מקום.", lang));
                        }}
                        style={{
                          padding: "10px 24px", borderRadius: 9999, background: N, color: "#fff",
                          border: "none", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {t("Join Waitlist", "הצטרף לרשימת ההמתנה", lang)}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                    {slots.map(slot => {
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          style={{
                            padding: "12px 16px", borderRadius: 12,
                            background: isSelected ? G : "#fff",
                            border: isSelected ? `2px solid ${G}` : `1px solid ${BORDER}`,
                            color: isSelected ? "#fff" : N,
                            fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: isSelected ? `0 0 0 3px rgba(0,200,150,0.15)` : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── STEP 4: Your Details ── */}
        {selectedTime && (
          <section ref={step4Ref} style={{ padding: "32px 0 0", animation: "fadeInUp 0.3s ease-out" }}>
            <h2 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N,
              margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", background: G, color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700,
              }}>{staff.length > 1 ? "4" : "3"}</span>
              {t("Your Details", "הפרטים שלך", lang)}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>
                    {t("First Name", "שם פרטי", lang)} *
                  </label>
                  <input
                    value={firstName} onChange={e => setFirstName(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: 12,
                      border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 15,
                      color: N, outline: "none", boxSizing: "border-box",
                      direction: isRTL ? "rtl" : "ltr",
                    }}
                    onFocus={e => e.target.style.borderColor = G}
                    onBlur={e => e.target.style.borderColor = BORDER}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>
                    {t("Last Name", "שם משפחה", lang)} *
                  </label>
                  <input
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: 12,
                      border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 15,
                      color: N, outline: "none", boxSizing: "border-box",
                      direction: isRTL ? "rtl" : "ltr",
                    }}
                    onFocus={e => e.target.style.borderColor = G}
                    onBlur={e => e.target.style.borderColor = BORDER}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>
                  {t("Phone Number", "מספר טלפון", lang)} *
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{
                    padding: "12px 14px", borderRadius: 12, border: `1px solid ${BORDER}`,
                    fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY,
                    background: GREY, flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    🇮🇱 +972
                  </div>
                  <input
                    value={phone} onChange={e => setPhone(e.target.value)}
                    type="tel" placeholder="50-123-4567"
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: 12,
                      border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 15,
                      color: N, outline: "none", direction: "ltr",
                    }}
                    onFocus={e => e.target.style.borderColor = G}
                    onBlur={e => e.target.style.borderColor = BORDER}
                  />
                </div>
              </div>

              {/* Marketing consent */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY,
              }}>
                <input
                  type="checkbox" checked={marketingConsent}
                  onChange={e => setMarketingConsent(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: G, marginTop: 2, flexShrink: 0 }}
                />
                <span>
                  Send me reminders when it&apos;s time to rebook
                  <br />
                  <span style={{ direction: "rtl", display: "block", marginTop: 2 }}>שלחו לי תזכורת כשהגיע הזמן לקבוע תור חדש</span>
                </span>
              </label>

              {/* Email */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>
                  {t("Email", "אימייל", lang)} {business.require_email ? "*" : t("(optional)", "(אופציונלי)", lang)}
                </label>
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  type="email"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 15,
                    color: N, outline: "none", boxSizing: "border-box", direction: "ltr",
                  }}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = BORDER}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: SECONDARY, marginBottom: 6, display: "block" }}>
                  {t("Anything we should know?", "משהו שנרצה לדעת?", lang)} {t("(optional)", "(אופציונלי)", lang)}
                </label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 15,
                    color: N, outline: "none", resize: "vertical", boxSizing: "border-box",
                    direction: isRTL ? "rtl" : "ltr",
                  }}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = BORDER}
                />
              </div>

              {/* Reminder checkbox */}
              <label style={{
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY,
              }}>
                <input
                  type="checkbox" checked={sendReminder}
                  onChange={e => setSendReminder(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: G }}
                />
                {t("Send me appointment reminders via WhatsApp", "שלח לי תזכורות לתורים בוואטסאפ", lang)}
              </label>

              {/* Summary card */}
              {selectedServiceData && (
                <div style={{
                  background: GREY, borderRadius: 16, padding: 20, marginTop: 8,
                }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N, marginBottom: 12 }}>
                    {t("Appointment Summary", "סיכום הפגישה", lang)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
                    <div>{isRTL && selectedServiceData.name_he ? selectedServiceData.name_he : selectedServiceData.name} · {formatDuration(selectedServiceData.duration_minutes, lang)}</div>
                    {selectedStaff !== "any" && (
                      <div>👤 {staff.find(s => s.id === selectedStaff)?.name}</div>
                    )}
                    <div>📅 {selectedDate && formatBookingDate(selectedDate, lang)} {t("at", "בשעה", lang)} {selectedTime}</div>
                    {selectedServiceData.price != null && (
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 4 }}>
                        {formatPrice(selectedServiceData.price, selectedServiceData.currency, lang)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !firstName || !lastName || !phone || (business.require_email && !email)}
                style={{
                  width: "100%", padding: "18px 24px", borderRadius: 9999,
                  background: (submitting || !firstName || !lastName || !phone) ? "#D1D5DB" : G,
                  color: "#fff", border: "none",
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700,
                  cursor: (submitting || !firstName || !lastName || !phone) ? "default" : "pointer",
                  transition: "background 0.15s",
                  marginTop: 8,
                }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget).style.background = GD; }}
                onMouseLeave={e => { if (!submitting) (e.currentTarget).style.background = G; }}
              >
                {submitting
                  ? t("Booking...", "מזמין...", lang)
                  : t("Confirm Booking", "אישור הזמנה", lang)
                }
              </button>
            </div>
          </section>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "16px 24px 32px" }}>
        <DataOwnershipBadge />
      </div>
    </div>
  );
}
