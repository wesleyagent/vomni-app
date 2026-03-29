-- ============================================================
-- VOMNI DATABASE MIGRATION — Native Rating Flow
-- Run this entire script in the Supabase dashboard:
--   https://supabase.com/dashboard/project/obyewocpvopatuagqfkx/sql/new
-- ============================================================

-- ── STEP 2: Remove Typeform / credit-based columns ──────────────
ALTER TABLE businesses DROP COLUMN IF EXISTS typeform_id;
ALTER TABLE businesses DROP COLUMN IF EXISTS typeform_link;
ALTER TABLE businesses DROP COLUMN IF EXISTS forwarding_email;
ALTER TABLE businesses DROP COLUMN IF EXISTS sms_limit;
ALTER TABLE businesses DROP COLUMN IF EXISTS sms_sent_this_month;
ALTER TABLE businesses DROP COLUMN IF EXISTS sms_limit_reset_at;

ALTER TABLE bookings DROP COLUMN IF EXISTS typeform_link;
ALTER TABLE bookings DROP COLUMN IF EXISTS typeform_response_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS typeform_id;

-- ── STEP 3: businesses — add missing columns ─────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_google_redirects integer DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_redirect_cap integer DEFAULT 5;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS account_age_weeks integer DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_redirect_reset_at timestamp with time zone DEFAULT now();

-- ── STEP 4: bookings — add rating flow tracking columns ─────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating_submitted_at timestamp with time zone;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS redirected_at timestamp with time zone;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pii_cleaned boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pii_cleaned_at timestamp with time zone;

-- ── STEP 5: feedback — add new source and tracking columns ───────
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source text DEFAULT 'vomni_native';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS urgency text;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS additional_notes text;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- ── STEP 6: leads — add ICP and channel fields ───────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tier integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_channel text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_website boolean;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_online_booking boolean;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_system text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_score integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_notes text;

-- ── STEP 7: create missing tables ───────────────────────────────
CREATE TABLE IF NOT EXISTS customer_fingerprints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  last_sms_sent_at timestamp with time zone DEFAULT now(),
  sms_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(business_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS outreach_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES leads(id),
  channel text NOT NULL,
  activity_type text NOT NULL,
  subject_line text,
  message_variant text,
  sent_at timestamp with time zone DEFAULT now(),
  replied_at timestamp with time zone,
  reply_text text,
  outcome text
);

CREATE TABLE IF NOT EXISTS growth_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_starting date NOT NULL,
  leads_found integer DEFAULT 0,
  outreach_sent integer DEFAULT 0,
  replies_received integer DEFAULT 0,
  demos_booked integer DEFAULT 0,
  customers_won integer DEFAULT 0,
  mrr_start numeric DEFAULT 0,
  mrr_end numeric DEFAULT 0,
  top_performing_channel text,
  top_performing_city text,
  top_performing_business_type text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleanup_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamp with time zone DEFAULT now(),
  booking_id uuid,
  action text,
  business_id uuid
);

-- ── Verify final schema ──────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
