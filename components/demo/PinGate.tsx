"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Props {
  onUnlock: () => void;
}

const CORRECT_PIN = "2026";

export default function PinGate({ onUnlock }: Props) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    const pin = next.join("");
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        sessionStorage.setItem("demoUnlocked", "1");
        setTimeout(onUnlock, 400);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => {
          setShake(false);
          setError(false);
          setDigits(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        }, 700);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--v-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        zIndex: 1000,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--v-green)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          vomni
        </div>
        <div
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 28,
            fontWeight: 800,
            color: "var(--v-text-1)",
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Demo
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            color: "var(--v-text-2)",
          }}
        >
          Enter your PIN to continue
        </div>
      </div>

      <motion.div
        animate={shake ? { x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.55 }}
        style={{ display: "flex", gap: 12 }}
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              width: 60,
              height: 68,
              borderRadius: 14,
              border: `1.5px solid ${error ? "var(--v-red)" : digit ? "var(--v-green)" : "var(--v-border)"}`,
              background: "var(--v-surface)",
              color: "var(--v-text-1)",
              fontSize: 26,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textAlign: "center",
              outline: "none",
              transition: "border-color 150ms",
              caretColor: "transparent",
            }}
          />
        ))}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: "var(--v-red)",
          }}
        >
          Wrong PIN — try again
        </motion.div>
      )}
    </motion.div>
  );
}
