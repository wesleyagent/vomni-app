"use client";

import { useState, useEffect, useContext, useMemo } from "react";
import { BusinessContext } from "../_context";
import { db, getAuthToken } from "@/lib/db";
import { currencySymbol } from "@/lib/currencyUtils";

const G      = "#00C896";
const N      = "#0A0F1E";
const BORDER = "#E5E7EB";
const GREY   = "#F7F8FA";
const MUTED  = "#9CA3AF";

// ── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id:                  string;
  invoice_number:      string;
  document_type:       "heshbonit_mas" | "kabala";
  issued_at:           string;
  customer_name:       string;
  customer_phone:      string | null;
  service_description: string;
  subtotal:            number;
  vat_amount:          number;
  total:               number;
  payment_method:      string;
  pdf_storage_path:    string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash:   "Cash",
  credit: "Credit Card",
  bit:    "Bit",
  paybox: "Paybox",
};

// ── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(invoices: Invoice[], businessName: string, dateFrom?: string, dateTo?: string) {
  const BOM = "\uFEFF";
  const headers = [
    "Invoice #", "Type", "Date", "Customer", "Phone",
    "Service", "Pre-VAT Amount", "VAT", "Total", "Payment Method",
  ];
  const rows = invoices.map(inv => [
    inv.invoice_number,
    inv.document_type === "heshbonit_mas" ? "Tax Invoice" : "Receipt",
    new Date(inv.issued_at).toLocaleDateString("en-GB"),
    inv.customer_name,
    inv.customer_phone ?? "",
    inv.service_description,
    Number(inv.subtotal).toFixed(2),
    Number(inv.vat_amount).toFixed(2),
    Number(inv.total).toFixed(2),
    PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method,
  ]);

  const csv = BOM + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const now   = new Date();
  const month = dateFrom
    ? dateFrom.substring(0, 7)
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const suffix = dateTo && dateFrom ? `${dateFrom}_${dateTo}` : month;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `invoices_${businessName}_${suffix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const ctx = useContext(BusinessContext);
  const sym = currencySymbol(ctx?.currency ?? "ILS");

  const [invoices,    setInvoices]    = useState<Invoice[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filterMonth, setFilterMonth] = useState("");   // "YYYY-MM" or ""
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [filterPM,    setFilterPM]    = useState("all");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (ctx?.businessId) loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.businessId]);

  // When a month is picked, auto-set the date range
  useEffect(() => {
    if (!filterMonth) return;
    const [y, m] = filterMonth.split("-").map(Number);
    const first = `${filterMonth}-01`;
    const last  = new Date(y, m, 0).toISOString().substring(0, 10); // last day of month
    setDateFrom(first);
    setDateTo(last);
  }, [filterMonth]);

  async function loadInvoices() {
    setLoading(true);
    const { data } = await db
      .from("invoices")
      .select("id, invoice_number, document_type, issued_at, customer_name, customer_phone, service_description, subtotal, vat_amount, total, payment_method, pdf_storage_path")
      .eq("business_id", ctx!.businessId)
      .order("issued_at", { ascending: false });
    setInvoices((data ?? []) as Invoice[]);
    setLoading(false);
  }

  // ── Filtering ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const d = inv.issued_at.substring(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo   && d > dateTo)   return false;
      if (filterPM !== "all" && inv.payment_method !== filterPM) return false;
      return true;
    });
  }, [invoices, dateFrom, dateTo, filterPM]);

  // ── Summary stats (current month, ignoring date filter) ──
  const now          = new Date();
  const monthStart   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonth    = invoices.filter(inv => inv.issued_at.substring(0, 10) >= monthStart);
  const totalRevenue = thisMonth.reduce((s, inv) => s + Number(inv.total), 0);

  const byPM = ["cash", "credit", "bit", "paybox"].map(pm => ({
    pm,
    label:  PAYMENT_LABELS[pm],
    amount: thisMonth.filter(inv => inv.payment_method === pm).reduce((s, inv) => s + Number(inv.total), 0),
    count:  thisMonth.filter(inv => inv.payment_method === pm).length,
  }));

  // ── Download handler ──────────────────────────────────────
  async function handleDownload(inv: Invoice) {
    if (!inv.pdf_storage_path) return;
    setDownloading(inv.id);
    try {
      const token = await getAuthToken();
      const res   = await fetch(`/api/invoices/${inv.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch { /* ignore */ } finally {
      setDownloading(null);
    }
  }

  function clearFilters() {
    setFilterMonth("");
    setDateFrom("");
    setDateTo("");
    setFilterPM("all");
  }

  const hasFilters = dateFrom || dateTo || filterPM !== "all";

  // ── Render ────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14,
    padding: "18px 22px", flex: 1, minWidth: 140,
  };

  return (
    <div style={{ padding: "24px 24px 80px", maxWidth: 1100, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .inv-row:hover { background: ${GREY} !important; }
        .inv-row:hover .inv-dl-btn { opacity: 1 !important; }
        @media(max-width:768px){
          .inv-summary-grid { flex-direction: column !important; }
          .inv-table-scroll { overflow-x: auto; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N, margin: 0 }}>
            Invoices & Receipts
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, margin: "3px 0 0" }}>
            Financial document history
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered, ctx?.businessName ?? "vomni", dateFrom || undefined, dateTo || undefined)}
          disabled={filtered.length === 0}
          style={{
            padding: "9px 18px", borderRadius: 10,
            background: filtered.length === 0 ? GREY : `${G}18`,
            color: filtered.length === 0 ? MUTED : G,
            border: `1px solid ${filtered.length === 0 ? BORDER : G}`,
            fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
            cursor: filtered.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="inv-summary-grid" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${G}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Revenue (This Month)
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: G }}>
            {sym}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{thisMonth.length} documents this month</div>
        </div>
        {byPM.map(({ pm, label, amount, count }) => (
          <div key={pm} style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>
              {sym}{amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{count} documents</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {/* Month quick-pick */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>Month:</label>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }}
          />
        </div>
        <span style={{ fontSize: 12, color: MUTED }}>or</span>
        {/* Custom date range */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>From:</label>
          <input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setFilterMonth(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>To:</label>
          <input
            type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setFilterMonth(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }}
          />
        </div>
        <select
          value={filterPM} onChange={e => setFilterPM(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none", background: "#fff" }}
        >
          <option value="all">All payment methods</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit Card</option>
          <option value="bit">Bit</option>
          <option value="paybox">Paybox</option>
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", fontSize: 13, color: MUTED, cursor: "pointer" }}
          >
            Clear ✕
          </button>
        )}
        <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>
          {filtered.length} documents
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: MUTED }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, color: N, fontWeight: 600, marginBottom: 6 }}>No documents to show</div>
          <div style={{ fontSize: 13 }}>Documents will appear here after recording a payment in the History tab</div>
        </div>
      ) : (
        <div className="inv-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                {["Invoice #", "Type", "Date", "Customer", "Service", "Total", "Payment", ""].map(h => (
                  <th key={h} style={{
                    padding: "10px 12px", textAlign: "left",
                    fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600,
                    color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr
                  key={inv.id}
                  className="inv-row"
                  style={{ borderBottom: `1px solid ${BORDER}`, background: "#fff", transition: "background 0.1s" }}
                >
                  <td style={{ padding: "12px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: N, whiteSpace: "nowrap" }}>
                    {inv.invoice_number}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 8px", borderRadius: 9999,
                      fontSize: 11, fontWeight: 600,
                      background: inv.document_type === "heshbonit_mas" ? `${G}15` : "#EEF2FF",
                      color:      inv.document_type === "heshbonit_mas" ? G            : "#6366F1",
                    }}>
                      {inv.document_type === "heshbonit_mas" ? "Tax Invoice" : "Receipt"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                    {new Date(inv.issued_at).toLocaleDateString("en-GB")}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: N, fontWeight: 500 }}>
                    {inv.customer_name}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: MUTED, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inv.service_description}
                  </td>
                  <td style={{ padding: "12px", fontSize: 14, fontWeight: 700, color: N, whiteSpace: "nowrap" }}>
                    {sym}{Number(inv.total).toFixed(2)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 8px", borderRadius: 9999,
                      background: "#F3F4F6", color: "#374151",
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {inv.pdf_storage_path ? (
                      <button
                        className="inv-dl-btn"
                        onClick={() => handleDownload(inv)}
                        disabled={downloading === inv.id}
                        style={{
                          padding: "6px 12px", borderRadius: 8,
                          background: GREY, color: N,
                          border: `1px solid ${BORDER}`,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          opacity: 0.7, transition: "opacity 0.15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {downloading === inv.id ? "..." : "⬇ PDF"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: MUTED }}>No PDF</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
