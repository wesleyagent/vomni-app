import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptPhone, fingerprintPhone } from "@/lib/phone";

/**
 * Upserts a single customer_profiles row based on a completed booking.
 * Fetches all completed bookings for the same customer+business to compute
 * accurate visit stats (total, first/last visit, avg cadence, next prediction).
 *
 * Designed to be called non-blocking (void) so it never delays the HTTP response.
 */
export async function upsertSingleCustomerProfile(bookingId: string): Promise<void> {
  try {
    // Fetch the trigger booking
    const { data: trigger, error: triggerErr } = await supabaseAdmin
      .from("bookings")
      .select("business_id, customer_phone, customer_phone_encrypted, customer_name, whatsapp_opt_in, appointment_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (triggerErr || !trigger?.customer_phone || !trigger?.business_id) {
      console.error("[customer-profile-sync] trigger booking missing phone/business:", triggerErr?.message);
      return;
    }

    const { business_id, customer_phone } = trigger;

    // Fetch all completed bookings for this customer+business (for accurate stats)
    const { data: allBookings, error: allErr } = await supabaseAdmin
      .from("bookings")
      .select("customer_name, customer_phone, customer_phone_encrypted, appointment_at, whatsapp_opt_in")
      .eq("business_id", business_id)
      .eq("customer_phone", customer_phone)
      .eq("status", "completed")
      .not("appointment_at", "is", null)
      .order("appointment_at", { ascending: true });

    if (allErr) {
      console.error("[customer-profile-sync] bookings query error:", allErr.message);
      return;
    }

    // If no completed bookings yet (e.g. booking was just created, not yet completed),
    // use the trigger booking itself as the single data point.
    const visits = allBookings && allBookings.length > 0
      ? allBookings
      : [{
          customer_name: trigger.customer_name,
          customer_phone: trigger.customer_phone,
          customer_phone_encrypted: trigger.customer_phone_encrypted,
          appointment_at: trigger.appointment_at,
          whatsapp_opt_in: trigger.whatsapp_opt_in,
        }];

    const totalVisits = visits.length;
    const sortedDates = visits
      .map(v => new Date(v.appointment_at as string).getTime())
      .sort((a, b) => a - b);

    const firstVisit = new Date(sortedDates[0]).toISOString();
    const lastVisit  = new Date(sortedDates[sortedDates.length - 1]).toISOString();

    // Average days between visits
    let avgDays: number | null = null;
    if (totalVisits >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      avgDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }

    // Predicted next visit
    let predictedNext: string | null = null;
    if (avgDays !== null && avgDays > 0) {
      predictedNext = new Date(sortedDates[sortedDates.length - 1] + avgDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const mostRecent = visits[visits.length - 1];
    const name = (mostRecent.customer_name as string) ?? null;
    const waOptIn = (mostRecent.whatsapp_opt_in as boolean) !== false;
    const phoneEncrypted =
      (visits.map(v => (v as typeof v & { customer_phone_encrypted?: string }).customer_phone_encrypted).filter(Boolean).pop()) ?? null;

    let phoneFingerprint: string | null = null;
    if (phoneEncrypted) {
      try {
        const e164 = decryptPhone(phoneEncrypted);
        phoneFingerprint = fingerprintPhone(e164, business_id);
      } catch {
        // Decryption failed — leave fingerprint null
      }
    }

    const { error: upsertErr } = await supabaseAdmin
      .from("customer_profiles")
      .upsert(
        {
          business_id,
          phone: customer_phone,
          phone_encrypted: phoneEncrypted,
          phone_fingerprint: phoneFingerprint,
          name,
          whatsapp_opt_in: waOptIn,
          total_visits: totalVisits,
          first_visit_at: firstVisit,
          last_visit_at: lastVisit,
          avg_days_between_visits: avgDays,
          predicted_next_visit_at: predictedNext,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "business_id,phone" }
      );

    if (upsertErr) {
      console.error("[customer-profile-sync] upsert error:", upsertErr.message);
    }
  } catch (e) {
    console.error("[customer-profile-sync] unexpected error:", e);
  }
}
