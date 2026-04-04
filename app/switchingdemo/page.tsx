"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PinGate from "@/components/demo/PinGate";
import SetupBar from "@/components/demo/SetupBar";
import StepUpload from "@/components/demo/StepUpload";
import StepImport from "@/components/demo/StepImport";
import StepSync from "@/components/demo/StepSync";
import StepResults from "@/components/demo/StepResults";
import RevealBridge from "@/components/demo/RevealBridge";
import type { SetupConfig } from "@/components/demo/SetupBar";
import type { ParsedData } from "@/components/demo/StepUpload";
import type { ImportResult } from "@/components/demo/StepImport";
import type { SyncResult } from "@/components/demo/StepSync";
import { Check } from "@phosphor-icons/react";

const STEPS = ["Upload", "Import", "Analyse", "Results"] as const;

function ProgressPills({ current }: { current: number }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: "10px 20px",
      background: "#ffffff",
      borderBottom: "1px solid #E5E7EB",
    }}>
      {STEPS.map((label, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 14px", borderRadius: 9999,
              background: isActive ? "#00C896" : isDone ? "#D1FAE5" : "#ffffff",
              border: isActive ? "none" : isDone ? "none" : "1px solid #E5E7EB",
              transition: "all 250ms ease",
            }}>
              {isDone && <Check size={11} color="#065F46" weight="bold" />}
              <span style={{
                fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                color: isActive ? "#ffffff" : isDone ? "#065F46" : "#9CA3AF",
                letterSpacing: "0.01em",
              }}>
                {i + 1} {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 14, height: 1,
                background: i < current ? "var(--v-green)" : "var(--v-border)",
                opacity: 0.5, transition: "background 300ms",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CalmarkDemoPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [step, setStep] = useState(0);
  const [showReveal, setShowReveal] = useState(false);
  const [setup, setSetup] = useState<SetupConfig>({ token: "", cronSecret: "", businessId: "" });
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("demoUnlocked") === "1") setUnlocked(true);
  }, []);

  if (!unlocked) {
    return (
      <AnimatePresence>
        <PinGate onUnlock={() => setUnlocked(true)} />
      </AnimatePresence>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--v-bg)", color: "var(--v-text-1)" }}>
      {/* Reveal bridge — full-screen overlay */}
      <AnimatePresence>
        {showReveal && (
          <RevealBridge
            onComplete={() => {
              setShowReveal(false);
              setStep(3);
            }}
          />
        )}
      </AnimatePresence>

      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <SetupBar config={setup} onChange={setSetup} />
        <ProgressPills current={step} />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="upload">
            <StepUpload
              onComplete={(data) => { setParsedData(data); setStep(1); }}
            />
          </motion.div>
        )}

        {step === 1 && parsedData && (
          <motion.div key="import">
            <StepImport
              parsedData={parsedData}
              setup={setup}
              onComplete={(result) => { setImportResult(result); setStep(2); }}
            />
          </motion.div>
        )}

        {step === 2 && importResult && (
          <motion.div key="sync">
            <StepSync
              importResult={importResult}
              setup={setup}
              onComplete={(result) => {
                setSyncResult(result);
                // Trigger dramatic reveal before showing results
                setShowReveal(true);
              }}
            />
          </motion.div>
        )}

        {step === 3 && parsedData && importResult && syncResult && !showReveal && (
          <motion.div key="results">
            <StepResults
              parsedData={parsedData}
              importResult={importResult}
              syncResult={syncResult}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
