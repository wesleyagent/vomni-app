import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";
import { parseCSVText } from "@/lib/csv-parser";
import { sendManualReviewRequest } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/crm/bulk-review-request
// Accepts multipart/form-data: file (CSV with name + phone columns), business_id
// Sends a review request to each row and logs to whatsapp_log
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const businessId = formData.get("business_id") as string | null;

  if (!file || !businessId) {
    return NextResponse.json({ error: "Missing file or business_id" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, businessId, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .single();

  if (!biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Parse the CSV file
  const arrayBuffer = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder("utf-8").decode(arrayBuffer);
  } catch {
    text = new TextDecoder("windows-1252").decode(arrayBuffer);
  }
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const parsed = parseCSVText(text);

  if (parsed.clients.length === 0) {
    return NextResponse.json({
      error: "No rows found. CSV must have name and phone columns.",
      detectedColumns: parsed.detectedColumns,
    }, { status: 422 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const client of parsed.clients) {
    if (!client.phone || !client.name) { skipped++; continue; }

    const result = await sendManualReviewRequest(
      { name: client.name, phone: client.phone },
      biz
    );

    if (result.success) {
      sent++;
    } else if (result.reason === "opted_out") {
      skipped++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ success: true, sent, failed, skipped, total: parsed.clients.length });
}
