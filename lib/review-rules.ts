/**
 * Review request eligibility rules.
 * Checked in order — first match returns immediately.
 * Never throws — always returns an eligibility result.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

export type ReviewIneligibilityReason =
  | "opted_out"            // customer opted out — never message
  | "already_reviewed"     // customer left a review before — never ask again
  | "requested_too_recently" // review request sent within last 90 days
  | "window_expired";      // more than 24h since appointment completed

export interface ReviewEligibility {
  eligible: boolean;
  reason?: ReviewIneligibilityReason;
}

const REVIEW_WINDOW_MS  = 24 * 60 * 60 * 1000;       // 24 hours
const REVIEW_COOLOFF_MS = 90 * 24 * 60 * 60 * 1000;  // 90 days

/**
 * Check whether a review request can be sent for a given booking.
 *
 * Rules (checked in order):
 * 1. opted_out — customer opted out of all messages
 * 2. already_reviewed — customer has previously left a review
 * 3. requested_too_recently — a review request was sent within the last 90 days
 * 4. window_expired — appointment completed more than 24h ago
 */
export async function canSendReviewRequest(
  bookingId: string,
  businessId: string,
  customerPhoneFingerprint: string
): Promise<ReviewEligibility> {
  try {
    // ── Rule 1: opted_out ────────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from("customer_profiles")
      .select("opted_out, has_left_review, last_review_request_at")
      .eq("business_id", businessId)
      .eq("phone_fingerprint", customerPhoneFingerprint)
      .maybeSingle();

    // Fallback: try to find profile by business_id only if fingerprint not available
    // (profile may not exist for old bookings)
    if (profile?.opted_out === true) {
      return { eligible: false, reason: "opted_out" };
    }

    // ── Rule 2: already_reviewed ─────────────────────────────────────────────
    if (profile?.has_left_review === true) {
      return { eligible: false, reason: "already_reviewed" };
    }

    // Also check feedback table directly for belt-and-suspenders
    const { count: feedbackCount } = await supabaseAdmin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("booking_id", bookingId)
      .not("rating", "is", null);

    if ((feedbackCount ?? 0) > 0) {
      return { eligible: false, reason: "already_reviewed" };
    }

    // ── Rule 3: requested_too_recently ───────────────────────────────────────
    if (profile?.last_review_request_at) {
      const lastRequest = new Date(profile.last_review_request_at).getTime();
      if (Date.now() - lastRequest < REVIEW_COOLOFF_MS) {
        return { eligible: false, reason: "requested_too_recently" };
      }
    }

    // Also check whatsapp_log for any review request sent to this booking
    const cooloffDate = new Date(Date.now() - REVIEW_COOLOFF_MS).toISOString();
    const { count: logCount } = await supabaseAdmin
      .from("whatsapp_log")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("booking_id", bookingId)
      .eq("template_name", "review_request")
      .gte("sent_at", cooloffDate);

    if ((logCount ?? 0) > 0) {
      return { eligible: false, reason: "requested_too_recently" };
    }

    // ── Rule 4: window_expired ───────────────────────────────────────────────
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("appointment_at, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking || booking.status !== "completed") {
      return { eligible: false, reason: "window_expired" };
    }

    const apptTime = new Date(booking.appointment_at).getTime();
    if (Date.now() - apptTime > REVIEW_WINDOW_MS) {
      return { eligible: false, reason: "window_expired" };
    }

    // ── All rules passed ─────────────────────────────────────────────────────
    return { eligible: true };
  } catch (err) {
    // Never throw — log and return ineligible to be safe
    console.error("[review-rules] canSendReviewRequest error:", err instanceof Error ? err.message : String(err));
    return { eligible: false, reason: "window_expired" };
  }
}
