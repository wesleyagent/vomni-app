"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

const G = "#00C896";

interface UpsellLockProps {
  /** Which plan unlocks this feature */
  requiredPlan?: "Growth" | "Pro";
  /** Short description of the locked feature */
  featureName: string;
  children?: React.ReactNode;
  /** If true, overlay children instead of replacing them */
  overlay?: boolean;
}

/**
 * Wraps a locked UI section with a blur overlay and upgrade CTA.
 * Usage:
 *   <UpsellLock featureName="AI Insights" requiredPlan="Growth">
 *     <YourComponent />
 *   </UpsellLock>
 */
export default function UpsellLock({ requiredPlan = "Growth", featureName, children, overlay = true }: UpsellLockProps) {
  const router = useRouter();

  const lockOverlay = (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      borderRadius: "inherit",
      padding: 24,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "rgba(0,200,150,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 12,
      }}>
        <Lock size={22} style={{ color: G }} />
      </div>
      <p style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 16, fontWeight: 700, color: "#0A0F1E",
        margin: "0 0 4px", textAlign: "center",
      }}>
        {featureName}
      </p>
      <p style={{
        fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280",
        margin: "0 0 16px", textAlign: "center",
      }}>
        Available on the {requiredPlan} plan
      </p>
      <button
        onClick={() => router.push("/dashboard/upgrade")}
        style={{
          padding: "10px 22px", borderRadius: 9999, border: "none",
          background: G, color: "#fff",
          fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
          cursor: "pointer",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        Upgrade to {requiredPlan} →
      </button>
    </div>
  );

  if (!overlay || !children) {
    return (
      <div style={{ position: "relative", borderRadius: 12 }}>
        {lockOverlay}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      {lockOverlay}
    </div>
  );
}
