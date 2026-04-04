-- Migration 022: Add marketing_consent and opted_out_type for GDPR/consent compliance

-- Add marketing_consent to bookings (records what the customer chose at booking time)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;

-- Add marketing_consent to customer_profiles (aggregate: true if customer ever consented)
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;

-- Add opted_out_type to distinguish between full opt-out (STOP) and marketing-only opt-out
-- 'all'       = customer sent STOP; all messages blocked
-- 'marketing' = customer opted out of marketing only; transactional messages still allowed
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS opted_out_type TEXT
  CHECK (opted_out_type IN ('all', 'marketing'));
