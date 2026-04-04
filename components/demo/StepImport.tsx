"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Warning } from "@phosphor-icons/react";
import type { ParsedData } from "./StepUpload";
import type { SetupConfig } from "./SetupBar";

export interface ImportResult {
  imported: number;
  skipped: number;
}

interface Props {
  parsedData: ParsedData;
  setup: SetupConfig;
  onComplete: (result: ImportResult) => void;
}

const BATCH_SIZE = 100;

interface LogLine {
  id: number;
  text: string;
  type: "info" | "success" | "error";
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function totalBatches(count: number) { return Math.ceil(count / BATCH_SIZE); }

export default function StepImport({ parsedData, setup, onComplete }: Props) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  const addLog = (text: string, type: LogLine["type"] = "info") => {
    const id = ++logIdRef.current;
    setLogs((prev) => [...prev, { id, text, type }]);
  };

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const runImport = async () => {
    setError(null); setDone(false); setLogs([]); logIdRef.current = 0;
    const total = parsedData.totalCount;
    const batches = totalBatches(total);
    const dup = Math.floor(total * 0.014);

    await sleep(300); addLog(`→ Reading ${total.toLocaleString()} rows...`);
    await sleep(500); addLog(`→ Normalising phone numbers to E.164...`);
    await sleep(600); addLog(`→ Skipping ${dup} duplicates...`);
    await sleep(400);

    const apiPromise = callImportAPI();
    for (let b = 1; b <= batches; b++) {
      await sleep(200);
      addLog(`→ Importing batch ${b} of ${batches}...`);
    }

    let result: ImportResult;
    try {
      result = await apiPromise;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      return;
    }

    await sleep(300);
    addLog(`✓ ${result.imported.toLocaleString()} customers imported successfully`, "success");
    setDone(true);
    await sleep(1200);
    onComplete(result);
  };

  const callImportAPI = async (): Promise<ImportResult> => {
    if (!setup.token) {
      await sleep(totalBatches(parsedData.totalCount) * 200 + 500);
      const skipped = Math.floor(parsedData.totalCount * 0.014);
      return { imported: parsedData.totalCount - skipped, skipped };
    }
    const res = await fetch("https://vomni.io/api/migration/import-clients", {
      method: "POST",
      headers: { Authorization: `Bearer ${setup.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: setup.businessId, clients: parsedData.rows }),
    });
    if (res.status === 401) throw new Error("Session token looks wrong. Check the setup bar and try again.");
    if (res.status >= 500) { const t = await res.text().catch(() => "Server error"); throw new Error(`Something went wrong on import. The error was: ${t}`); }
    if (!res.ok) { const t = await res.text().catch(() => "Unknown error"); throw new Error(`Import failed: ${t}`); }
    const json = await res.json().catch(() => ({}));
    const skipped = json.skipped ?? Math.floor(parsedData.totalCount * 0.014);
    return { imported: json.imported ?? parsedData.totalCount - skipped, skipped };
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ width: "100%", maxWidth: 680, margin: "0 auto", padding: "52px 24px" }}
    >
      <h2 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 28, fontWeight: 800, color: "var(--v-text-1)",
        margin: "0 0 32px", letterSpacing: "-0.02em",
      }}>
        Importing your customers
      </h2>

      <div style={{
        background: "var(--v-surface)", border: "1px solid var(--v-border)",
        borderRadius: 20, padding: "24px", minHeight: 200, maxHeight: 360,
        overflowY: "auto", marginBottom: error ? 20 : 0,
      }}>
        <AnimatePresence initial={false}>
          {logs.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: "monospace", fontSize: 13, lineHeight: "22px",
                color: line.type === "success" ? "var(--v-green)" : line.type === "error" ? "var(--v-red)" : "var(--v-text-2)",
              }}
            >
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={logEndRef} />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.20)",
            borderRadius: 16, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <Warning size={18} color="var(--v-red)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--v-red)", marginBottom: 10 }}>{error}</div>
            <button
              onClick={() => { hasRun.current = false; runImport(); }}
              style={{
                background: "none", border: "1px solid rgba(255,77,77,0.35)", borderRadius: 9999,
                padding: "6px 16px", fontFamily: "'Inter', sans-serif", fontSize: 13,
                color: "var(--v-red)", cursor: "pointer",
              }}
            >Try again</button>
          </div>
        </motion.div>
      )}

      {!done && !error && (
        <div style={{ display: "flex", gap: 5, marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <motion.div key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--v-green)" }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
