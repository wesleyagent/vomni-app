"use client";

import { useState, useEffect } from "react";
import { formatBookingDate, formatDuration } from "@/lib/booking-utils";
import { useParams } from "next/navigation";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const MUTED = "#9CA3AF";
const GREY = "#F7F8FA";

type Lang = "en" | "he";
const t = (en: string, he: string, lang: Lang) => lang === "he" ? he : en;

export default function CancelPage() {
  const params = useParams();
  const token = params.token as string;
  const lang = "en" as Lang;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<{
    id: string; customer_name: string; service_name: string;
    service_duration_minutes: number; appointment_at: string;
    status: string; business_name: string; logo_url: string | null;
  } | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const [alreadyCancelled, setAlreadyCancelled] = useState(false);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/booking/cancel/${token}`);
        if (!res.ok) {
          setError(t("Booking not found", "ההזמנה לא נמצאה", lang));
          setLoading(false);
          return;
        }
        const data = await res.json();
        setBooking(data.booking);
        setCanCancel(data.can_cancel ?? false);
        setAlreadyCancelled(data.already_cancelled ?? false);
        setCancellationHours(data.cancellation_hours ?? 24);
      } catch {
        setError(t("Failed to load", "שגיאה בטעינה", lang));
      }
      setLoading(false);
    })();
  }, [token, lang]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/booking/cancel/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setCancelled(true);
      } else {
        const data = await res.json();
        alert(data.error ?? t("Failed to cancel", "שגיאה בביטול", lang));
      }
    } catch {
      alert(t("Connection error", "שגיאה בחיבור", lang));
    }
    setCancelling(false);
  }

  const isRTL = lang === "he";
  const dir = isRTL ? "rtl" : "ltr";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, color: N }}>{error}</h1>
        </div>
      </div>
    );
  }

  if (cancelled || alreadyCancelled) {
    return (
      <div dir={dir} style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "#F3F4F6", margin: "0 auto 24px",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
          }}>✕</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: "0 0 8px" }}>
            {t("Appointment Cancelled", "הפגישה בוטלה", lang)}
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY }}>
            {t(
              `Your appointment at ${booking.business_name} has been cancelled.`,
              `הפגישה שלך ב-${booking.business_name} בוטלה.`,
              lang,
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        {/* Header */}

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: "0 0 8px" }}>
          {t("Cancel Appointment?", "לבטל את הפגישה?", lang)}
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY, margin: "0 0 28px" }}>
          {booking.business_name}
        </p>

        {/* Booking details */}
        <div style={{
          background: GREY, borderRadius: 16, padding: 24, textAlign: isRTL ? "right" : "left", marginBottom: 24,
        }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, marginBottom: 12 }}>
            {booking.service_name}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY, marginBottom: 6 }}>
            📅 {formatBookingDate(booking.appointment_at.substring(0, 10), lang)} {t("at", "בשעה", lang)} {booking.appointment_at.substring(11, 16)}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
            ⏱ {formatDuration(booking.service_duration_minutes, lang)}
          </div>
        </div>

        {canCancel ? (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              width: "100%", padding: "16px 24px", borderRadius: 9999,
              background: "#EF4444", color: "#fff", border: "none",
              fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700,
              cursor: cancelling ? "default" : "pointer",
              opacity: cancelling ? 0.7 : 1,
            }}
          >
            {cancelling
              ? t("Cancelling...", "מבטל...", lang)
              : t("Cancel Appointment", "ביטול הפגישה", lang)
            }
          </button>
        ) : (
          <div style={{
            padding: 20, borderRadius: 16, background: "#FEF3C7",
            fontFamily: "Inter, sans-serif", fontSize: 14, color: "#92400E",
          }}>
            {t(
              `Cancellations must be made at least ${cancellationHours} hours before the appointment.`,
              `ניתן לבטל עד ${cancellationHours} שעות לפני הפגישה.`,
              lang,
            )}
          </div>
        )}
      </div>
    </div>
  );
}
