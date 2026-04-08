import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/require-auth";
import { generateInvoicePDF, VAT_RATE } from "@/lib/generateInvoicePDF";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_PAYMENT_METHODS = ["cash", "credit", "bit", "paybox"] as const;
type PaymentMethod = typeof ALLOWED_PAYMENT_METHODS[number];

interface GenerateBody {
  booking_id:          string;
  customer_name:       string;
  customer_phone?:     string;
  service_description: string;
  unit_price:          number;
  quantity:            number;
  payment_method:      PaymentMethod;
}

async function ensureInvoicesBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (buckets?.some(b => b.name === "invoices")) return;
  await supabaseAdmin.storage.createBucket("invoices", {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["application/pdf"],
  });
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { email } = authResult;

  // ── Parse body ────────────────────────────────────────────
  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { booking_id, customer_name, customer_phone, service_description, unit_price, quantity, payment_method } = body;

  if (!booking_id || !customer_name || !service_description || !unit_price || !quantity || !payment_method) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: "Invalid payment_method" }, { status: 400 });
  }

  // ── Fetch business ────────────────────────────────────────
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, business_legal_name, business_address, osek_type, osek_murshe_number")
    .eq("owner_email", email)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // ── Verify booking belongs to this business ───────────────
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id")
    .eq("id", booking_id)
    .eq("business_id", business.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // ── 1. Generate invoice number ────────────────────────────
  const { data: invoiceNumber, error: seqErr } = await supabaseAdmin
    .rpc("generate_invoice_number", { p_business_id: business.id });

  if (seqErr || !invoiceNumber) {
    console.error("[invoices/generate] sequence error:", seqErr);
    return NextResponse.json({ error: "Failed to generate invoice number" }, { status: 500 });
  }

  // ── 2. Calculate amounts ──────────────────────────────────
  // TODO: pull VAT rate from config table when multi-rate support is needed
  const isOsekMurshe  = (business as Record<string, unknown>).osek_type === "osek_murshe";
  const vatRate       = isOsekMurshe ? VAT_RATE : 0;
  const subtotal      = parseFloat((unit_price * quantity).toFixed(2));
  const vatAmount     = isOsekMurshe ? parseFloat((subtotal * vatRate / 100).toFixed(2)) : 0;
  const total         = parseFloat((subtotal + vatAmount).toFixed(2));
  const documentType  = isOsekMurshe ? "heshbonit_mas" : "kabala";

  const invoiceData = {
    document_type:       documentType as "heshbonit_mas" | "kabala",
    invoice_number:      invoiceNumber as string,
    issued_at:           new Date().toISOString(),
    business_legal_name: (business as Record<string, unknown>).business_legal_name as string ?? (business.name ?? ""),
    business_address:    (business as Record<string, unknown>).business_address as string ?? "",
    osek_murshe_number:  (business as Record<string, unknown>).osek_murshe_number as string ?? "",
    customer_name,
    customer_phone:      customer_phone ?? "",
    service_description,
    quantity,
    unit_price,
    subtotal,
    vat_rate:    vatRate,
    vat_amount:  vatAmount,
    total,
    payment_method,
  };

  // ── 3. Generate PDF ───────────────────────────────────────
  let pdfBuffer: Buffer | null = null;
  let pdfStoragePath: string | null = null;
  let warning = false;

  try {
    pdfBuffer = await generateInvoicePDF(invoiceData);
  } catch (err) {
    console.error("[invoices/generate] PDF generation failed:", err);
    warning = true;
  }

  // ── 4. Upload to Storage ──────────────────────────────────
  if (pdfBuffer) {
    try {
      await ensureInvoicesBucket();
      const storagePath = `${business.id}/${invoiceNumber}.pdf`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("invoices")
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadErr) {
        console.error("[invoices/generate] Storage upload failed:", uploadErr);
        warning = true;
      } else {
        pdfStoragePath = storagePath;
      }
    } catch (err) {
      console.error("[invoices/generate] Storage error:", err);
      warning = true;
    }
  } else {
    warning = true;
  }

  // ── 5. Save invoice record ────────────────────────────────
  const { data: invoice, error: dbErr } = await supabaseAdmin
    .from("invoices")
    .insert({
      business_id:         business.id,
      booking_id,
      invoice_number:      invoiceNumber,
      document_type:       documentType,
      customer_name,
      customer_phone:      customer_phone ?? null,
      service_description,
      quantity,
      unit_price,
      subtotal,
      vat_rate:            vatRate,
      vat_amount:          vatAmount,
      total,
      payment_method,
      pdf_storage_path:    pdfStoragePath,
      issued_at:           new Date().toISOString(),
    })
    .select("id")
    .single();

  if (dbErr || !invoice) {
    console.error("[invoices/generate] DB insert failed:", dbErr);
    // Do not expose raw Supabase errors to the client
    return NextResponse.json({ error: "שגיאה בשמירת המסמך. אנא נסה שוב." }, { status: 500 });
  }

  // ── 6. Mark booking as completed ─────────────────────────
  await supabaseAdmin
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", booking_id);

  return NextResponse.json({
    invoice_id:       invoice.id,
    invoice_number:   invoiceNumber,
    pdf_storage_path: pdfStoragePath,
    ...(warning ? { warning: true } : {}),
  });
}
