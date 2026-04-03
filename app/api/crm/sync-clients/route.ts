/**
 * POST /api/crm/sync-clients
 * Reads all imported clients from the `clients` table (which stores phone_encrypted),
 * decrypts their phones, and inserts them into `customer_profiles` so the CRM tab
 * shows them immediately.
 *
 * This is safe to call multiple times — it pre-checks which phones are already
 * in customer_profiles and only inserts new ones.
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

  // 1. Fetch all imported clients with encrypted phones
  const { data: clients, error: clientsErr } = await supabaseAdmin
    .from("clients")
    .select("id, name, phone_encrypted, phone_display, source, import_platform, created_at")
    .eq("business_id", businessId)
    .not("phone_encrypted", "is", null);

  if (clientsErr) {
    console.error("[sync-clients] clients query error:", clientsErr.message);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ synced: 0, message: "No imported clients found" });
  }

  // 2. Fetch phones already in customer_profiles so we don't duplicate
  const { data: existingProfiles } = await supabaseAdmin
    .from("customer_profiles")
    .select("phone")
    .eq("business_id", businessId)
    .not("phone", "is", null);

  const existingPhones = new Set(
    (existingProfiles ?? []).map((r: { phone: string }) => r.phone).filter(Boolean)
  );

  // 3. Decrypt phones and build rows to insert
  const toInsert: Array<{ business_id: string; phone: string; name: string | null; phone_display: string }> = [];
  let decryptErrors = 0;

  for (const client of clients) {
    if (!client.phone_encrypted) continue;

    let phone: string;
    try {
      phone = decryptPhone(client.phone_encrypted);
    } catch {
      decryptErrors++;
      continue;
    }

    if (existingPhones.has(phone)) continue; // already in customer_profiles

    const display = client.phone_display ?? maskPhone(phone);

    toInsert.push({
      business_id: businessId,
      phone,
      name: client.name ?? null,
      phone_display: display,
    });

    existingPhones.add(phone); // prevent duplicates within this batch
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      synced: 0,
      message: "All clients are already in the CRM",
      decryptErrors,
    });
  }

  // 4. Try inserting with extended fields (migration 019 columns)
  const fullRows = toInsert.map(r => ({
    ...r,
    source: "import",
  }));

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("customer_profiles")
    .insert(fullRows)
    .select("id");

  if (insertErr) {
    console.error("[sync-clients] full insert error:", insertErr.message);

    // Fallback: insert with only base schema columns (business_id, phone, name)
    const { data: minInserted, error: minErr } = await supabaseAdmin
      .from("customer_profiles")
      .insert(toInsert.map(r => ({ business_id: r.business_id, phone: r.phone, name: r.name })))
      .select("id");

    if (minErr) {
      console.error("[sync-clients] minimal insert error:", minErr.message);
      return NextResponse.json({
        error: "Insert failed",
        detail: minErr.message,
        decryptErrors,
      }, { status: 500 });
    }

    return NextResponse.json({ synced: minInserted?.length ?? 0, decryptErrors, fallback: true });
  }

  return NextResponse.json({ synced: inserted?.length ?? 0, decryptErrors });
}
