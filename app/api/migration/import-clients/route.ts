import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseCSVText } from "@/lib/csv-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("business_id") as string | null;
    const platform = (formData.get("platform") as string) || "csv";
    const preview = formData.get("preview") === "true";

    if (!file || !businessId) {
      return NextResponse.json({ error: "Missing file or business_id" }, { status: 400 });
    }

    // Read file as text — try UTF-8 first, then latin1 for Hebrew Windows-1252
    const arrayBuffer = await file.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("utf-8").decode(arrayBuffer);
    } catch {
      text = new TextDecoder("windows-1252").decode(arrayBuffer);
    }

    // Strip BOM if present (UTF-16 / UTF-8 with BOM)
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const parsed = parseCSVText(text);

    if (parsed.clients.length === 0) {
      return NextResponse.json({
        error: "No clients found in file. Please check the file has a header row and name/phone/email columns.",
        parseErrors: parsed.errors,
        detectedColumns: parsed.detectedColumns,
      }, { status: 422 });
    }

    // Preview mode — return first 5 rows without inserting
    if (preview) {
      return NextResponse.json({
        preview: parsed.clients.slice(0, 5),
        detectedColumns: parsed.detectedColumns,
        totalRows: parsed.totalRows,
        estimatedClients: parsed.clients.length,
      });
    }

    // Create import record
    const { data: importRecord } = await supabaseAdmin
      .from("migration_imports")
      .insert({
        business_id: businessId,
        source_platform: platform,
        file_name: file.name,
        total_rows: parsed.totalRows,
        status: "processing",
      })
      .select("id")
      .single();

    const importId = importRecord?.id;

    // Get existing phones to deduplicate
    const { data: existing } = await supabaseAdmin
      .from("clients")
      .select("phone")
      .eq("business_id", businessId)
      .not("phone", "is", null);

    const existingPhones = new Set((existing ?? []).map((r: { phone: string | null }) => r.phone).filter(Boolean));

    let imported = 0;
    let skipped = 0;
    let errorRows = 0;

    // Insert in batches of 100
    const BATCH = 100;
    for (let i = 0; i < parsed.clients.length; i += BATCH) {
      const batch = parsed.clients.slice(i, i + BATCH);
      const toInsert = batch
        .filter(c => {
          if (c.phone && existingPhones.has(c.phone)) { skipped++; return false; }
          return true;
        })
        .map(c => ({
          business_id: businessId,
          name: c.name,
          email: c.email,
          phone: c.phone,
          notes: c.notes,
          source: platform,
        }));

      if (toInsert.length > 0) {
        const { error, data } = await supabaseAdmin
          .from("clients")
          .insert(toInsert)
          .select("id");

        if (error) {
          console.error("[import-clients] insert error:", error.message);
          errorRows += toInsert.length;
        } else {
          imported += (data?.length ?? 0);
          // Track new phones
          toInsert.forEach(c => { if (c.phone) existingPhones.add(c.phone); });
        }
      }
    }

    // Update import record
    if (importId) {
      await supabaseAdmin.from("migration_imports").update({
        imported_rows: imported,
        skipped_rows: skipped,
        error_rows: errorRows,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", importId);
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errorRows,
      parseErrors: parsed.errors.slice(0, 10),
    });
  } catch (err) {
    console.error("[import-clients]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: "Missing business_id" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("migration_imports")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  const { count } = await supabaseAdmin
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return NextResponse.json({ imports: data ?? [], totalClients: count ?? 0 });
}
