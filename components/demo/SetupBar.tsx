"use client";

import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";

export interface SetupConfig {
  token: string;
  cronSecret: string;
  businessId: string;
}

interface Props {
  config: SetupConfig;
  onChange: (config: SetupConfig) => void;
}

const fields = [
  { key: "token" as const, label: "Session token", placeholder: "eyJ..." },
  { key: "cronSecret" as const, label: "Cron secret", placeholder: "cron_..." },
  { key: "businessId" as const, label: "Business ID", placeholder: "biz_..." },
];

export default function SetupBar({ config, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--v-text-muted)",
          letterSpacing: "0.02em",
        }}
      >
        <span>⚙ Demo setup — tap to configure</span>
        {open ? <CaretUp size={11} /> : <CaretDown size={11} />}
      </button>

      {open && (
        <div
          style={{
            padding: "0 20px 16px",
            maxWidth: 680,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: "var(--v-text-2)",
                  width: 110,
                  flexShrink: 0,
                }}
              >
                {label}
              </label>
              <input
                type="password"
                placeholder={placeholder}
                value={config[key]}
                onChange={(e) => onChange({ ...config, [key]: e.target.value })}
                autoComplete="off"
                style={{
                  flex: 1,
                  background: "var(--v-surface)",
                  border: "1px solid var(--v-border)",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "var(--v-text-1)",
                  outline: "none",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
