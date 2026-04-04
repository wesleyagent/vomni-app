"use client";

import { motion } from "framer-motion";

interface Props {
  lapsedCount: number;
  sampleName?: string;
  sampleWeeks?: number;
}

export default function WhatsAppPreview({
  lapsedCount,
  sampleName = "Yoni",
  sampleWeeks = 9,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      style={{
        background: "var(--v-surface)",
        border: "1px solid var(--v-border)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--v-border)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>📱</span>
        <span style={{
          fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
          color: "var(--v-text-1)",
        }}>
          WhatsApp message — sending today
        </span>
      </div>

      <div style={{ padding: "18px 20px" }}>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 12,
          color: "var(--v-text-muted)", marginBottom: 12,
        }}>
          Your business via Vomni
        </div>

        <div style={{
          background: "var(--v-surface-2)", borderRadius: 12,
          padding: "14px 16px", marginBottom: 12,
        }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 14,
            color: "var(--v-text-1)", lineHeight: 1.6, margin: 0,
          }}>
            &ldquo;Hi {sampleName}, it&apos;s been {sampleWeeks}{" "}weeks since
            your last visit. Ready to book your next appointment? 👇&rdquo;
          </p>
        </div>

        <div style={{
          background: "var(--v-green)", borderRadius: 9999,
          padding: "10px 20px", textAlign: "center", marginBottom: 14,
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
            color: "#ffffff",
          }}>
            Book now →
          </span>
        </div>

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--v-text-2)" }}>
          Will send to{" "}
          <span style={{ color: "var(--v-text-1)", fontWeight: 600 }}>
            {lapsedCount} customers
          </span>{" "}
          at 10:00am
        </div>
      </div>
    </motion.div>
  );
}
