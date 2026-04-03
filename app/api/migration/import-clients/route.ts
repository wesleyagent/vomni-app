import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseCSVText } from "@/lib/csv-parser";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";
import { normaliseToE164, fingerprintPhone } from "@/lib/phone";

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

    // ── Pre-fetch phones already in customer_profiles ───────────────────────
    // customer_profiles always has a plaintext phone column (migration 017).
    // We check this to avoid duplicates without relying on any unique constraint.
    const { data: existingProfileRows } = await supabaseAdmin
      .from("customer_profiles")
      .select("phone")
      .eq("business_id", businessId)
      .not("phone", "is", null);

    const existingPhones = new Set(
      (existingProfileRows ?? []).map((r: { phone: string }) => r.phone).filter(Boolean)
    );

    // In-memory dedup within this batch
    const seenFingerprints = new Set<string>();

    let imported = 0;
    let skipped = 0;
    let errorRows = 0;
    let lastInsertError = "";

    // Process in batches of 100
    const BATCH = 100;
    for (let i = 0; i < parsed.clients.length; i += BATCH) {
      const batch = parsed.clients.slice(i, i + BATCH);
      const toInsert: Array<{ business_id: string; phone: string; name: string | null }> = [];

      for (const c of batch) {
        if (!c.phone) { skipped++; continue; }

        let e164: string;
        try {
          e164 = normaliseToE164(c.phone);
        } catch {
          errorRows++;
          continue;
        }

        const fingerprint = fingerprintPhone(e164, businessId);
        if (seenFingerprints.has(fingerprint)) { skipped++; continue; }
        seenFingerprints.add(fingerprint);

        if (existingPhones.has(e164)) { skipped++; continue; }

        toInsert.push({
          business_id: businessId,
          phone: e164,          // customer_profiles.phone is always plaintext
          name: c.name ?? null,
        });
        existingPhones.add(e164); // prevent cross-batch duplicates
      }

      if (toInsert.length === 0) continue;

      // Insert directly into customer_profiles.
      // This uses only the 3 columns that exist in the base migration 017 schema
      // and requires no unique constraint (we pre-checked existingPhones above).
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("customer_profiles")
        .insert(toInsert)
        .select("id");

      if (insertErr) {
        console.error("[import-clients] customer_profiles insert error:", insertErr.message);
        lastInsertError = insertErr.message;
        errorRows += toInsert.length;
      } else {
        imported += inserted?.length ?? 0;
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
      ...(lastInsertError ? { insertError: lastInsertError } : {}),
      parseErrors: parsed.errors.slice(0, 10),
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
