import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseCSVText } from "@/lib/csv-parser";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";
import { normaliseToE164, encryptPhone, maskPhone, fingerprintPhone } from "@/lib/phone";

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

    // Get existing phone_display values to assist dedup (non-raw)
    const { data: existing } = await supabaseAdmin
      .from("clients")
      .select("phone_display")
      .eq("business_id", businessId)
      .not("phone_display", "is", null);

    const existingDisplays = new Set(
      (existing ?? []).map((r: { phone_display: string | null }) => r.phone_display).filter(Boolean)
    );

    // In-memory fingerprint set for dedup within this import batch
    const seenFingerprints = new Set<string>();

    let imported = 0;
    let skipped = 0;
    let errorRows = 0;

    // Insert in batches of 100
    const BATCH = 100;
    for (let i = 0; i < parsed.clients.length; i += BATCH) {
      const batch = parsed.clients.slice(i, i + BATCH);
      const toInsert: Array<Record<string, unknown>> = [];
      const toUpsertProfiles: Array<Record<string, unknown>> = [];

      for (const c of batch) {
        if (!c.phone) {
          skipped++;
          continue;
        }

        // Normalise phone — skip row on failure (log index + reason, never the number)
        let e164: string;
        try {
          e164 = normaliseToE164(c.phone);
        } catch (err) {
          const reason = err instanceof Error ? err.message : "unknown";
          console.warn(`[import-clients] row ${i} normalisation failed: ${reason}`);
          // Insert with normalisation_failed flag so it's visible in the UI
          toInsert.push({
            business_id: businessId,
            name: c.name,
            email: c.email,
            phone: null,
            phone_encrypted: null,
            phone_display: null,
            normalisation_failed: true,
            notes: c.notes,
            source: "import",
            import_platform: platform,
          });
          errorRows++;
          continue;
        }

        // Dedup: fingerprint within batch + against existing phone_display
        const fingerprint = fingerprintPhone(e164, businessId);
        const display     = maskPhone(e164);

        if (seenFingerprints.has(fingerprint)) {
          // Within-batch duplicate — skip entirely
          skipped++;
          continue;
        }

        if (existingDisplays.has(display)) {
          // Already in clients table — skip insert but still upsert into
          // customer_profiles so that previously-imported clients appear in CRM
          const encExisting = encryptPhone(e164);
          toUpsertProfiles.push({
            business_id: businessId,
            phone: e164,
            phone_display: display,
            phone_encrypted: encExisting,
            name: c.name,
            source: "import",
            import_platform: platform,
            opted_out: false,
            updated_at: new Date().toISOString(),
          });
          skipped++;
          continue;
        }

        seenFingerprints.add(fingerprint);

        // Encrypt — raw e164 exists only in this loop, never written to DB
        const encrypted = encryptPhone(e164);

        toInsert.push({
          business_id: businessId,
          name: c.name,
          email: c.email,
          phone: null,            // raw phone never stored as plaintext
          phone_encrypted: encrypted,
          phone_display: display,
          normalisation_failed: false,
          notes: c.notes,
          source: "import",
          import_platform: platform,
          opted_out: false,
        });

        // Also queue for customer_profiles so the CRM tab shows them immediately
        toUpsertProfiles.push({
          business_id: businessId,
          phone: e164,
          phone_display: display,
          phone_encrypted: encrypted,
          name: c.name,
          source: "import",
          import_platform: platform,
          opted_out: false,
          updated_at: new Date().toISOString(),
        });
      }

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
          // Track newly imported displays for cross-batch dedup
          toInsert.forEach(c => {
            if (c.phone_display) existingDisplays.add(c.phone_display as string);
          });
        }
      }

      // Upsert into customer_profiles so imported clients appear in the CRM immediately
      if (toUpsertProfiles.length > 0) {
        const { error: profileErr } = await supabaseAdmin
          .from("customer_profiles")
          .upsert(toUpsertProfiles, { onConflict: "business_id,phone" });
        if (profileErr) {
          console.error("[import-clients] customer_profiles upsert error:", profileErr.message);
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
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return NextResponse.json({ imports: data ?? [], totalClients: count ?? 0 });
}
