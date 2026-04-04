"use client";

import { motion } from "framer-motion";

export interface LapsedRow {
  phone?: string;
  lastVisit?: string;
  weeksSince: number;
}

interface Props {
  customers: LapsedRow[];
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "+972 *** *** ***";
  return `+972 *** *** ${digits.slice(-3)}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function LapsedCustomerList({ customers }: Props) {
  const visible = customers.slice(0, 8);

  return (
    <div style={{ border: "1px solid var(--v-border)", borderRadius: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr auto",
        gap: 8, padding: "11px 20px",
        borderBottom: "1px solid var(--v-border)",
        background: "var(--v-surface-2)",
      }}>
        {["Phone", "Last visit", "Weeks overdue"].map((h) => (
          <div key={h} style={{
            fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
            color: "var(--v-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            {h}
          </div>
        ))}
      </div>

      {visible.map((row, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 + i * 0.05, duration: 0.3 }}
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr auto",
            gap: 8, padding: "12px 20px",
            borderBottom: i < visible.length - 1 ? "1px solid var(--v-border)" : "none",
            background: i % 2 === 0 ? "var(--v-surface)" : "transparent",
          }}
        >
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--v-text-1)" }}>
            {maskPhone(row.phone || "")}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--v-text-2)" }}>
            {formatDate(row.lastVisit)}
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
            color: row.weeksSince >= 12 ? "var(--v-red)" : row.weeksSince >= 8 ? "var(--v-green)" : "var(--v-text-2)",
            textAlign: "right", minWidth: 80,
          }}>
            {row.weeksSince}w ago
          </div>
        </motion.div>
      ))}
    </div>
  );
}
