"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { db, getAuthToken } from "@/lib/db";

const G       = "#00C896";
const N       = "#0A0F1E";
const BORDER  = "#E5E7EB";
const GREY    = "#F7F8FA";
const MUTED   = "#9CA3AF";

const PAYMENT_LABELS: Record<string, string> = {
  cash:   "מזומן",
  credit: "אשראי",
  bit:    "Bit",
  paybox: "Paybox",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface BookingForDrawer {
  id:             string;
  customer_name:  string | null;
  customer_phone: string | null;
  service_name:   string | null;
  service_price:  number | null;
}

interface BizInvoiceData {
  osek_type:           string | null;
  business_legal_name: string | null;
  business_address:    string | null;
  osek_murshe_number:  string | null;
  name:                string | null;
}

type PaymentMethod = "cash" | "credit" | "bit" | "paybox";
type DrawerStep   = 1 | 2 | 3 | "success";

interface Props {
  isOpen:     boolean;
  booking:    BookingForDrawer;
  businessId: string;
  onClose:    () => void;
  onSuccess:  () => void;  // reload calendar after invoice created
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PaymentDrawer({ isOpen, booking, businessId, onClose, onSuccess }: Props) {
  const [visible,       setVisible]       = useState(false);
  const [step,          setStep]          = useState<DrawerStep>(1);
  const [bizData,       setBizData]       = useState<BizInvoiceData | null>(null);

  // Step 1 fields
  const [customerName,  setCustomerName]  = useState("");
  const [serviceDesc,   setServiceDesc]   = useState("");
  const [price,         setPrice]         = useState("");

  // Step 2
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // Success
  const [invoiceId,     setInvoiceId]     = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [pdfAvailable,  setPdfAvailable]  = useState(false);

  // UI
  const [submitting,    setSubmitting]    = useState(false);
  const [toast,         setToast]         = useState<{ type: "error" | "warning"; text: string } | null>(null);

  // ── Open/close lifecycle ─────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Reset state on each open
      setStep(1);
      setCustomerName(booking.customer_name ?? "");
      setServiceDesc(booking.service_name   ?? "");
      setPrice(booking.service_price != null ? String(booking.service_price) : "");
      setPaymentMethod(null);
      setInvoiceId(null);
      setInvoiceNumber(null);
      setPdfAvailable(false);
      setToast(null);
      loadBizData();
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function loadBizData() {
    const { data } = await db
      .from("businesses")
      .select("osek_type, business_legal_name, business_address, osek_murshe_number, name")
      .eq("id", businessId)
      .single();
    if (data) setBizData(data as BizInvoiceData);
  }

  // ── Derived amounts ──────────────────────────────────────
  const isOsekMurshe = bizData?.osek_type === "osek_murshe";
  const unitPrice    = parseFloat(price) || 0;
  // TODO: pull VAT rate from config table when multi-rate support is needed
  const vatRate      = isOsekMurshe ? 18 : 0;
  const subtotal     = parseFloat(unitPrice.toFixed(2));
  const vatAmount    = isOsekMurshe ? parseFloat((subtotal * vatRate / 100).toFixed(2)) : 0;
  const total        = parseFloat((subtotal + vatAmount).toFixed(2));

  const step1Valid = customerName.trim() && serviceDesc.trim() && unitPrice > 0;

  // ── Handlers ─────────────────────────────────────────────
  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  async function handleSubmit() {
    if (!paymentMethod) return;
    setSubmitting(true);
    setToast(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/invoices/generate", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          booking_id:          booking.id,
          customer_name:       customerName.trim(),
          customer_phone:      booking.customer_phone ?? undefined,
          service_description: serviceDesc.trim(),
          unit_price:          unitPrice,
          quantity:            1,
          payment_method:      paymentMethod,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setToast({ type: "error", text: json.error ?? "שגיאה בשמירת המסמך. אנא נסה שוב." });
        return;
      }

      setInvoiceId(json.invoice_id);
      setInvoiceNumber(json.invoice_number);
      setPdfAvailable(!!json.pdf_storage_path);

      if (json.warning) {
        setToast({ type: "warning", text: "המסמך נשמר אך לא ניתן לאחסן את ה-PDF. אנא הורד ידנית." });
      }

      setStep("success");
      onSuccess();
    } catch {
      setToast({ type: "error", text: "שגיאה בשמירת המסמך. אנא נסה שוב." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    if (!invoiceId) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/invoices/${invoiceId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const { url } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
    } catch { /* ignore */ }
  }

  if (!isOpen && !visible) return null;

  const stepNum = step === "success" ? 4 : (step as number);

  // ── Shared input style ───────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1px solid ${BORDER}`, fontSize: 14, color: N,
    outline: "none", boxSizing: "border-box",
    fontFamily: "Inter, sans-serif", direction: "rtl",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: MUTED,
    display: "block", marginBottom: 5,
    textTransform: "uppercase", letterSpacing: "0.05em",
  };

  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    flex: 2, padding: "13px", borderRadius: 12,
    background: disabled ? "#E5E7EB" : N,
    color:      disabled ? MUTED     : "#fff",
    border: "none", fontSize: 15, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Bricolage Grotesque', sans-serif",
  });

  const backBtn: React.CSSProperties = {
    flex: 1, padding: "13px", borderRadius: 12,
    border: `1px solid ${BORDER}`, background: "#fff",
    color: N, fontSize: 14, fontWeight: 600, cursor: "pointer",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 55, opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Drawer */}
      <div
        dir="rtl"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          maxHeight: "92vh", background: "#fff",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.18)",
          zIndex: 60, display: "flex", flexDirection: "column",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.28s cubic-bezier(0.32,0.72,0,1)",
          overflowY: "auto",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER }} />
        </div>

        {/* Header */}
        <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
            {step === "success" ? "המסמך הונפק בהצלחה ✓" : "סיום טיפול"}
          </h2>
          <button
            onClick={handleClose}
            style={{ background: GREY, border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* Step progress bar */}
        {step !== "success" && (
          <div style={{ padding: "14px 24px 0", display: "flex", gap: 6 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: stepNum >= s ? G : BORDER, transition: "background 0.2s" }} />
            ))}
          </div>
        )}

        <div style={{ padding: "16px 24px 48px" }}>

          {/* ── Toast ── */}
          {toast && (
            <div style={{
              padding: "12px 16px", borderRadius: 10, marginBottom: 16,
              background: toast.type === "error" ? "#FEF2F2" : "#FFFBEB",
              border: `1px solid ${toast.type === "error" ? "#FECACA" : "#FCD34D"}`,
              color:  toast.type === "error" ? "#DC2626"  : "#92400E",
              fontSize: 13, lineHeight: 1.5,
            }}>
              {toast.text}
            </div>
          )}

          {/* ══ STEP 1: Review & Edit ══════════════════════════════ */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>
                שינית שירות? ערוך את הפרטים לפני המשך
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>שם לקוח</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>תיאור שירות</label>
                  <input value={serviceDesc} onChange={e => setServiceDesc(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>מחיר (₪)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={price} onChange={e => setPrice(e.target.value)}
                    style={{ ...inputStyle, direction: "ltr", textAlign: "right" }}
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12,
                  background: step1Valid ? G : "#E5E7EB",
                  color:      step1Valid ? "#fff" : MUTED,
                  border: "none", fontSize: 15, fontWeight: 700,
                  cursor: step1Valid ? "pointer" : "not-allowed",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                המשך לבחירת אמצעי תשלום ←
              </button>
            </div>
          )}

          {/* ══ STEP 2: Payment Method ══════════════════════════════ */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>בחר אמצעי תשלום</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {(["cash", "credit", "bit", "paybox"] as PaymentMethod[]).map(pm => {
                  const icons: Record<PaymentMethod, string> = { cash: "💵", credit: "💳", bit: "📱", paybox: "📲" };
                  const selected = paymentMethod === pm;
                  return (
                    <button
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      style={{
                        padding: "18px 12px", borderRadius: 14,
                        border: `2px solid ${selected ? G : BORDER}`,
                        background: selected ? `${G}12` : "#fff",
                        cursor: "pointer", textAlign: "center",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{icons[pm]}</div>
                      <div style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        fontSize: 15, fontWeight: 700,
                        color: selected ? G : N,
                      }}>
                        {PAYMENT_LABELS[pm]}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={backBtn}>חזור</button>
                <button onClick={() => setStep(3)} disabled={!paymentMethod} style={primaryBtn(!paymentMethod)}>
                  המשך לתצוגה מקדימה ←
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: Preview & Confirm ══════════════════════════ */}
          {step === 3 && (
            <div>
              {/* Document preview card */}
              <div style={{
                border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20,
                marginBottom: 24, background: GREY, direction: "rtl",
              }}>
                {/* Doc header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${BORDER}` }}>
                  <div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: N }}>
                      {bizData?.business_legal_name ?? bizData?.name ?? "שם העסק"}
                    </div>
                    {bizData?.business_address && (
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{bizData.business_address}</div>
                    )}
                    {isOsekMurshe && bizData?.osek_murshe_number && (
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>מס׳ עוסק: {bizData.osek_murshe_number}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: G }}>
                      {isOsekMurshe ? "חשבונית מס" : "קבלה"}
                    </div>
                    {isOsekMurshe && <div style={{ fontSize: 10, color: MUTED }}>עוסק מורשה</div>}
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>מס׳: יוקצה אוטומטית</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{new Date().toLocaleDateString("he-IL")}</div>
                  </div>
                </div>

                {/* Customer */}
                <div style={{ marginBottom: 14, fontSize: 12, color: "#374151" }}>
                  <span style={{ fontWeight: 600 }}>{isOsekMurshe ? "לכבוד" : "התקבל מ"}: </span>
                  {customerName}
                  {booking.customer_phone && (
                    <span style={{ color: MUTED }}> · {booking.customer_phone}</span>
                  )}
                </div>

                {/* Service line */}
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 14, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: N }}>{serviceDesc}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: N }}>₪{subtotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Totals */}
                <div style={{ fontSize: 12, color: "#374151" }}>
                  {isOsekMurshe && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                        <span>סכום לפני מע״מ</span><span>₪{subtotal.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                        <span>מע״מ ({vatRate}%)</span><span>₪{vatAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: isOsekMurshe ? "8px 0 3px" : "3px 0",
                    borderTop: isOsekMurshe ? `1px solid ${BORDER}` : "none",
                    marginTop: isOsekMurshe ? 4 : 0,
                    fontWeight: 700, color: N, fontSize: 13,
                  }}>
                    <span>סה״כ לתשלום</span><span>₪{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment method */}
                {paymentMethod && (
                  <div style={{ marginTop: 12, fontSize: 11, color: MUTED, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                    אמצעי תשלום: {PAYMENT_LABELS[paymentMethod]}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={backBtn}>חזור</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={primaryBtn(submitting)}
                >
                  {submitting ? "מייצר מסמך..." : "צור מסמך ✓"}
                </button>
              </div>
            </div>
          )}

          {/* ══ SUCCESS ════════════════════════════════════════════ */}
          {step === "success" && (
            <div style={{ textAlign: "center", paddingTop: 8 }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, marginBottom: 6 }}>
                {isOsekMurshe ? "חשבונית מס" : "קבלה"} הונפקה
              </div>
              {invoiceNumber && (
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>
                  מספר מסמך: <strong style={{ color: N }}>{invoiceNumber}</strong>
                </div>
              )}

              {/* Warning toast (PDF not stored) */}
              {toast?.type === "warning" && (
                <div style={{
                  padding: "10px 16px", borderRadius: 10, marginBottom: 20,
                  background: "#FFFBEB", border: "1px solid #FCD34D",
                  color: "#92400E", fontSize: 13, textAlign: "right",
                }}>
                  {toast.text}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {pdfAvailable && (
                  <button
                    onClick={handleDownload}
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 12,
                      background: GREY, color: N, border: `1px solid ${BORDER}`,
                      fontSize: 14, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    ⬇️ הורד PDF
                  </button>
                )}
              </div>

              <button
                onClick={handleClose}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12,
                  background: G, color: "#fff", border: "none",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >
                סגור
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
