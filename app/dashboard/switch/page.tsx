"use client";

import { useState, useRef, useCallback } from "react";
import { useBusinessContext } from "../_context";
import { PLATFORMS, type PlatformConfig } from "@/lib/platform-comparison";
import { Upload, CheckCircle, ArrowRight, ArrowLeft, Copy, AlertCircle, MessageCircle } from "lucide-react";

const G = "#00C896";
const N = "#0A0F1E";
const BORDER = "#E5E7EB";

type Step = 1 | 2 | 3 | 4 | 5;

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

interface PreviewRow {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

const CHECKLIST_ITEMS = [
  { key: "clients", label: "Clients imported", link: "/dashboard/customers" },
  { key: "services", label: "Services added", link: "/dashboard/calendar/settings" },
  { key: "hours", label: "Working hours set", link: "/dashboard/calendar/settings" },
  { key: "booking_link", label: "Booking link live", link: "/dashboard/calendar/settings" },
  { key: "google_maps", label: "Google Maps updated", link: null, tip: "Go to your Google Business Profile → Info → Booking URL → paste your Vomni link" },
  { key: "instagram", label: "Instagram bio updated", link: null, tip: "Add your booking link to your Instagram bio" },
  { key: "message_sent", label: "Switch message sent to clients", link: null },
  { key: "old_cancelled", label: "Old platform cancelled", link: null },
];

export default function SwitchPage() {
  const { businessId, businessName } = useBusinessContext();
  const [step, setStep] = useState<Step>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewCols, setPreviewCols] = useState<Record<string, string | null>>({});
  const [estimatedClients, setEstimatedClients] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({ clients: false });
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bookingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/book/${businessName?.toLowerCase().replace(/\s+/g, "")}`
    : "";

  const switchMessage = `Hi [Name]! Just letting you know I've moved to a new booking system. You can book your next appointment here: ${bookingUrl} — it only takes 30 seconds and you'll get a reminder before your appointment 🙌`;

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setPreview(null);
    if (!businessId) return;

    const fd = new FormData();
    fd.append("file", f);
    fd.append("business_id", businessId);
    fd.append("platform", selectedPlatform?.id ?? "csv");
    fd.append("preview", "true");

    try {
      const res = await fetch("/api/migration/import-clients", { method: "POST", body: fd });
      const data = await res.json();
      if (data.preview) {
        setPreview(data.preview);
        setPreviewCols(data.detectedColumns ?? {});
        setEstimatedClients(data.estimatedClients ?? 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [businessId, selectedPlatform]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (!file || !businessId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("business_id", businessId);
    fd.append("platform", selectedPlatform?.id ?? "csv");

    try {
      const res = await fetch("/api/migration/import-clients", { method: "POST", body: fd });
      const data = await res.json();
      setImportResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? 0 });
      setChecklist(c => ({ ...c, clients: true }));
      setStep(4);
    } catch {
      alert("Import failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(switchMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allDone = CHECKLIST_ITEMS.every(i => checklist[i.key]);

  return (
    <div style={{ padding: "32px 24px", maxWidth: 800, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          {([1,2,3,4,5] as Step[]).map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: s <= step ? G : "#E5E7EB", marginRight: s < 5 ? 4 : 0, transition: "background 0.3s" }} />
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Step {step} of 5</p>
      </div>

      {/* ── STEP 1: Choose platform ── */}
      {step === 1 && (
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, margin: "0 0 8px" }}>
            Switch to Vomni
          </h1>
          <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.6 }}>
            Bring your clients with you. Where are you switching from?
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
            {Object.values(PLATFORMS).map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPlatform(p); setStep(2); }}
                style={{
                  padding: "20px 16px", borderRadius: 14,
                  border: `2px solid ${selectedPlatform?.id === p.id ? p.color : BORDER}`,
                  background: selectedPlatform?.id === p.id ? `${p.color}10` : "#fff",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = p.color; (e.currentTarget as HTMLButtonElement).style.background = `${p.color}08`; }}
                onMouseLeave={e => { if (selectedPlatform?.id !== p.id) { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; } }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{p.logo}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: N }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                  {p.exportDifficulty === "easy" ? "Easy export" : p.exportDifficulty === "hard" ? "Via support" : "Standard export"}
                </div>
              </button>
            ))}
          </div>

          <div style={{ background: "#F0FDF9", border: "1px solid #A7F3D0", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>🤝</span>
            <div>
              <p style={{ fontWeight: 600, color: N, margin: "0 0 4px", fontSize: 14 }}>Need help? We&apos;ll do it for you.</p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 8px", lineHeight: 1.5 }}>For the first 100 customers, our team will handle your entire migration for free.</p>
              <a
                href="https://wa.me/447000000000?text=Hi! I'd like help migrating to Vomni from my current booking platform."
                target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: G, fontWeight: 600, textDecoration: "none" }}
              >
                WhatsApp us to get started →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Export instructions ── */}
      {step === 2 && selectedPlatform && (
        <div>
          <button onClick={() => setStep(1)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: 14, marginBottom: 24, padding: 0 }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>{selectedPlatform.logo}</span>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>
              Export from {selectedPlatform.name}
            </h1>
          </div>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.6 }}>
            {selectedPlatform.clientsExportNote}
          </p>

          {selectedPlatform.exportDifficulty === "hard" && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={18} style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
                {selectedPlatform.name} doesn&apos;t offer self-service export. You&apos;ll need to contact their support team — it usually takes 1-2 hours. We&apos;ve written the exact message for you below.
              </p>
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
            {selectedPlatform.exportInstructions.map((instrStep, i) => (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i < selectedPlatform.exportInstructions.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${G}15`, color: G, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {instrStep.step}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: N }}>{instrStep.instruction}</p>
                  {instrStep.detail && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9CA3AF" }}>{instrStep.detail}</p>}
                </div>
              </div>
            ))}
          </div>

          {selectedPlatform.id === "booksy" && (
            <div style={{ background: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Copy this message to send to Booksy support:</p>
              <p style={{ fontSize: 13, color: N, margin: "0 0 12px", lineHeight: 1.6, background: "#fff", padding: 12, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                &quot;Please send me my full client list as a CSV file including names, phone numbers, and email addresses. I am the account owner.&quot;
              </p>
              <button
                onClick={() => navigator.clipboard.writeText("Please send me my full client list as a CSV file including names, phone numbers, and email addresses. I am the account owner.")}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer", fontSize: 13, color: N, fontFamily: "Inter, sans-serif" }}
              >
                <Copy size={14} /> Copy message
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <a
              href={`https://wa.me/447000000000?text=Hi! I need help exporting my clients from ${selectedPlatform.name}.`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: "#6B7280", textDecoration: "none" }}
            >
              Having trouble? Chat with us →
            </a>
            <button
              onClick={() => setStep(3)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              I have my file <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Upload ── */}
      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: 14, marginBottom: 24, padding: 0 }}>
            <ArrowLeft size={16} /> Back
          </button>

          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: "0 0 8px" }}>
            Upload your client list
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 24px" }}>
            Drop your CSV or Excel file here. We&apos;ll automatically detect the columns.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? G : file ? G : BORDER}`,
              borderRadius: 16, padding: "48px 24px", textAlign: "center",
              background: dragOver ? `${G}08` : file ? `${G}05` : "#FAFAFA",
              cursor: "pointer", transition: "all 0.2s", marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <>
                <CheckCircle size={36} style={{ color: G, margin: "0 auto 12px" }} />
                <p style={{ fontWeight: 600, color: N, margin: "0 0 4px" }}>{file.name}</p>
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>{estimatedClients} clients detected — click to change file</p>
              </>
            ) : (
              <>
                <Upload size={36} style={{ color: "#9CA3AF", margin: "0 auto 12px" }} />
                <p style={{ fontWeight: 600, color: N, margin: "0 0 4px" }}>Drop your CSV or Excel file here</p>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>or click to browse</p>
              </>
            )}
          </div>

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontWeight: 600, color: N, margin: 0, fontSize: 14 }}>
                  Preview — first {preview.length} of {estimatedClients} clients
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {Object.entries(previewCols).filter(([, v]) => v).map(([k]) => (
                    <span key={k} style={{ fontSize: 11, background: `${G}15`, color: G, borderRadius: 99, padding: "2px 8px", fontWeight: 600, textTransform: "capitalize" }}>
                      {k} ✓
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["Name", "Phone", "Email"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 500, color: N }}>{row.name}</td>
                        <td style={{ padding: "10px 14px", color: "#6B7280" }}>{row.phone ?? <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                        <td style={{ padding: "10px 14px", color: "#6B7280" }}>{row.email ?? <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleImport}
              disabled={!file || uploading || !preview}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "13px 28px", borderRadius: 12,
                background: !file || !preview ? "#E5E7EB" : G,
                color: !file || !preview ? "#9CA3AF" : "#fff",
                border: "none", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
                cursor: !file || !preview ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Importing…" : `Import ${estimatedClients > 0 ? estimatedClients : ""} clients`}
              {!uploading && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Results + checklist ── */}
      {step === 4 && importResult && (
        <div>
          <div style={{ textAlign: "center", padding: "32px 0 40px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle size={36} style={{ color: G }} />
            </div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N, margin: "0 0 8px" }}>
              {importResult.imported} clients imported
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
              {importResult.skipped > 0 && `${importResult.skipped} duplicates skipped · `}
              {importResult.errors > 0 && `${importResult.errors} errors · `}
              Your client list is ready.
            </p>
          </div>

          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 16px" }}>
            Your switch checklist
          </h2>

          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 28 }}>
            {CHECKLIST_ITEMS.map((item, i) => (
              <div
                key={item.key}
                style={{ padding: "14px 18px", borderBottom: i < CHECKLIST_ITEMS.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                onClick={() => setChecklist(c => ({ ...c, [item.key]: !c[item.key] }))}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, border: `2px solid ${checklist[item.key] ? G : "#D1D5DB"}`,
                  background: checklist[item.key] ? G : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s",
                }}>
                  {checklist[item.key] && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: checklist[item.key] ? "#9CA3AF" : N, textDecoration: checklist[item.key] ? "line-through" : "none" }}>
                    {item.label}
                  </p>
                  {item.tip && !checklist[item.key] && (
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>{item.tip}</p>
                  )}
                </div>
                {item.link && (
                  <a href={item.link} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: G, textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                    Go →
                  </a>
                )}
              </div>
            ))}
          </div>

          {allDone && (
            <div style={{ background: `${G}10`, border: `1px solid ${G}40`, borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                You&apos;ve switched to Vomni!
              </h2>
              <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Welcome. Your customers will love it.</p>
            </div>
          )}

          <button
            onClick={() => setStep(5)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, background: G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}
          >
            Next: Send switch message to clients <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── STEP 5: Send switch message ── */}
      {step === 5 && (
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: "0 0 8px" }}>
            Tell your clients you&apos;ve moved
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.6 }}>
            Send this message to each of your {importResult?.imported ?? ""} clients to let them know where to book. Copy it and send individually via WhatsApp.
          </p>

          <div style={{ background: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>English</p>
            <p style={{ fontSize: 14, color: N, margin: "0 0 16px", lineHeight: 1.7, whiteSpace: "pre-line" }}>{switchMessage}</p>
            <button
              onClick={copyMessage}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `1px solid ${copied ? G : BORDER}`, background: copied ? `${G}10` : "#fff", color: copied ? G : N, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}
            >
              <Copy size={14} />
              {copied ? "Copied!" : "Copy message"}
            </button>
          </div>

          <div style={{ background: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>עברית</p>
            <p style={{ fontSize: 14, color: N, margin: "0 0 16px", lineHeight: 1.7, direction: "rtl", textAlign: "right" }}>
              {`היי [שם]! עברתי למערכת הזמנות חדשה. אפשר לקבוע תור כאן: ${bookingUrl} — לוקח 30 שניות ותקבל תזכורת לפני התור 🙌`}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(`היי [שם]! עברתי למערכת הזמנות חדשה. אפשר לקבוע תור כאן: ${bookingUrl} — לוקח 30 שניות ותקבל תזכורת לפני התור 🙌`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: N, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}
            >
              <Copy size={14} /> העתק
            </button>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <MessageCircle size={20} style={{ color: "#25D366", flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: N }}>Send individually via WhatsApp</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>Copy the message above, open WhatsApp, and send to each client. Bulk automated sending violates WhatsApp&apos;s terms.</p>
            </div>
          </div>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <a href="/dashboard" style={{ fontSize: 14, color: G, fontWeight: 600, textDecoration: "none" }}>
              Go to dashboard →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
