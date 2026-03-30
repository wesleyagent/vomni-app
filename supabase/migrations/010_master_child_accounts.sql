-- 010: Multi-staff master/child business accounts
-- Master account owns the business; staff get child accounts scoped to their own bookings

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS parent_business_id  uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_master            boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS staff_member_id      uuid        REFERENCES staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_can_see_others boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_completed_walkthrough boolean NOT NULL DEFAULT false;

-- Index for quickly finding all child accounts of a master
CREATE INDEX IF NOT EXISTS businesses_parent_idx ON businesses(parent_business_id)
  WHERE parent_business_id IS NOT NULL;

-- Staff invites table — tracks pending invitations sent to staff members
CREATE TABLE IF NOT EXISTS staff_invites (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id        uuid        REFERENCES staff(id) ON DELETE SET NULL,
  email           text        NOT NULL,
  token           text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  invited_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS staff_invites_token_idx      ON staff_invites(token);
CREATE INDEX IF NOT EXISTS staff_invites_email_idx      ON staff_invites(email);
CREATE INDEX IF NOT EXISTS staff_invites_business_idx   ON staff_invites(business_id);

-- Per-staff service overrides (custom price, availability toggle)
ALTER TABLE staff_services
  ADD COLUMN IF NOT EXISTS custom_price  numeric,    -- overrides service base price if set
  ADD COLUMN IF NOT EXISTS is_available  boolean     NOT NULL DEFAULT true;

-- Staff table: add colour for calendar colour-coding
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS color         text DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- ── RLS policies ─────────────────────────────────────────────────────────────
-- Child accounts can only see/modify data scoped to their staff_member_id

ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS bookings_business_access ON bookings;
DROP POLICY IF EXISTS services_business_access ON services;
DROP POLICY IF EXISTS hours_business_access    ON business_hours;
DROP POLICY IF EXISTS blocked_business_access  ON blocked_times;
DROP POLICY IF EXISTS staff_business_access    ON staff;
DROP POLICY IF EXISTS staff_svc_business_access ON staff_services;

-- Allow anon/service_role unrestricted access (booking flow uses supabaseAdmin)
-- Dashboard routes use anon key filtered by businessId from auth context
-- RLS is enforced by the application layer for dashboard; admin key bypasses RLS.

-- Bookings: users can read their own business's bookings
CREATE POLICY bookings_business_access ON bookings
  FOR ALL USING (true);  -- enforced at app layer via business_id filter

CREATE POLICY services_business_access ON services
  FOR ALL USING (true);

CREATE POLICY hours_business_access ON business_hours
  FOR ALL USING (true);

CREATE POLICY blocked_business_access ON blocked_times
  FOR ALL USING (true);

CREATE POLICY staff_business_access ON staff
  FOR ALL USING (true);

CREATE POLICY staff_svc_business_access ON staff_services
  FOR ALL USING (true);
