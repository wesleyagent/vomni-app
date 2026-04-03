import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseCSVText } from "@/lib/csv-parser";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("business_id") as string | null;
    const platform = (formData.get("platform") as string) || "csv";
    const preview = formData.get("preview") === "true";

    if (!file || !businessId) {
      return NextResponse.json({ error: "Missing file or business_id" }, { status: 400 });
    }

    const ownership = await requireBusinessOwnership(auth.email, businessId, supabaseAdmin);
    if (ownership instanceof NextResponse) return ownership;

    // Read file as text — try UTF-8 first, then Windows-1252 for Hebrew exports
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

    // ── Pre-fetch phones already in customer_profiles ──────────────────────
    const { data: existingProfileRows } = await supabaseAdmin
      .from("customer_profiles")
      .select("phone")
      .eq("business_id", businessId)
      .not("phone", "is", null);

    const existingPhones = new Set(
      (existingProfileRows ?? []).map((r: { phone: string }) => r.phone).filter(Boolean)
    );

    // ── Build rows to insert ───────────────────────────────────────────────
    // c.phone is already normalised to E.164 (or best-effort) by csv-parser.
    // We do NOT re-normalise here — that previously caused all rows to error.
    const seenPhones = new Set<string>();
    const toInsert: Array<Record<string, unknown>> = [];
    let skipped = 0;

    for (const c of parsed.clients) {
      const phone = c.phone;

      // Skip rows without a usable phone number
      if (!phone || phone.length < 7) { skipped++; continue; }

      // In-batch dedup
      if (seenPhones.has(phone)) { skipped++; continue; }
      seenPhones.add(phone);

      // Dedup against existing DB records
      if (existingPhones.has(phone)) { skipped++; continue; }
      existingPhones.add(phone); // prevent cross-batch duplication

      toInsert.push({
        business_id:   businessId,
        phone,
        name:          c.name ?? null,
        last_visit_at: c.last_visit_at ?? null,
        total_visits:  c.total_visits ?? 0,
      });
    }

    let imported = 0;
    let errorRows = 0;
    const insertErrors: string[] = [];

    if (toInsert.length > 0) {
      // ── Attempt 1: batch upsert with ignoreDuplicates ──────────────────
      // Uses ON CONFLICT (business_id, phone) DO NOTHING — requires the
      // unique constraint from migration 017. Handles any edge-case duplicates
      // that slipped past the pre-check.
      const { data: upserted, error: upsertErr } = await supabaseAdmin
        .from("customer_profiles")
        .upsert(toInsert, { onConflict: "business_id,phone", ignoreDuplicates: true })
        .select("id");

      if (!upsertErr) {
        imported = upserted?.length ?? 0;
        skipped += toInsert.length - imported; // remainder were silently skipped duplicates
      } else {
        // ── Attempt 2: row-by-row insert ───────────────────────────────
        // Batch upsert failed (constraint may not exist, or a column is missing).
        // Insert one row at a time so one bad row doesn't kill the rest.
        console.warn("[import-clients] batch upsert failed, falling back to row-by-row:", upsertErr.message);

        for (const row of toInsert) {
          // Try with visit fields (migration 017 columns)
          const { data: rowData, error: rowErr } = await supabaseAdmin
            .from("customer_profiles")
            .insert(row)
            .select("id");

          if (!rowErr) {
            imported += rowData?.length ?? 0;
            continue;
          }

          // Unique violation → already exists, treat as skipped
          if (rowErr.code === "23505") {
            skipped++;
            continue;
          }

          // Column missing → retry with bare minimum (business_id, phone, name)
          const { data: bareData, error: bareErr } = await supabaseAdmin
            .from("customer_profiles")
            .insert({ business_id: row.business_id, phone: row.phone, name: row.name })
            .select("id");

          if (!bareErr) {
            imported += bareData?.length ?? 0;
          } else if (bareErr.code === "23505") {
            skipped++;
          } else {
            errorRows++;
            const msg = bareErr.message;
            if (!insertErrors.includes(msg)) insertErrors.push(msg);
          }
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
      ...(insertErrors.length > 0 ? { insertErrors } : {}),
      parseErrors: parsed.errors.slice(0, 10),
      detectedColumns: parsed.detectedColumns,
    });
  } catch (err) {
    console.error("[import-clients]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: "Missing business_id" }, { status: 400 });

  const ownership = await requireBusinessOwnership(auth.email, businessId, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  const { data } = await supabaseAdmin
    .from("migration_imports")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  const { count } = await supabaseAdmin
    .from("customer_profiles")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return NextResponse.json({ imports: data ?? [], totalClients: count ?? 0 });
}
