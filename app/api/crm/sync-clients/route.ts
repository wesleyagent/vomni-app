/**
 * POST /api/crm/sync-clients
 * Reads all imported clients from the `clients` table and inserts them into
 * `customer_profiles` so the CRM tab shows them immediately.
 *
 * Handles two cases:
 *  - migration 019 applied: reads phone_encrypted, decrypts it
 *  - migration 019 NOT applied: reads phone (plaintext) directly
 *
 * Safe to call multiple times — pre-checks existing profiles to avoid duplicates.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";
import { decryptPhone, maskPhone } from "@/lib/phone";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let businessId: string;
  try {
    const body = await req.json();
    businessId = body.business_id;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, businessId, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  // 1. Fetch all clients — both phone_encrypted (migration 019+) and phone (plaintext fallback)
  const { data: clients, error: clientsErr } = await supabaseAdmin
    .from("clients")
    .select("id, name, phone, phone_encrypted, phone_display, created_at")
    .eq("business_id", businessId);

  if (clientsErr) {
    console.error("[sync-clients] clients query error:", clientsErr.message);
    return NextResponse.json({ error: "Failed to fetch clients", detail: clientsErr.message }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ synced: 0, message: "No clients found" });
  }

  // 2. Fetch phones already in customer_profiles
  const { data: existingProfiles } = await supabaseAdmin
    .from("customer_profiles")
    .select("phone")
    .eq("business_id", businessId)
    .not("phone", "is", null);

  const existingPhones = new Set(
    (existingProfiles ?? []).map((r: { phone: string }) => r.phone).filter(Boolean)
  );

  // 3. Resolve plaintext phone for each client
  const toInsert: Array<{ business_id: string; phone: string; name: string | null; phone_display: string }> = [];
  let decryptErrors = 0;
  let skipped = 0;

  for (const client of clients) {
    let phone: string | null = null;

    if (client.phone_encrypted) {
      // Migration 019 path — decrypt
      try {
        phone = decryptPhone(client.phone_encrypted);
      } catch {
        decryptErrors++;
        continue;
      }
    } else if (client.phone) {
      // Pre-migration 019 path — already plaintext
      phone = client.phone;
    } else {
      // No phone data at all — skip
      skipped++;
      continue;
    }

    if (existingPhones.has(phone)) {
      skipped++;
      continue;
    }

    const display = client.phone_display ?? maskPhone(phone);

    toInsert.push({
      business_id: businessId,
      phone,
      name: client.name ?? null,
      phone_display: display,
    });

    existingPhones.add(phone);
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      synced: 0,
      skipped,
      decryptErrors,
      message: "All clients are already in the CRM",
    });
  }

  // 4. Try full insert (with source column from migration 019)
  const fullRows = toInsert.map(r => ({ ...r, source: "import" }));

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("customer_profiles")
    .insert(fullRows)
    .select("id");

  if (insertErr) {
    console.error("[sync-clients] full insert error:", insertErr.message);

    // Fallback: base schema only (business_id, phone, name)
    const minRows = toInsert.map(r => ({
      business_id: r.business_id,
      phone: r.phone,
      name: r.name,
    }));
    const { data: minInserted, error: minErr } = await supabaseAdmin
      .from("customer_profiles")
      .insert(minRows)
      .select("id");

    if (minErr) {
      console.error("[sync-clients] minimal insert error:", minErr.message);
      return NextResponse.json({
        error: "Insert failed",
        detail: minErr.message,
        skipped,
        decryptErrors,
      }, { status: 500 });
    }

    return NextResponse.json({
      synced: minInserted?.length ?? 0,
      skipped,
      decryptErrors,
      fallback: true,
    });
  }

  return NextResponse.json({ synced: inserted?.length ?? 0, skipped, decryptErrors });
}
