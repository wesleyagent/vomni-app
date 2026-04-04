"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileArrowUp, Check, Warning } from "@phosphor-icons/react";

declare global {
  interface Window {
    Papa: {
      parse: (
        input: File,
        config: {
          header: boolean;
          skipEmptyLines: boolean;
          complete: (results: {
            data: Record<string, string>[];
            meta: { fields?: string[] };
          }) => void;
          error: (err: { message: string }) => void;
        }
      ) => void;
    };
  }
}

export interface ParsedData {
  rows: NormalizedRow[];
  headers: string[];
  columnMap: ColumnMap;
  totalCount: number;
}

export interface NormalizedRow {
  name?: string;
  phone?: string;
  email?: string;
  lastVisit?: string;
}

export interface ColumnMap {
  name?: string;
  phone?: string;
  email?: string;
  lastVisit?: string;
}

const ALIASES: Record<keyof ColumnMap, string[]> = {
  name: ["שם", "name", "client_name", "full_name"],
  phone: ["טלפון", "phone", "mobile", "phone_number"],
  email: ["אימייל", "email"],
  lastVisit: ["ביקור אחרון", "last_visit", "last_appointment"],
};

function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (const field of Object.keys(ALIASES) as (keyof ColumnMap)[]) {
    for (const alias of ALIASES[field]) {
      const match = headers.find(
        (h) => h.trim() === alias || h.trim().toLowerCase() === alias.toLowerCase()
      );
      if (match) { map[field] = match; break; }
    }
  }
  return map;
}

function normalizeRows(rawRows: Record<string, string>[], columnMap: ColumnMap): NormalizedRow[] {
  return rawRows.map((row) => ({
    name: columnMap.name ? row[columnMap.name] : undefined,
    phone: columnMap.phone ? row[columnMap.phone] : undefined,
    email: columnMap.email ? row[columnMap.email] : undefined,
    lastVisit: columnMap.lastVisit ? row[columnMap.lastVisit] : undefined,
  }));
}

const exportStepsEn = [
  "Open your booking system on your phone or computer",
  "Go to Clients → Export",
  "Download the CSV file",
  "Drop it here",
];
const exportStepsHe = [
  "פתחו את מערכת ניהול הלקוחות בטלפון או במחשב",
  "לכו ל-Clients ← Export",
  "הורידו את קובץ ה-CSV",
  "גררו אותו לכאן",
];

const fieldLabel: Record<keyof ColumnMap, string> = {
  name: "Name", phone: "Phone", email: "Email", lastVisit: "Last visit",
};

interface Props {
  onComplete: (data: ParsedData) => void;
}

export default function StepUpload({ onComplete }: Props) {
  const [papaReady, setPapaReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [accordionLang, setAccordionLang] = useState<"en" | "he">("en");
  const [manualMap, setManualMap] = useState<ColumnMap>({});
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [needsManualMap, setNeedsManualMap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.Papa) { setPapaReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js";
    script.onload = () => setPapaReady(true);
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!papaReady) return;
    setParseError(null); setParsed(null); setNeedsManualMap(false);
    window.Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const headers = meta.fields || [];
        if (!headers.length || !data.length) {
          setParseError("We couldn't read that file. Make sure it's the CSV from your booking system's export screen.");
          return;
        }
        const columnMap = detectColumns(headers);
        setRawHeaders(headers); setRawRows(data);
        if (!columnMap.name && !columnMap.phone) { setNeedsManualMap(true); setManualMap(columnMap); return; }
        setParsed({ rows: normalizeRows(data, columnMap), headers, columnMap, totalCount: data.length });
      },
      error: () => setParseError("We couldn't read that file. Make sure it's the CSV from your booking system's export screen."),
    });
  }, [papaReady]);

  const applyManualMap = () => {
    const rows = normalizeRows(rawRows, manualMap);
    setParsed({ rows, headers: rawHeaders, columnMap: manualMap, totalCount: rawRows.length });
    setNeedsManualMap(false);
  };

  const matchedFields = parsed
    ? (["name", "phone", "email", "lastVisit"] as (keyof ColumnMap)[]).filter((f) => parsed.columnMap[f])
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ width: "100%", maxWidth: 680, margin: "0 auto", padding: "52px 24px" }}
    >
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "clamp(24px, 5vw, 32px)",
          fontWeight: 800,
          color: "var(--v-text-1)",
          margin: "0 0 10px",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}>
          Drop your client list here
        </h1>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 15,
          color: "var(--v-text-2)",
          margin: 0,
        }}>
          CSV file from your booking system — we handle the rest
        </p>
      </div>

      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {!parsed && !needsManualMap && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--v-green)" : "var(--v-border)"}`,
              borderRadius: 20,
              padding: "60px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              cursor: "pointer",
              background: isDragging ? "var(--v-green-glow)" : "var(--v-surface)",
              transition: "all 200ms ease",
              marginBottom: 24,
            }}
          >
            <FileArrowUp
              size={64}
              color={isDragging ? "var(--v-green)" : "var(--v-text-2)"}
              weight="light"
            />
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 500,
                color: "var(--v-text-1)", marginBottom: 4,
              }}>
                {papaReady ? "Drop CSV here or click to browse" : "Loading…"}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--v-text-2)" }}>
                .csv files only
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {parseError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.25)",
            borderRadius: 16, padding: "14px 16px", display: "flex", gap: 10,
            alignItems: "flex-start", marginBottom: 20,
          }}
        >
          <Warning size={18} color="var(--v-red)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--v-red)", marginBottom: 8 }}>
              {parseError}
            </div>
            <button
              onClick={() => { setParseError(null); fileInputRef.current?.click(); }}
              style={{
                background: "none", border: "1px solid rgba(255,77,77,0.4)", borderRadius: 9999,
                padding: "6px 16px", fontFamily: "'Inter', sans-serif", fontSize: 13,
                color: "var(--v-red)", cursor: "pointer",
              }}
            >Try again</button>
          </div>
        </motion.div>
      )}

      {/* Manual column mapping */}
      {needsManualMap && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: "var(--v-surface)", border: "1px solid var(--v-border)",
            borderRadius: 20, padding: "24px", marginBottom: 20,
          }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--v-text-2)", margin: "0 0 16px" }}>
            We found: <span style={{ color: "var(--v-text-1)" }}>{rawHeaders.join(", ")}</span><br />
            Help us match the columns:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["name", "phone", "lastVisit"] as (keyof ColumnMap)[]).map((field) => (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--v-text-2)", width: 80, flexShrink: 0 }}>
                  {fieldLabel[field]}
                </label>
                <select
                  value={manualMap[field] || ""}
                  onChange={(e) => setManualMap((m) => ({ ...m, [field]: e.target.value || undefined }))}
                  style={{
                    flex: 1, background: "var(--v-surface-2)", border: "1px solid var(--v-border)",
                    borderRadius: 8, padding: "8px 12px", fontFamily: "'Inter', sans-serif",
                    fontSize: 13, color: "var(--v-text-1)", outline: "none",
                  }}
                >
                  <option value="">— skip —</option>
                  {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={applyManualMap}
            disabled={!manualMap.name && !manualMap.phone}
            style={{
              marginTop: 16, width: "100%", padding: "14px",
              background: (manualMap.name || manualMap.phone) ? "var(--v-green)" : "var(--v-border)",
              border: "none", borderRadius: 9999, fontFamily: "'Inter', sans-serif",
              fontSize: 15, fontWeight: 600,
              color: (manualMap.name || manualMap.phone) ? "#ffffff" : "var(--v-text-2)",
              cursor: (manualMap.name || manualMap.phone) ? "pointer" : "not-allowed",
              transition: "all 150ms",
            }}
          >
            Use these columns →
          </button>
        </motion.div>
      )}

      {/* Preview card */}
      {parsed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: "var(--v-surface)", border: "1px solid var(--v-border)",
            borderRadius: 20, padding: "24px", marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--v-text-1)", marginBottom: 14 }}>
            Found {parsed.totalCount.toLocaleString()} customers
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {matchedFields.map((f) => (
              <div key={f} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.22)",
                borderRadius: 9999, padding: "5px 14px",
              }}>
                <Check size={13} color="var(--v-green)" weight="bold" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--v-green)", fontWeight: 500 }}>
                  {fieldLabel[f]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Continue */}
      {parsed && (
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={() => onComplete(parsed)}
          style={{
            width: "100%", padding: "16px",
            background: "var(--v-green)", border: "none", borderRadius: 9999,
            fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600,
            color: "#ffffff", cursor: "pointer", marginBottom: 36,
            transition: "background 150ms",
          }}
        >
          Continue →
        </motion.button>
      )}

      {/* Accordion */}
      <div style={{ borderTop: "1px solid var(--v-border)", paddingTop: 20 }}>
        <button
          onClick={() => setAccordionOpen((v) => !v)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--v-text-2)",
            textDecoration: "underline", textUnderlineOffset: 2,
          }}
        >
          How to export your client list ↓
        </button>
        <AnimatePresence>
          {accordionOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                marginTop: 14, background: "var(--v-surface)", border: "1px solid var(--v-border)",
                borderRadius: 16, padding: "20px",
              }}>
                {/* Lang toggle */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                  <div style={{ display: "flex", border: "1px solid var(--v-border)", borderRadius: 9999, overflow: "hidden" }}>
                    {(["en", "he"] as const).map((l) => (
                      <button key={l} onClick={() => setAccordionLang(l)} style={{
                        padding: "5px 14px",
                        background: accordionLang === l ? "var(--v-green)" : "transparent",
                        border: "none", cursor: "pointer",
                        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                        color: accordionLang === l ? "#ffffff" : "var(--v-text-2)",
                        transition: "all 150ms",
                      }}>
                        {l === "en" ? "EN" : "עב"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ direction: accordionLang === "he" ? "rtl" : "ltr", display: "flex", flexDirection: "column", gap: 10 }}>
                  {(accordionLang === "en" ? exportStepsEn : exportStepsHe).map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "rgba(0,200,150,0.10)", border: "1px solid rgba(0,200,150,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 1,
                      }}>
                        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 11, fontWeight: 700, color: "var(--v-green)" }}>{i + 1}</span>
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--v-text-2)", lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
