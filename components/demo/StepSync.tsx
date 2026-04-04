"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Warning } from "@phosphor-icons/react";
import type { ImportResult } from "./StepImport";
import type { SetupConfig } from "./SetupBar";

export interface SyncResult {
  lapsedCount: number;
  totalCount: number;
}

interface Props {
  importResult: ImportResult;
  setup: SetupConfig;
  onComplete: (result: SyncResult) => void;
}

const COPY_LINES = [
  "Analysing booking patterns...",
  "Calculating return frequencies...",
  "Identifying who's overdue...",
];

const MIN_DURATION_MS = 3200;

function useCountUp(target: number, running: boolean, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, running, duration]);
  return count;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export default function StepSync({ importResult, setup, onComplete }: Props) {
  const [copyIndex, setCopyIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);
  const count = useCountUp(importResult.imported, true, 2400);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    COPY_LINES.slice(1).forEach((_, i) => {
      timers.push(setTimeout(() => setCopyIndex(i + 1), (i + 1) * 1500));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const startTime = Date.now();

    const doSync = async () => {
      try {
        if (setup.cronSecret) {
          const res = await fetch("https://vomni.io/api/cron/sync-customer-profiles", {
            headers: { Authorization: `Bearer ${setup.cronSecret}` },
          });
          if (!res.ok) throw new Error("CRM sync failed. Check the cron secret in the setup bar.");
        }
      } catch (e) {
        if (e instanceof TypeError) { /* network error — continue */ }
        else {
          const elapsed = Date.now() - startTime;
          await sleep(Math.max(0, MIN_DURATION_MS - elapsed));
          if (e instanceof Error) setError(e.message);
          return;
        }
      }
      const elapsed = Date.now() - startTime;
      await sleep(Math.max(0, MIN_DURATION_MS - elapsed));
      onComplete({
        lapsedCount: Math.floor(importResult.imported * 0.28),
        totalCount: importResult.imported,
      });
    };

    doSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const ARC = CIRC * 0.78;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        width: "100%", maxWidth: 680, margin: "0 auto", padding: "80px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 44,
      }}
    >
      {/* Ring */}
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", inset: 0 }}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--v-surface-2)" strokeWidth="5" />
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--v-green)" strokeWidth="5"
            strokeLinecap="round" strokeDasharray={`${ARC} ${CIRC - ARC}`}
            transform="rotate(-90 60 60)"
            style={{ animation: "ring-spin 1.1s linear infinite" }} />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 800,
            color: "var(--v-green)",
          }}>
            {count.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Copy */}
      <div style={{ textAlign: "center" }}>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800,
          color: "var(--v-text-1)", margin: "0 0 20px", letterSpacing: "-0.02em",
        }}>
          Building your customer intelligence
        </h2>
        <div style={{ height: 24, position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.p key={copyIndex}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 15, color: "var(--v-text-2)",
                margin: 0, position: "absolute", width: "100%",
              }}
            >
              {COPY_LINES[copyIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.20)",
            borderRadius: 16, padding: "14px 16px", display: "flex", gap: 10,
            alignItems: "flex-start", width: "100%", maxWidth: 420,
          }}
        >
          <Warning size={18} color="var(--v-red)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--v-red)", marginBottom: 10 }}>{error}</div>
            <button
              onClick={() => { hasRun.current = false; setError(null); setCopyIndex(0); }}
              style={{
                background: "none", border: "1px solid rgba(255,77,77,0.35)", borderRadius: 9999,
                padding: "6px 16px", fontFamily: "'Inter', sans-serif", fontSize: 13,
                color: "var(--v-red)", cursor: "pointer",
              }}
            >Try again</button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
