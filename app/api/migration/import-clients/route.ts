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

    // Strip BOM if present
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

    // ── Dedup — collect phones already in customer_profiles ───────────────
    // Only used to count skipped in the stats; upsert handles the actual dedup.
    const { data: existingRows } = await supabaseAdmin
      .from("customer_profiles")
      .select("phone")
      .eq("business_id", businessId)
      .not("phone", "is", null);

    const existingPhones = new Set(
      (existingRows ?? []).map((r: { phone: string }) => r.phone).filter(Boolean)
    );

    // ── Build rows ────────────────────────────────────────────────────────
    // c.phone is already normalised to E.164 by csv-parser.
    const seenPhones = new Set<string>();
    // Full row attempts to set source + visit data (requires migration 019/020 columns)
    const fullRows: Array<Record<string, unknown>> = [];
    // Base rows use only migration 017 columns (always safe)
    const baseRows: Array<Record<string, unknown>> = [];

    let skipped = 0;

    for (const c of parsed.clients) {
      const phone = c.phone;
      if (!phone || phone.length < 7) { skipped++; continue; }

      if (seenPhones.has(phone)) { skipped++; continue; }
      seenPhones.add(phone);

      // Count pre-existing phones as skipped for stats, but still upsert
      // (upsert will UPDATE their last_visit_at / total_visits)
      if (existingPhones.has(phone)) skipped++;

      // Full row: source + visit data (may fail if migration 019/020 not run)
      fullRows.push({
        business_id:    businessId,
        phone,
        name:           c.name ?? null,
        last_visit_at:  c.last_visit_at ?? null,
        total_visits:   c.total_visits ?? 0,
        source:         "import",
        import_platform: platform,
      });

      // Base row: only guaranteed migration 017 columns
      baseRows.push({
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

    if (fullRows.length > 0) {
      // ── Attempt 1: upsert full rows (UPDATE on conflict) ────────────────
      // Uses ON CONFLICT (business_id, phone) DO UPDATE — updates last_visit_at
      // and total_visits even if the phone was already imported previously.
      // Requires unique constraint from migration 017.
      const { data: up1, error: err1 } = await supabaseAdmin
        .from("customer_profiles")
        .upsert(fullRows, { onConflict: "business_id,phone" })
        .select("id");

      if (!err1) {
        imported = up1?.length ?? 0;
      } else {
        // ── Attempt 2: upsert base rows only (no source/import_platform) ──
        // Falls here when source / import_platform columns don't exist yet.
        console.warn("[import-clients] full upsert failed, trying base rows:", err1.message);

        const { data: up2, error: err2 } = await supabaseAdmin
          .from("customer_profiles")
          .upsert(baseRows, { onConflict: "business_id,phone" })
          .select("id");

        if (!up2 || err2) {
          // ── Attempt 3: row-by-row insert ────────────────────────────────
          // Fallback when unique constraint doesn't exist (no onConflict target).
          console.warn("[import-clients] base upsert failed, going row-by-row:", err2?.message);

          for (const row of baseRows) {
            // Insert with visit data
            const { data: rd, error: re } = await supabaseAdmin
              .from("customer_profiles")
              .insert(row)
              .select("id");

            if (!re) { imported += rd?.length ?? 0; continue; }

            if (re.code === "23505") {
              // Row exists — try to update last_visit_at / total_visits
              await supabaseAdmin
                .from("customer_profiles")
                .update({ last_visit_at: row.last_visit_at, total_visits: row.total_visits })
                .eq("business_id", row.business_id as string)
                .eq("phone", row.phone as string);
              imported++;
              continue;
            }

            // Column missing → bare 3-column insert
            const { data: bd, error: be } = await supabaseAdmin
              .from("customer_profiles")
              .insert({ business_id: row.business_id, phone: row.phone, name: row.name })
              .select("id");

            if (!be) {
              imported += bd?.length ?? 0;
            } else if (be.code === "23505") {
              // Already exists, nothing to do
            } else {
              errorRows++;
              const msg = be.message;
              if (!insertErrors.includes(msg)) insertErrors.push(msg);
            }
          }
        } else {
          imported = up2?.length ?? 0;
        }
      }
    }

    // ── Update import record ──────────────────────────────────────────────
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
