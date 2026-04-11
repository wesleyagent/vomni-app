import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptPhone, fingerprintPhone } from "@/lib/phone";
import { withCronMonitoring } from "@/lib/telegram";

// GET /api/cron/sync-customer-profiles
// Runs daily at 1am. Rebuilds customer_profiles from completed bookings.
async function handler(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all businesses that have at least 1 completed booking
  const { data: bizIds, error: bizErr } = await supabaseAdmin
    .from("bookings")
    .select("business_id")
    .eq("status", "completed")
    .not("customer_phone", "is", null);

  if (bizErr || !bizIds) {
    console.error("[cron/sync-customer-profiles] query error:", bizErr?.message);
    return NextResponse.json({ error: bizErr?.message }, { status: 500 });
  }

  const uniqueBizIds = [...new Set(bizIds.map(b => b.business_id))];
  let totalUpserted = 0;

  for (const businessId of uniqueBizIds) {
    // Get all completed bookings for this business
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("customer_name, customer_phone, customer_phone_encrypted, appointment_at, service_price, whatsapp_opt_in")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .not("customer_phone", "is", null)
      .order("appointment_at", { ascending: true });

    if (!bookings || bookings.length === 0) continue;

    // Group by customer_phone
    const phoneMap = new Map<string, typeof bookings>();
    for (const b of bookings) {
      const phone = b.customer_phone as string;
      if (!phoneMap.has(phone)) phoneMap.set(phone, []);
      phoneMap.get(phone)!.push(b);
    }

    const upsertRows: {
      business_id: string;
      phone: string;
      phone_encrypted: string | null;
      phone_fingerprint: string | null;
      name: string | null;
      whatsapp_opt_in: boolean;
      total_visits: number;
      first_visit_at: string;
      last_visit_at: string;
      avg_days_between_visits: number | null;
      predicted_next_visit_at: string | null;
      updated_at: string;
    }[] = [];

    for (const [phone, visits] of phoneMap.entries()) {
      const totalVisits = visits.length;
      const sortedDates = visits
        .map(v => new Date(v.appointment_at as string).getTime())
        .sort((a, b) => a - b);

      const firstVisit = new Date(sortedDates[0]).toISOString();
      const lastVisit = new Date(sortedDates[sortedDates.length - 1]).toISOString();

      // Compute average days between visits
      let avgDays: number | null = null;
      if (totalVisits >= 2) {
        const gaps: number[] = [];
        for (let i = 1; i < sortedDates.length; i++) {
          const diffMs = sortedDates[i] - sortedDates[i - 1];
          gaps.push(diffMs / (1000 * 60 * 60 * 24));
        }
        avgDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      }

      // Predicted next visit
      let predictedNext: string | null = null;
      if (avgDays !== null && avgDays > 0) {
        const lastDate = sortedDates[sortedDates.length - 1];
        predictedNext = new Date(lastDate + avgDays * 24 * 60 * 60 * 1000).toISOString();
      }

      // Most recent customer name and whatsapp_opt_in
      const mostRecent = visits[visits.length - 1];
      const name = (mostRecent.customer_name as string) ?? null;
      const waOptIn = (mostRecent.whatsapp_opt_in as boolean) !== false;
      // Carry encrypted phone from most recent booking that has it
      const phoneEncrypted = (visits.map(v => (v as typeof v & { customer_phone_encrypted?: string }).customer_phone_encrypted).filter(Boolean).pop()) ?? null;

      // Derive fingerprint from the encrypted phone — requires decryption in Node.js
      // (SHA-256 of "${e164}:${businessId}" — cannot be computed in SQL)
      let phoneFingerprint: string | null = null;
      if (phoneEncrypted) {
        try {
          const e164 = decryptPhone(phoneEncrypted);
          phoneFingerprint = fingerprintPhone(e164, businessId);
        } catch {
          // Decryption failed (wrong key, corrupted data) — leave fingerprint null
        }
      }

      upsertRows.push({
        business_id: businessId,
        phone,
        phone_encrypted: phoneEncrypted ?? null,
        phone_fingerprint: phoneFingerprint,
        name,
        whatsapp_opt_in: waOptIn,
        total_visits: totalVisits,
        first_visit_at: firstVisit,
        last_visit_at: lastVisit,
        avg_days_between_visits: avgDays,
        predicted_next_visit_at: predictedNext,
        updated_at: new Date().toISOString(),
      });
    }

    // Batch upsert (100 at a time)
    const BATCH = 100;
    for (let i = 0; i < upsertRows.length; i += BATCH) {
      const batch = upsertRows.slice(i, i + BATCH);
      const { error: upsertErr } = await supabaseAdmin
        .from("customer_profiles")
        .upsert(batch, { onConflict: "business_id,phone" });

      if (upsertErr) {
        console.error("[cron/sync-customer-profiles] upsert error:", upsertErr.message);
      } else {
        totalUpserted += batch.length;
      }
    }
  }

  console.log(`[cron/sync-customer-profiles] synced ${totalUpserted} profiles across ${uniqueBizIds.length} businesses`);
  return NextResponse.json({ synced: totalUpserted, businesses: uniqueBizIds.length });
}

export const GET = withCronMonitoring("sync-customer-profiles", handler);
