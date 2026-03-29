"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Typeform URL kept for reference but no longer needed — native rating page handles everything
// const TYPEFORM_URL = `https://vomni.app/review-complete?booking_id={{field:booking_id_hidden_field}}`;

const SQL_BLOCKS = [
  {
    label: "customer_fingerprints table",
    sql: `-- Task 4: Customer fingerprints (returning customer dedup)
CREATE TABLE IF NOT EXISTS customer_fingerprints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  last_sms_sent_at timestamp with time zone DEFAULT now(),
  sms_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(business_id, fingerprint)
);`,
  },
  {
    label: "Velocity fields on businesses",
    sql: `-- Task 5: Velocity fields on businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_google_redirects integer DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_redirect_reset_at timestamp with time zone DEFAULT now();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS account_age_weeks integer DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_redirect_cap integer DEFAULT 5;`,
  },
  {
    label: "ICP fields on leads",
    sql: `-- Task 7: ICP fields on leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_online_booking boolean;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_system text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_website boolean;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_score integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_notes text;`,
  },
  {
    label: "outreach_activities table",
    sql: `-- Task 8: Outreach activities
CREATE TABLE IF NOT EXISTS outreach_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel text NOT NULL,
  city text,
  business_type text,
  business_name text,
  status text DEFAULT 'sent',
  notes text,
  created_at timestamp with time zone DEFAULT now()
);`,
  },
  {
    label: "growth_snapshots table",
    sql: `-- Task 8: Growth snapshots
CREATE TABLE IF NOT EXISTS growth_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start date NOT NULL,
  channel text,
  city text,
  business_type text,
  outreach_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  demo_count integer DEFAULT 0,
  customer_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);`,
  },
  {
    label: "cleanup_log table",
    sql: `-- Task 9: Cleanup log
CREATE TABLE IF NOT EXISTS cleanup_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id),
  booking_id uuid,
  fingerprint text,
  action text DEFAULT 'pii_deleted',
  created_at timestamp with time zone DEFAULT now()
);`,
  },
  {
    label: "logo_url on businesses",
    sql: `-- Business logo (uploaded via onboarding or settings)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url text;`,
  },
  {
    label: "Native rating fields on bookings",
    sql: `-- Fields written by the native /r/[booking_id] rating page
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS form_opened_at timestamp with time zone;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS redirected_at timestamp with time zone;`,
  },
  {
    label: "Supabase Storage: business-logos bucket",
    sql: `-- Create the business-logos storage bucket (run in Supabase dashboard → Storage → New bucket)
-- Bucket name: business-logos
-- Public: true
-- Then add this RLS policy in Storage → Policies:
-- Allow authenticated users to upload to their own folder:
-- (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1])`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: copied ? "#00C896" : "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "#fff",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "13px",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CopyButtonLight({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: copied ? "#00C896" : "#F0F0F0",
        border: "1px solid #E0E0E0",
        color: copied ? "#fff" : "#333",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "13px",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function AdminSetupPage() {
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#F8F9FA",
    padding: "48px 24px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: "800px",
    margin: "0 auto",
  };

  const pageTitleStyle: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: 700,
    color: "#111",
    marginBottom: "8px",
  };

  const pageSubStyle: React.CSSProperties = {
    fontSize: "15px",
    color: "#666",
    marginBottom: "48px",
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    padding: "32px",
    marginBottom: "32px",
    border: "1px solid #E8E8E8",
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const accentDot: React.CSSProperties = {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#00C896",
    display: "inline-block",
    flexShrink: 0,
  };

  const instructionStyle: React.CSSProperties = {
    fontSize: "15px",
    color: "#444",
    lineHeight: 1.6,
    marginBottom: "16px",
  };

  const codeBoxStyle: React.CSSProperties = {
    backgroundColor: "#0A0F1E",
    borderRadius: "8px",
    padding: "16px 20px",
    fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace",
    fontSize: "13px",
    color: "#E8F4F0",
    lineHeight: 1.7,
    overflowX: "auto",
    whiteSpace: "pre",
    wordBreak: "normal",
  };

  const codeRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#0A0F1E",
    borderRadius: "8px",
    padding: "14px 16px",
  };

  const noteStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "#888",
    marginTop: "12px",
    lineHeight: 1.6,
    fontStyle: "italic",
  };

  const sqlBlockLabelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "8px",
    marginTop: "24px",
  };

  const sqlBlockHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "6px",
  };

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <h1 style={pageTitleStyle}>Admin Setup</h1>
        <p style={pageSubStyle}>Internal setup instructions for onboarding new customers.</p>

        {/* Section 1: Native Rating Page */}
        <section style={{ ...sectionStyle, borderColor: "#00C89630", background: "#f0fdf9" }}>
          <h2 style={sectionHeadingStyle}>
            <span style={accentDot} />
            Native Rating Page — No Typeform Needed
          </h2>
          <p style={instructionStyle}>
            Vomni has a built-in customer rating page. <strong>Typeform is no longer needed and can be deleted.</strong>
          </p>
          <p style={instructionStyle}>
            When a review request SMS is sent, the link points directly to:
          </p>
          <div style={codeRowStyle}>
            <code style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "13px", color: "#00C896", flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>
              https://vomni-app.vercel.app/r/[booking_id]
            </code>
            <div style={{ flexShrink: 0 }}>
              <CopyButton text="https://vomni-app.vercel.app/r/[booking_id]" />
            </div>
          </div>
          <p style={noteStyle}>
            This page loads the business branding, shows a star selector, and handles all writes to Supabase automatically.
            Everything is native — no Typeform account, no ending redirect URL, no Scenario 3 in Make required.
          </p>

          {/* Deprecation notices */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: "14px 18px", background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10 }}>
              <p style={{ fontFamily: "inherit", fontSize: 14, color: "#991B1B", margin: 0, fontWeight: 600 }}>
                🗑️ Typeform — can be deleted entirely
              </p>
              <p style={{ fontFamily: "inherit", fontSize: 13, color: "#B91C1C", margin: "6px 0 0", lineHeight: 1.5 }}>
                Cancel the Typeform subscription and remove the ending redirect URL. The native /r/[booking_id] page replaces it completely.
              </p>
            </div>
            <div style={{ padding: "14px 18px", background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10 }}>
              <p style={{ fontFamily: "inherit", fontSize: 14, color: "#991B1B", margin: 0, fontWeight: 600 }}>
                🗑️ Make Scenario 3 (Typeform → Supabase) — can be deleted
              </p>
              <p style={{ fontFamily: "inherit", fontSize: 13, color: "#B91C1C", margin: "6px 0 0", lineHeight: 1.5 }}>
                Scenario 1 (booking → SMS) and Scenario 2 (SMS webhook) remain active and are still needed.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: SQL Setup */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            <span style={accentDot} />
            SQL Setup — Supabase
          </h2>
          <p style={instructionStyle}>
            Run the following SQL statements in the Supabase SQL editor for each new customer
            environment. Each block is independent and can be run separately.
          </p>

          {SQL_BLOCKS.map((block, index) => (
            <div key={index}>
              <div style={sqlBlockHeaderStyle}>
                <p style={{ ...sqlBlockLabelStyle, marginTop: index === 0 ? 0 : "24px", marginBottom: 0 }}>
                  {block.label}
                </p>
                <div style={{ marginTop: index === 0 ? 0 : "24px" }}>
                  <CopyButton text={block.sql} />
                </div>
              </div>
              <div style={codeBoxStyle}>{block.sql}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
