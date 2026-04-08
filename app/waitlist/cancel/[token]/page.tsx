"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";
const GREY = "#F7F8FA";

export default function WaitlistCancelPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ready" | "done" | "error">("loading");
  const [data, setData] = useState<{
    entry: { status: string; requested_date: string; requested_time: string; customer_name: string };
    business: { name: string | null; logo_url: string | null };
  } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/waitlist/cancel/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setState("error"); return; }
        setData(d);
        if (d.entry.status === "cancelled") { setState("done"); return; }
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [token]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/waitlist/cancel/${token}`, { method: "POST" });
      if (res.ok) {
        setState("done");
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to cancel");
      }
    } catch {
      alert("Connection error — please try again");
    }
    setCancelling(false);
  }

  const card = (children: React.ReactNode) => (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>{children}</div>
    </div>
  );

  if (state === "loading") {
    return card(<div style={{ fontFamily: "Inter, sans-serif", color: SECONDARY, fontSize: 15 }}>Loading…</div>);
  }

  if (state === "done") {
    return card(
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: "0 0 8px" }}>
          Removed from Waitlist
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY }}>
          You&apos;ve been removed from the waitlist. No slot will be offered to you.
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
          This link is invalid or has expired.
        </p>
      </>
    );
  }

  const firstName = data?.entry?.customer_name?.split(" ")[0] ?? "there";

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
        Remove from Waitlist?
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: SECONDARY, margin: "0 0 24px" }}>
        Hi {firstName}, you&apos;re on the waitlist for {data?.business?.name}.
      </p>

      <div style={{ background: GREY, borderRadius: 16, padding: 20, textAlign: "left", marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: N }}>
            📅 <strong>{data?.entry?.requested_date}</strong> at <strong>{data?.entry?.requested_time}</strong>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: SECONDARY }}>
            📍 {data?.business?.name}
          </div>
        </div>
      </div>

      <button
        onClick={handleCancel}
        disabled={cancelling}
        style={{
          width: "100%", padding: "16px 24px", borderRadius: 12,
          background: cancelling ? BORDER : "#EF4444", color: cancelling ? SECONDARY : "#fff",
          border: "none", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700,
          cursor: cancelling ? "default" : "pointer", transition: "background 0.2s",
        }}
      >
        {cancelling ? "Removing…" : "Remove Me from Waitlist"}
      </button>

      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: SECONDARY, marginTop: 12 }}>
        You can always rejoin the waitlist if a slot opens up again.
      </p>
    </>
  );
}
