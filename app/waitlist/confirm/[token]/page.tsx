"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const GREY = "#F7F8FA";

export default function WaitlistConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ready" | "expired" | "already_confirmed" | "error">("loading");
  const [data, setData] = useState<{
    entry: { status: string; requested_date: string; requested_time: string; customer_name: string; expires_at: string | null; is_expired: boolean };
    business: { name: string | null; logo_url: string | null };
    service: { name: string; duration_minutes: number } | null;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/waitlist/confirm/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setState("error"); return; }
        setData(d);
        if (d.entry.status === "confirmed") { setState("already_confirmed"); return; }
        if (d.entry.status === "expired" || d.entry.status === "cancelled" || d.entry.is_expired) {
          setState("expired");
          return;
        }
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [token]);

  async function handleConfirm() {
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/waitlist/confirm/${token}`, { method: "POST" });
      const d = await res.json();
      if (res.ok && d.success) {
        setCancelUrl(d.booking?.cancel_url ?? null);
        setConfirmed(true);
      } else {
        setConfirmError(d.error ?? "Something went wrong");
        if (res.status === 410) setState("expired");
        if (res.status === 409) setConfirmError("This slot was just taken by someone else. We'll check the next person on the waitlist.");
      }
    } catch {
      setConfirmError("Connection error — please try again");
    }
    setConfirming(false);
  }

  if (state === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Inter, sans-serif", color: SECONDARY, fontSize: 15 }}>Loading…</div>
      </div>
    );
  }

  const card = (children: React.ReactNode) => (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>{children}</div>
    </div>
  );

  if (state === "already_confirmed" || confirmed) {
    return card(
      <>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: G, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: "0 0 8px" }}>
          Booking Confirmed!
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY, margin: "0 0 24px" }}>
          {data?.entry?.requested_date && data?.entry?.requested_time
            ? `Your appointment on ${data.entry.requested_date} at ${data.entry.requested_time} is confirmed.`
            : "Your appointment is confirmed."}
        </p>
        {cancelUrl && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: SECONDARY }}>
            Need to cancel? <a href={cancelUrl} style={{ color: G }}>Click here</a>
          </p>
        )}
      </>
    );
  }

  if (state === "expired") {
    return card(
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: "0 0 8px" }}>
          Window Expired
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY }}>
          The 15-minute confirmation window has passed. The slot has been offered to the next person.
        </p>
      </>
    );
  }

  if (state === "error") {
    return card(
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: "0 0 8px" }}>
          Link Not Found
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY }}>
          This confirmation link is invalid or has expired.
        </p>
      </>
    );
  }

  // state === "ready"
  const firstName = data?.entry?.customer_name?.split(" ")[0] ?? "there";
  const expiresAt = data?.entry?.expires_at ? new Date(data.entry.expires_at) : null;

  return card(
    <>
      {data?.business?.logo_url ? (
        <img src={data.business.logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", margin: "0 auto 16px" }} />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: 12, background: G, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 22 }}>
          {(data?.business?.name ?? "B")[0]}
        </div>
      )}

      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: "0 0 8px" }}>
        Hi {firstName}, your slot is ready!
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY, margin: "0 0 24px" }}>
        Confirm your spot at {data?.business?.name} below.
      </p>

      <div style={{ background: GREY, borderRadius: 16, padding: 20, textAlign: "left", marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: N }}>
            📅 <strong>{data?.entry?.requested_date}</strong> at <strong>{data?.entry?.requested_time}</strong>
          </div>
          {data?.service && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
              ✂️ {data.service.name} ({data.service.duration_minutes} min)
            </div>
          )}
          {expiresAt && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#EF4444" }}>
              ⏰ Confirm by {expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {confirmError && (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#EF4444", marginBottom: 16 }}>
          {confirmError}
        </p>
      )}

      <button
        onClick={handleConfirm}
        disabled={confirming}
        style={{
          width: "100%", padding: "16px 24px", borderRadius: 12,
          background: confirming ? BORDER : G, color: confirming ? SECONDARY : "#fff",
          border: "none", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700,
          cursor: confirming ? "default" : "pointer", transition: "background 0.2s",
        }}
      >
        {confirming ? "Confirming…" : "✅ Confirm My Booking"}
      </button>

      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, marginTop: 12 }}>
        If you don&apos;t confirm within 15 minutes, the slot will be offered to the next person.
      </p>
    </>
  );
}
