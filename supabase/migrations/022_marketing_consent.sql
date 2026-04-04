-- Migration 022: Add marketing_consent, consent_source, and opted_out_type
--
-- IMPORTANT — if running manually after the column already exists with DEFAULT false:
--
--   1. Run the ALTER statements below (IF NOT EXISTS makes them safe to re-run)
--   2. Then fix the default:
--        ALTER TABLE customer_profiles ALTER COLUMN marketing_consent SET DEFAULT true;
--        ALTER TABLE bookings          ALTER COLUMN marketing_consent SET DEFAULT true;
--   3. Then backfill imported clients only (DO NOT use a broad WHERE marketing_consent = false
--      as that would overwrite real opt-outs from people who texted STOP):
--        UPDATE customer_profiles
--        SET marketing_consent = true, consent_source = 'imported_assumed'
--        WHERE source = 'import' AND opted_out = false AND consent_source IS NULL;

-- ── bookings ─────────────────────────────────────────────────────────────────
-- Records what the customer chose at booking time (checkbox on booking form).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT true;

-- ── customer_profiles ────────────────────────────────────────────────────────
-- Aggregate consent flag — true if customer is reachable for marketing.
-- Defaults true: customers are opted in; they text STOP to opt out.
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT true;

-- Audit trail: records HOW consent was established.
-- Values: 'booking_form' | 'imported_assumed' | 'explicit' | null (unknown/legacy)
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS consent_source VARCHAR(50);

-- Opt-out type to distinguish full STOP from marketing-only opt-out.
-- 'all'       = customer sent STOP; all messages blocked
-- 'marketing' = customer opted out of marketing only; transactional still allowed
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS opted_out_type TEXT
  CHECK (opted_out_type IN ('all', 'marketing'));
