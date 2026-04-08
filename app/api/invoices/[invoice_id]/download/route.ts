import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/require-auth";

// GET /api/invoices/[invoice_id]/download
// Optional query: ?expiry=whatsapp → 7-day signed URL; default → 1-hour

const EXPIRY_DEFAULT   = 60 * 60;           // 1 hour (seconds)
const EXPIRY_WHATSAPP  = 7 * 24 * 60 * 60;  // 7 days

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoice_id: string }> }
) {
  // ── Auth ──────────────────────────────────────────────────
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { email } = authResult;

  const { invoice_id } = await params;

  // ── Fetch invoice + verify ownership ─────────────────────
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id, pdf_storage_path, business_id")
    .eq("id", invoice_id)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Confirm the requesting user owns this business
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("id", invoice.business_id)
    .eq("owner_email", email)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!invoice.pdf_storage_path) {
    return NextResponse.json({ error: "PDF not available for this invoice" }, { status: 404 });
  }

  // ── Generate fresh signed URL — never stored in DB ────────
  const expiresIn = req.nextUrl.searchParams.get("expiry") === "whatsapp"
    ? EXPIRY_WHATSAPP
    : EXPIRY_DEFAULT;

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from("invoices")
    .createSignedUrl(invoice.pdf_storage_path, expiresIn);

  if (signErr || !signed?.signedUrl) {
    console.error("[invoices/download] signed URL error:", signErr);
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
