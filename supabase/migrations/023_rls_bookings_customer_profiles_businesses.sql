-- Migration 023: RLS policies for bookings, customer_profiles, businesses
--
-- Rules:
--   authenticated users: SELECT/INSERT/UPDATE/DELETE where owner_email = auth.jwt()->>'email'
--   anon key: SELECT only on businesses (public booking page); no access to bookings or customer_profiles
--
-- Service role key bypasses RLS entirely — all existing server-side code using
-- supabaseAdmin is unaffected.

-- ── Enable RLS ──────────────────────────────────────────────────────────────

ALTER TABLE bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses        ENABLE ROW LEVEL SECURITY;

-- ── bookings ────────────────────────────────────────────────────────────────
-- Authenticated users may fully manage their own bookings.
-- Ownership is resolved via the parent business: bookings.business_id → businesses.owner_email.

CREATE POLICY "bookings_select_owner"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "bookings_insert_owner"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "bookings_update_owner"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "bookings_delete_owner"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

-- ── customer_profiles ───────────────────────────────────────────────────────
-- Authenticated users may fully manage their own customer profiles.
-- Ownership resolved the same way: customer_profiles.business_id → businesses.owner_email.

CREATE POLICY "customer_profiles_select_owner"
  ON customer_profiles FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "customer_profiles_insert_owner"
  ON customer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "customer_profiles_update_owner"
  ON customer_profiles FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "customer_profiles_delete_owner"
  ON customer_profiles FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

-- ── businesses ──────────────────────────────────────────────────────────────
-- Authenticated users: full CRUD on their own row (owner_email matches JWT email).
-- Anon key: SELECT only — needed for the public booking page (/booking/[slug]).

CREATE POLICY "businesses_select_owner"
  ON businesses FOR SELECT
  TO authenticated
  USING (owner_email = auth.jwt()->>'email');

CREATE POLICY "businesses_insert_owner"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_email = auth.jwt()->>'email');

CREATE POLICY "businesses_update_owner"
  ON businesses FOR UPDATE
  TO authenticated
  USING  (owner_email = auth.jwt()->>'email')
  WITH CHECK (owner_email = auth.jwt()->>'email');

CREATE POLICY "businesses_delete_owner"
  ON businesses FOR DELETE
  TO authenticated
  USING (owner_email = auth.jwt()->>'email');

-- Anon: read-only access so the public booking widget can fetch business details.
-- No access to bookings or customer_profiles for anon.
CREATE POLICY "businesses_select_anon"
  ON businesses FOR SELECT
  TO anon
  USING (true);
