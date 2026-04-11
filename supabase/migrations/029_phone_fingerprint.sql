-- Migration 029: Add phone_fingerprint to customer_profiles
-- Run in Supabase SQL Editor after 028_system_alerts_warning.sql
--
-- phone_fingerprint = SHA-256 hex of "${e164}:${business_id}"
-- It is computed in Node.js (lib/phone.ts fingerprintPhone) because the phone
-- is stored AES-256-GCM encrypted — pgcrypto only supports AES-CBC so
-- decryption + re-hashing cannot be done in SQL.
--
-- Population sources:
--   1. sync-customer-profiles cron  (daily, forward-fill for all new bookings)
--   2. POST /api/admin/backfill-phone-fingerprints  (one-time run for existing rows)

-- ─── Column ─────────────────────────────────────────────────────────────────

ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS phone_fingerprint text;

-- ─── Index ───────────────────────────────────────────────────────────────────
-- Partial index skips the many NULL rows and keeps it compact.
-- Used by canSendReviewRequest in lib/review-rules.ts for opted_out /
-- already_reviewed / requested_too_recently lookups.

CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone_fingerprint
  ON customer_profiles (business_id, phone_fingerprint)
  WHERE phone_fingerprint IS NOT NULL;

-- ─── Notes ───────────────────────────────────────────────────────────────────
-- • Existing rows will have phone_fingerprint = NULL until the backfill
--   endpoint is called or the sync cron next runs.
-- • canSendReviewRequest gracefully handles NULL (profile not found →
--   skips opted_out/already_reviewed checks but still runs Rules 2-4).
-- • After backfill, the full eligibility chain is enforced for all customers.
