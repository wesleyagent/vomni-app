/**
 * POST /api/admin/backfill-phone-fingerprints
 *
 * One-time backfill: reads every customer_profiles row that has
 * phone_encrypted but no phone_fingerprint, decrypts the phone in Node.js,
 * computes the SHA-256 fingerprint, and writes it back.
 *
 * Run once after deploying migration 029.
 * Safe to call multiple times — it only touches rows where
 * phone_fingerprint IS NULL AND phone_encrypted IS NOT NULL.
 *
 * Why this endpoint exists rather than a SQL migration:
 *   The fingerprint is SHA-256("${e164}:${businessId}") where e164 is the
 *   raw phone number. The phone is stored AES-256-GCM encrypted.
 *   pgcrypto only supports AES-CBC, so decryption + re-hashing is
 *   impossible in pure SQL.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin }             from "@/lib/supabase-admin";
import { decryptPhone, fingerprintPhone } from "@/lib/phone";
import { requireAdmin }              from "@/lib/require-admin";

const BATCH_SIZE = 200;

export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  let updated   = 0;
  let skipped   = 0;   // decryption failed (old/corrupted data)
  let processed = 0;

  // Page through rows that need backfill
  let from = 0;
  while (true) {
    const { data: rows, error } = await supabaseAdmin
      .from("customer_profiles")
      .select("id, business_id, phone_encrypted")
      .is("phone_fingerprint", null)
      .not("phone_encrypted", "is", null)
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      console.error("[backfill-fingerprints] query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rows || rows.length === 0) break;   // all done

    for (const row of rows) {
      processed++;
      try {
        const e164        = decryptPhone(row.phone_encrypted as string);
        const fingerprint = fingerprintPhone(e164, row.business_id as string);

        const { error: updateErr } = await supabaseAdmin
          .from("customer_profiles")
          .update({ phone_fingerprint: fingerprint })
          .eq("id", row.id);

        if (updateErr) {
          console.error(`[backfill-fingerprints] update error for ${row.id}:`, updateErr.message);
          skipped++;
        } else {
          updated++;
        }
      } catch {
        // Decryption failed — wrong key env or corrupted value; skip silently
        skipped++;
      }
    }

    if (rows.length < BATCH_SIZE) break;   // last partial page
    from += BATCH_SIZE;
  }

  console.log(`[backfill-fingerprints] processed=${processed} updated=${updated} skipped=${skipped}`);
  return NextResponse.json({ processed, updated, skipped });
}
