/**
 * Server-side PDF generation for Israeli חשבונית מס / קבלה documents.
 * Import only from API routes or server actions — never from client components.
 *
 * Font setup:
 *   Download NotoSansHebrew-Regular.ttf and NotoSansHebrew-Bold.ttf from
 *   https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew
 *   and place them in public/fonts/. The env var HEBREW_FONT_URL overrides
 *   the remote fallback used when the local file is absent.
 */

import path from "path";
import fs from "fs";
import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// TODO: pull VAT rate from config table when multi-rate support is needed
export const VAT_RATE = 18;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash:    "מזומן",
  credit:  "אשראי",
  bit:     "Bit",
  paybox:  "Paybox",
};

// ── Font registration ────────────────────────────────────────────────────────

function resolveFont(filename: string): string {
  const localPath = path.join(process.cwd(), "public", "fonts", filename);
  if (fs.existsSync(localPath)) return localPath;
  // Remote fallback (fetched once per cold start by @react-pdf/renderer)
  const envUrl = process.env.HEBREW_FONT_URL;
  if (envUrl && filename.includes("Regular")) return envUrl;
  return `https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansHebrew/${filename}`;
}

let _fontRegistered = false;
function ensureFont() {
  if (_fontRegistered) return;
  try {
    Font.register({
      family: "Hebrew",
      fonts: [
        { src: resolveFont("NotoSansHebrew-Regular.ttf"), fontWeight: 400 },
        { src: resolveFont("NotoSansHebrew-Bold.ttf"),    fontWeight: 700 },
      ],
    });
    _fontRegistered = true;
  } catch (err) {
    console.warn("[generateInvoicePDF] Font registration failed — Hebrew may not render:", err);
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceData {
  document_type:       "heshbonit_mas" | "kabala";
  invoice_number:      string;
  issued_at:           string;  // ISO timestamp
  business_legal_name: string;
  business_address:    string;
  osek_murshe_number?: string;
  customer_name:       string;
  customer_phone:      string;
  service_description: string;
  quantity:            number;
  unit_price:          number;
  subtotal:            number;
  vat_rate:            number;  // 18 for osek_murshe, 0 for osek_patur
  vat_amount:          number;
  total:               number;
  payment_method:      string;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page:         { fontFamily: "Hebrew", fontSize: 10, padding: 40, direction: "rtl" as never, backgroundColor: "#ffffff" },
  headerRow:    { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 24 },
  bizBlock:     { textAlign: "right" },
  docBlock:     { textAlign: "left" },
  h1:           { fontFamily: "Hebrew", fontWeight: 700, fontSize: 18, color: "#00C896", marginBottom: 4 },
  h2:           { fontFamily: "Hebrew", fontWeight: 700, fontSize: 12, color: "#0A0F1E", marginBottom: 2 },
  small:        { fontSize: 9,  color: "#6B7280", marginBottom: 2 },
  divider:      { borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginVertical: 12 },
  label:        { fontFamily: "Hebrew", fontWeight: 700, fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 2 },
  tableHeader:  { flexDirection: "row-reverse", backgroundColor: "#F7F8FA", padding: "6px 8px", borderRadius: 4, marginBottom: 4 },
  tableRow:     { flexDirection: "row-reverse", padding: "6px 8px", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  col1:         { flex: 3, textAlign: "right" },
  col2:         { flex: 1, textAlign: "center" },
  col3:         { flex: 1, textAlign: "center" },
  col4:         { flex: 1, textAlign: "left" },
  totalsBlock:  { marginTop: 12, alignItems: "flex-start" },
  totalRow:     { flexDirection: "row-reverse", justifyContent: "space-between", width: 200, paddingVertical: 3 },
  totalLabel:   { textAlign: "right", color: "#374151" },
  totalValue:   { textAlign: "left",  color: "#374151" },
  grandTotal:   { fontFamily: "Hebrew", fontWeight: 700, fontSize: 12, color: "#0A0F1E" },
  paymentLine:  { marginTop: 20, fontSize: 9, color: "#6B7280" },
  footer:       { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#D1D5DB" },
});

// ── Document components ──────────────────────────────────────────────────────

function HeshbonitMas({ d }: { d: InvoiceData }) {
  const date = new Date(d.issued_at).toLocaleDateString("he-IL");
  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.headerRow}>
          <View style={S.bizBlock}>
            <Text style={S.h2}>{d.business_legal_name}</Text>
            {d.business_address     && <Text style={S.small}>{d.business_address}</Text>}
            {d.osek_murshe_number   && <Text style={S.small}>{"מספר עוסק: " + d.osek_murshe_number}</Text>}
          </View>
          <View style={S.docBlock}>
            <Text style={S.h1}>{"חשבונית מס"}</Text>
            <Text style={S.small}>{"עוסק מורשה"}</Text>
            <Text style={S.small}>{"מס׳ חשבונית: " + d.invoice_number}</Text>
            <Text style={S.small}>{"תאריך: " + date}</Text>
          </View>
        </View>

        <View style={S.divider} />

        {/* Customer */}
        <View style={{ marginBottom: 16 }}>
          <Text style={S.label}>{"לכבוד"}</Text>
          <Text style={S.h2}>{d.customer_name}</Text>
          {d.customer_phone && <Text style={S.small}>{"טלפון: " + d.customer_phone}</Text>}
        </View>

        {/* Table header */}
        <View style={S.tableHeader}>
          <Text style={[S.col1, { fontFamily: "Hebrew", fontWeight: 700 }]}>{"תיאור השירות"}</Text>
          <Text style={[S.col2, { fontFamily: "Hebrew", fontWeight: 700 }]}>{"כמות"}</Text>
          <Text style={[S.col3, { fontFamily: "Hebrew", fontWeight: 700 }]}>{"מחיר יחידה"}</Text>
          <Text style={[S.col4, { fontFamily: "Hebrew", fontWeight: 700 }]}>{"סה״כ"}</Text>
        </View>

        {/* Table row */}
        <View style={S.tableRow}>
          <Text style={S.col1}>{d.service_description}</Text>
          <Text style={S.col2}>{d.quantity}</Text>
          <Text style={S.col3}>{"₪" + d.unit_price.toFixed(2)}</Text>
          <Text style={S.col4}>{"₪" + d.subtotal.toFixed(2)}</Text>
        </View>

        {/* Totals */}
        <View style={S.totalsBlock}>
          <View style={S.totalRow}>
            <Text style={S.totalLabel}>{"סכום לפני מע״מ"}</Text>
            <Text style={S.totalValue}>{"₪" + d.subtotal.toFixed(2)}</Text>
          </View>
          <View style={S.totalRow}>
            <Text style={S.totalLabel}>{"מע״מ (" + d.vat_rate + "%)"}</Text>
            <Text style={S.totalValue}>{"₪" + d.vat_amount.toFixed(2)}</Text>
          </View>
          <View style={[S.totalRow, { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 6, marginTop: 4 }]}>
            <Text style={[S.totalLabel, S.grandTotal]}>{"סה״כ לתשלום"}</Text>
            <Text style={[S.totalValue,  S.grandTotal]}>{"₪" + d.total.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={S.paymentLine}>{"אמצעי תשלום: " + (PAYMENT_METHOD_LABELS[d.payment_method] ?? d.payment_method)}</Text>

        <Text style={S.footer}>{"מסמך זה הופק על-ידי Vomni · vomni.io"}</Text>
      </Page>
    </Document>
  );
}

function Kabala({ d }: { d: InvoiceData }) {
  const date = new Date(d.issued_at).toLocaleDateString("he-IL");
  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.headerRow}>
          <View style={S.bizBlock}>
            <Text style={S.h2}>{d.business_legal_name}</Text>
            {d.business_address && <Text style={S.small}>{d.business_address}</Text>}
          </View>
          <View style={S.docBlock}>
            <Text style={S.h1}>{"קבלה"}</Text>
            <Text style={S.small}>{"מס׳ קבלה: " + d.invoice_number}</Text>
            <Text style={S.small}>{"תאריך: " + date}</Text>
          </View>
        </View>

        <View style={S.divider} />

        {/* Customer */}
        <View style={{ marginBottom: 16 }}>
          <Text style={S.label}>{"התקבל מ"}</Text>
          <Text style={S.h2}>{d.customer_name}</Text>
          {d.customer_phone && <Text style={S.small}>{"טלפון: " + d.customer_phone}</Text>}
        </View>

        {/* Table header */}
        <View style={S.tableHeader}>
          <Text style={[S.col1, { fontFamily: "Hebrew", fontWeight: 700 }]}>{"תיאור"}</Text>
          <Text style={[S.col4, { fontFamily: "Hebrew", fontWeight: 700 }]}>{"סכום"}</Text>
        </View>

        {/* Table row */}
        <View style={S.tableRow}>
          <Text style={S.col1}>{d.service_description}</Text>
          <Text style={S.col4}>{"₪" + d.total.toFixed(2)}</Text>
        </View>

        {/* Total */}
        <View style={[S.totalsBlock, { marginTop: 16 }]}>
          <View style={[S.totalRow, { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 6 }]}>
            <Text style={[S.totalLabel, S.grandTotal]}>{"סה״כ שולם"}</Text>
            <Text style={[S.totalValue,  S.grandTotal]}>{"₪" + d.total.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={S.paymentLine}>{"אמצעי תשלום: " + (PAYMENT_METHOD_LABELS[d.payment_method] ?? d.payment_method)}</Text>

        <Text style={S.footer}>{"מסמך זה הופק על-ידי Vomni · vomni.io"}</Text>
      </Page>
    </Document>
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  ensureFont();
  const doc = data.document_type === "heshbonit_mas"
    ? React.createElement(HeshbonitMas, { d: data })
    : React.createElement(Kabala,       { d: data });
  const instance = pdf(doc as React.ReactElement<any>);
  const stream = await instance.toBuffer();
  // toBuffer() returns ReadableStream in some @react-pdf/renderer versions;
  // collect it into a Buffer regardless.
  if (Buffer.isBuffer(stream)) return stream;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}
