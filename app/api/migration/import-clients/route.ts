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

    // ── Dedup: collect phones already in clients table ──────────────────────
    // Try phone_display first (migration 019+), fall back to plaintext phone
    const existingDisplays = new Set<string>();
    const existingPhones = new Set<string>();

    const { data: existByDisplay } = await supabaseAdmin
      .from("clients")
      .select("phone_display")
      .eq("business_id", businessId)
      .not("phone_display", "is", null);
    (existByDisplay ?? []).forEach((r: { phone_display: string }) => {
      if (r.phone_display) existingDisplays.add(r.phone_display);
    });

    const { data: existByPhone } = await supabaseAdmin
      .from("clients")
      .select("phone")
      .eq("business_id", businessId)
      .not("phone", "is", null);
    (existByPhone ?? []).forEach((r: { phone: string }) => {
      if (r.phone) existingPhones.add(r.phone);
    });

    // ── Pre-fetch customer_profiles phones to avoid duplicate CRM inserts ───
    const { data: existingProfileRows } = await supabaseAdmin
      .from("customer_profiles")
      .select("phone")
      .eq("business_id", businessId)
      .not("phone", "is", null);

    const existingProfilePhones = new Set(
      (existingProfileRows ?? []).map((r: { phone: string }) => r.phone).filter(Boolean)
    );

    // In-memory fingerprint set for dedup within this import batch
    const seenFingerprints = new Set<string>();

    let imported = 0;
    let skipped = 0;
    let errorRows = 0;
    let profilesAdded = 0;

    // Insert in batches of 100
    const BATCH = 100;
    for (let i = 0; i < parsed.clients.length; i += BATCH) {
      const batch = parsed.clients.slice(i, i + BATCH);

      // Full rows (migration 019+ schema with encryption)
      const toInsertFull: Array<Record<string, unknown>> = [];
      // Minimal rows (base migration 014 schema, plaintext phone as fallback)
      const toInsertMinimal: Array<Record<string, unknown>> = [];
      // Profiles to add to customer_profiles
      const toInsertProfiles: Array<{
        business_id: string; phone: string; name: string | null;
        phone_display?: string; phone_encrypted?: string; source?: string;
      }> = [];

      for (const c of batch) {
        if (!c.phone) {
          skipped++;
          continue;
        }

        // Normalise phone
        let e164: string;
        try {
          e164 = normaliseToE164(c.phone);
        } catch (err) {
          const reason = err instanceof Error ? err.message : "unknown";
          console.warn(`[import-clients] row ${i} normalisation failed: ${reason}`);
          errorRows++;
          continue;
        }

        const fingerprint = fingerprintPhone(e164, businessId);
        const display     = maskPhone(e164);

        if (seenFingerprints.has(fingerprint)) {
          skipped++;
          continue;
        }
        seenFingerprints.add(fingerprint);

        // Dedup against existing clients (by display mask OR plaintext phone)
        if (existingDisplays.has(display) || existingPhones.has(e164)) {
          skipped++;
        } else {
          const encrypted = encryptPhone(e164);

          // Full row (preferred — needs migration 019)
          toInsertFull.push({
            business_id: businessId,
            name: c.name,
            email: c.email,
            phone: null,
            phone_encrypted: encrypted,
            phone_display: display,
            normalisation_failed: false,
            notes: c.notes,
            source: "import",
            import_platform: platform,
          });

          // Minimal row (fallback — works with base migration 014)
          toInsertMinimal.push({
            business_id: businessId,
            name: c.name,
            email: c.email,
            phone: e164,           // plaintext stored as fallback
            notes: c.notes,
            source: "import",
          });
        }

        // Queue for customer_profiles if not already there
        if (!existingProfilePhones.has(e164)) {
          const encrypted = encryptPhone(e164);
          toInsertProfiles.push({
            business_id: businessId,
            phone: e164,
            name: c.name ?? null,
            phone_display: display,
            phone_encrypted: encrypted,
            source: "import",
          });
          existingProfilePhones.add(e164);
        }
      }

      // ── Insert into clients ─────────────────────────────────────────────
      if (toInsertFull.length > 0) {
        const { data, error } = await supabaseAdmin
          .from("clients")
          .insert(toInsertFull)
          .select("id");

        if (error) {
          // Full insert failed (likely migration 019 columns missing) — try minimal
          console.warn("[import-clients] full insert failed, trying minimal:", error.message);
          const { data: minData, error: minErr } = await supabaseAdmin
            .from("clients")
            .insert(toInsertMinimal)
            .select("id");

          if (minErr) {
            console.error("[import-clients] minimal insert also failed:", minErr.message);
            errorRows += toInsertMinimal.length;
          } else {
            imported += minData?.length ?? 0;
            // Track for dedup (both display and plaintext)
            toInsertFull.forEach((r, idx) => {
              if (r.phone_display) existingDisplays.add(r.phone_display as string);
            });
            toInsertMinimal.forEach(r => {
              if (r.phone) existingPhones.add(r.phone as string);
            });
          }
        } else {
          imported += data?.length ?? 0;
          toInsertFull.forEach(r => {
            if (r.phone_display) existingDisplays.add(r.phone_display as string);
          });
        }
      }

      // ── Insert into customer_profiles ────────────────────────────────────
      if (toInsertProfiles.length > 0) {
        // Try with extended fields first
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("customer_profiles")
          .insert(toInsertProfiles)
          .select("id");

        if (insertErr) {
          console.error("[import-clients] customer_profiles full insert error:", insertErr.message);
          // Fallback: only base schema columns
          const minimal = toInsertProfiles.map(p => ({
            business_id: p.business_id,
            phone: p.phone,
            name: p.name,
          }));
          const { data: minInserted, error: minErr } = await supabaseAdmin
            .from("customer_profiles")
            .insert(minimal)
            .select("id");
          if (minErr) {
            console.error("[import-clients] customer_profiles minimal insert error:", minErr.message);
          } else {
            profilesAdded += minInserted?.length ?? 0;
          }
        } else {
          profilesAdded += inserted?.length ?? 0;
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
      profilesAdded,
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
