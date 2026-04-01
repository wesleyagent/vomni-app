"use client";

import { useState } from "react";
import type { PlatformConfig } from "@/lib/platform-comparison";

const G = "#00C896";
const N = "#0A0F1E";

export default function CostCalculator({ platform }: { platform: PlatformConfig }) {
  const [appointments, setAppointments] = useState(60);
  const [avgPrice, setAvgPrice] = useState(40);
  const [staffCount, setStaffCount] = useState(1);

  const revenue = appointments * avgPrice;

  // Calculate competitor cost
  let competitorCost = 0;
  if (platform.id === "fresha") {
    // 20-30% commission on new client bookings (estimate 40% are new clients)
    competitorCost = Math.round(revenue * 0.4 * 0.25); // 25% avg commission on 40% new
  } else if (platform.id === "booksy") {
    competitorCost = 29.99 + Math.max(0, staffCount - 1) * 20;
  } else if (platform.id === "vagaro") {
    competitorCost = 25 + Math.max(0, staffCount - 1) * 10;
  } else if (platform.id === "treatwell") {
    competitorCost = Math.round(revenue * 0.3 * 0.5); // 30% commission on 50% marketplace
  } else if (platform.id === "mindbody") {
    competitorCost = 129;
  } else {
    competitorCost = 35; // generic comparison
  }

  const vomniCost = 35;
  const saving = Math.max(0, competitorCost - vomniCost);

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 28 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>
            Appointments per month: <strong style={{ color: N }}>{appointments}</strong>
          </label>
          <input
            type="range" min={10} max={300} step={10} value={appointments}
            onChange={e => setAppointments(Number(e.target.value))}
            style={{ width: "100%", accentColor: G }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>
            Average appointment price: <strong style={{ color: N }}>£{avgPrice}</strong>
          </label>
          <input
            type="range" min={10} max={200} step={5} value={avgPrice}
            onChange={e => setAvgPrice(Number(e.target.value))}
            style={{ width: "100%", accentColor: G }}
          />
        </div>
        {(platform.id === "booksy" || platform.id === "vagaro") && (
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>
              Number of staff: <strong style={{ color: N }}>{staffCount}</strong>
            </label>
            <input
              type="range" min={1} max={10} step={1} value={staffCount}
              onChange={e => setStaffCount(Number(e.target.value))}
              style={{ width: "100%", accentColor: G }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 4px" }}>{platform.name}</p>
          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: "#EF4444", margin: "0 0 4px" }}>£{Math.round(competitorCost)}</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>per month in fees</p>
        </div>
        <div style={{ background: "#F0FDF9", border: "1px solid #A7F3D0", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 4px" }}>Vomni</p>
          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: G, margin: "0 0 4px" }}>£{vomniCost}</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>flat per month, everything included</p>
        </div>
      </div>

      {saving > 0 && (
        <div style={{ background: `${G}12`, border: `1px solid ${G}40`, borderRadius: 10, padding: "14px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: G, margin: 0 }}>
            You save £{saving}/month — that&apos;s £{saving * 12}/year 💰
          </p>
        </div>
      )}
    </div>
  );
}
