"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: () => void;
}

const LINES = [
  { text: "These customers trust you.", weight: 400, color: "var(--v-text-1)" },
  { text: "They just haven't been asked to come back.", weight: 400, color: "var(--v-text-2)" },
  { text: "Here's what's hiding in your client list.", weight: 800, color: "var(--v-green)" },
];

export default function RevealBridge({ onComplete }: Props) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setLineIndex(1), 1800);
    const t2 = setTimeout(() => setLineIndex(2), 3400);
    const t3 = setTimeout(onComplete, 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--v-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "40px",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={lineIndex}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: "clamp(22px, 4vw, 36px)",
              fontWeight: LINES[lineIndex].weight,
              color: LINES[lineIndex].color,
              lineHeight: 1.25,
              margin: 0,
              letterSpacing: lineIndex === 2 ? "-0.02em" : "0",
            }}
          >
            {LINES[lineIndex].text}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 64,
          alignItems: "center",
        }}
      >
        {LINES.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === lineIndex ? 24 : 6,
              background: i <= lineIndex ? "var(--v-green)" : "#E5E7EB",
            }}
            transition={{ duration: 0.35 }}
            style={{
              height: 6,
              borderRadius: 3,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
