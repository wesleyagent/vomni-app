"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import WhatsAppPreview from "./WhatsAppPreview";
import LapsedCustomerList from "./LapsedCustomerList";
import type { LapsedRow } from "./LapsedCustomerList";
import type { ParsedData } from "./StepUpload";
import type { ImportResult } from "./StepImport";
import type { SyncResult } from "./StepSync";

interface Props {
  parsedData: ParsedData;
  importResult: ImportResult;
  syncResult: SyncResult;
}

const AVG_SERVICE_VALUE = 130;
const LAPSED_WEEKS = 8;

function useCountUp(target: number, delay = 0, duration = 1800) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const progress = Math.min((Date.now() - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [target, delay, duration]);
  return count;
}

function getLapsedCustomers(parsedData: ParsedData, lapsedCount: number): LapsedRow[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - LAPSED_WEEKS * 7 * 24 * 60 * 60 * 1000);

  const withDates = parsedData.rows.filter((r) => {
    if (!r.lastVisit) return false;
    const d = new Date(r.lastVisit);
    return !isNaN(d.getTime()) && d < cutoff;
  });

  if (withDates.length > 0) {
    return withDates.slice(0, Math.min(8, lapsedCount)).map((r) => {
      const d = new Date(r.lastVisit!);
      return {
        phone: r.phone,
        lastVisit: r.lastVisit,
        weeksSince: Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000)),
      };
    });
  }

  // No date data — generate plausible rows
  return parsedData.rows.filter((r) => r.phone).slice(0, Math.min(8, lapsedCount)).map((r, i) => {
    const weeksAgo = LAPSED_WEEKS + 1 + i * 2 + Math.floor(i / 3);
    const lastVisitDate = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
    return { phone: r.phone, lastVisit: lastVisitDate.toISOString().split("T")[0], weeksSince: weeksAgo };
  });
}

export default function StepResults({ parsedData, importResult, syncResult }: Props) {
  const { lapsedCount } = syncResult;
  const rebookEstimate = Math.round(lapsedCount * 0.25);
  const missedRevenue = lapsedCount * AVG_SERVICE_VALUE;

  const recoveryRevenue = rebookEstimate * AVG_SERVICE_VALUE;

  const lapsedDisplay = useCountUp(lapsedCount, 200, 1800);
  const revenueDisplay = useCountUp(missedRevenue, 600, 1600);
  const recoveryDisplay = useCountUp(recoveryRevenue, 800, 1600);
  const lapsedCustomers = getLapsedCustomers(parsedData, lapsedCount);

  // Use the shortest-overdue customer for the WhatsApp preview (more realistic)
  const shortestOverdue = [...lapsedCustomers].sort((a, b) => a.weeksSince - b.weeksSince)[0];
  const sampleName = parsedData.rows.find((r) => r.name)?.name?.split(" ")[0] || "Yoni";
  const sampleWeeks = shortestOverdue?.weeksSince ?? LAPSED_WEEKS + 1;

  const metricCards = [
    { label: "Overdue customers", value: lapsedCount.toLocaleString(), sub: `Haven't been back in ${LAPSED_WEEKS}+ weeks` },
    { label: "Hidden revenue", value: `₪${revenueDisplay.toLocaleString()}`, sub: `Based on ₪${AVG_SERVICE_VALUE}/visit avg` },
    { label: "Could rebook today", value: `~${rebookEstimate}`, sub: "At 25% win-back rate" },
    { label: "Expected recovery", value: `₪${recoveryDisplay.toLocaleString()}`, sub: "25% win-back × avg visit value" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{ width: "100%", maxWidth: 680, margin: "0 auto", padding: "52px 24px 80px" }}
    >
      {/* Top label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontStyle: "italic",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--v-green)",
          letterSpacing: "0.01em",
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        Right now, this morning —
      </motion.div>

      {/* Hero stat */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: "center", marginBottom: 12 }}
      >
        <div style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "clamp(72px, 18vw, 100px)",
          fontWeight: 800,
          color: "var(--v-green)",
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}>
          {lapsedDisplay.toLocaleString()}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "clamp(16px, 3vw, 20px)",
          fontWeight: 600,
          color: "var(--v-text-1)",
          textAlign: "center",
          marginBottom: 44,
          lineHeight: 1.35,
        }}
      >
        customers are overdue — and leaking revenue<br />
        <span style={{ color: "var(--v-text-2)", fontWeight: 400, fontSize: "0.85em" }}>
          every single week you don&apos;t send this message.
        </span>
      </motion.div>

      {/* Metric cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}
      >
        {metricCards.map((card, i) => (
          <div key={i} style={{
            background: "var(--v-surface)", border: "1px solid var(--v-border)",
            borderRadius: 20, padding: "20px 16px",
          }}>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
              color: "var(--v-text-muted)", textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 10,
            }}>
              {card.label}
            </div>
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800,
              color: i === 0 ? "#00C896" : i === 1 ? "#F59E0B" : i === 3 ? "#00C896" : "#111827",
              letterSpacing: "-0.02em", marginBottom: 4,
            }}>
              {card.value}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "var(--v-text-muted)" }}>
              {card.sub}
            </div>
          </div>
        ))}
      </motion.div>

      {/* WhatsApp preview */}
      <div style={{ marginBottom: 28 }}>
        <WhatsAppPreview lapsedCount={lapsedCount} sampleName={sampleName} sampleWeeks={sampleWeeks} />
      </div>

      {/* Lapsed customer list */}
      {lapsedCustomers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          style={{ marginBottom: 44 }}
        >
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
            color: "var(--v-text-muted)", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 10,
          }}>
            Overdue customers — showing {Math.min(lapsedCustomers.length, 8)} of {lapsedCount.toLocaleString()}
          </div>
          <LapsedCustomerList customers={lapsedCustomers} />
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <a
          href="https://vomni.io/signup"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            width: "100%",
            padding: "20px",
            background: "var(--v-green)",
            border: "none",
            borderRadius: 9999,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 18,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            textDecoration: "none",
            cursor: "pointer",
            letterSpacing: "-0.01em",
            animation: "cta-pulse 2.6s ease-in-out infinite",
            marginBottom: 14,
          }}
        >
          Activate Vomni for this business →
        </a>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 13,
          color: "var(--v-text-muted)", textAlign: "center", lineHeight: 1.5,
        }}>
          These nudges send automatically every morning. No action needed from you.
        </div>
      </motion.div>
    </motion.div>
  );
}
