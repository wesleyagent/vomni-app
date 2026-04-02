-- ============================================================================
-- 016: Merge Booking System — Safe Idempotent Catch-Up Migration
-- Run after merging booking-platform → main
-- Safe to run multiple times (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- Never drops anything
-- ============================================================================

-- ── device_tokens ─────────────────────────────────────────────────────────────
-- Table was introduced in 015_device_tokens.sql; repeat here for safety
-- in case 015 was not yet applied on the target database.
CREATE TABLE IF NOT EXISTS device_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  platform    text        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (business_id, token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policy (idempotent: DROP IF EXISTS first)
DROP POLICY IF EXISTS "Business owner manages device tokens" ON device_tokens;
CREATE POLICY "Business owner manages device tokens"
  ON device_tokens
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

CREATE INDEX IF NOT EXISTS device_tokens_business_idx ON device_tokens(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON device_tokens TO authenticated, anon;

-- ── clients ───────────────────────────────────────────────────────────────────
-- Table was introduced in 014_migration_system.sql; repeat here for safety.
CREATE TABLE IF NOT EXISTS clients (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  email          text,
  phone          text,
  notes          text,
  source         text        DEFAULT 'manual',
  imported_at    timestamptz DEFAULT now(),
  last_visited_at timestamptz,
  total_visits   int         DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_business_id_idx ON clients(business_id);
CREATE INDEX IF NOT EXISTS clients_phone_idx        ON clients(phone);
CREATE UNIQUE INDEX IF NOT EXISTS clients_business_phone_unique
  ON clients(business_id, phone) WHERE phone IS NOT NULL;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_business_owner" ON clients;
CREATE POLICY "clients_business_owner" ON clients
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO authenticated, anon;

-- ── migration_imports ─────────────────────────────────────────────────────────
-- Table was introduced in 014_migration_system.sql; repeat here for safety.
CREATE TABLE IF NOT EXISTS migration_imports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  source_platform  text,
  file_name        text,
  total_rows       int         DEFAULT 0,
  imported_rows    int         DEFAULT 0,
  skipped_rows     int         DEFAULT 0,
  error_rows       int         DEFAULT 0,
  status           text        DEFAULT 'pending',
  created_at       timestamptz DEFAULT now(),
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS migration_imports_business_idx ON migration_imports(business_id);

ALTER TABLE migration_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "migration_imports_business_owner" ON migration_imports;
CREATE POLICY "migration_imports_business_owner" ON migration_imports
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON migration_imports TO authenticated, anon;

-- ── businesses: any missing columns from booking-platform ────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_slug                   text UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_enabled                boolean     DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_buffer_minutes         integer     DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_advance_days           integer     DEFAULT 30;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_cancellation_hours     integer     DEFAULT 24;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_confirmation_message   text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_confirmation_message_he text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_currency               text        DEFAULT 'ILS';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_timezone               text        DEFAULT 'Asia/Jerusalem';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS require_phone                  boolean     DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS require_email                  boolean     DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS calendar_token                 text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_calendar_connected      boolean     DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_enabled               boolean     DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_maps_url                text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram_handle               text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS parent_business_id             uuid        REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_master                      boolean     NOT NULL DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS staff_member_id                uuid        REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS staff_can_see_others           boolean     NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS has_completed_walkthrough      boolean     NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address                        text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city                           text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postcode                       text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_color                  text        DEFAULT '#00C896';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bio                            text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS notification_email             text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS outlook_calendar_connected     boolean     DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS outlook_calendar_email         text;

-- ── bookings: any missing columns from booking-platform ──────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id                  uuid        REFERENCES staff(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id                uuid        REFERENCES services(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_name              text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_duration_minutes  integer;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_price             numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source            text        DEFAULT 'vomni';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status                    text        DEFAULT 'confirmed';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason       text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at              timestamp;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes                     text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_notes            text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent             boolean     DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at          timestamp;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_sent         boolean     DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_token        text UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring              boolean     DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_group_id        uuid;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_interval_weeks  integer;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id           text;

-- ── blocked_times: any missing columns ───────────────────────────────────────
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS label        text;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS start_time   time;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS end_time     time;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS day_of_week  integer;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS date         date;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS google_event_id text;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS source       text DEFAULT 'manual';

-- ── staff: any missing columns ────────────────────────────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS color        text DEFAULT '#3B82F6';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- ── services: any missing columns ─────────────────────────────────────────────
ALTER TABLE services ADD COLUMN IF NOT EXISTS color text;

-- ── staff_services: any missing columns ───────────────────────────────────────
ALTER TABLE staff_services ADD COLUMN IF NOT EXISTS custom_price numeric;
ALTER TABLE staff_services ADD COLUMN IF NOT EXISTS is_available  boolean NOT NULL DEFAULT true;

-- ── calendar_connections: any missing columns ─────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_connections (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id            uuid        REFERENCES staff(id) ON DELETE CASCADE,
  provider            text        NOT NULL CHECK (provider IN ('google','outlook','apple','caldav')),
  token_encrypted     text,
  calendar_id         text,
  email               text,
  caldav_url          text,
  caldav_username     text,
  is_active           boolean     NOT NULL DEFAULT true,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS webhook_channel_id   text;
ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS webhook_resource_id  text;
ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS webhook_expires_at   timestamptz;

CREATE INDEX IF NOT EXISTS cal_connections_business_idx ON calendar_connections(business_id);
CREATE INDEX IF NOT EXISTS cal_connections_staff_idx    ON calendar_connections(staff_id);
CREATE INDEX IF NOT EXISTS cal_connections_active_idx   ON calendar_connections(business_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_connections TO anon, authenticated;

-- ── Ensure update_updated_at_column() function exists ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on calendar_connections
DROP TRIGGER IF EXISTS cal_connections_updated_at ON calendar_connections;
CREATE TRIGGER cal_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Indexes (idempotent) ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_services_business        ON services(business_id)           WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_business           ON staff(business_id)               WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date      ON bookings(staff_id, appointment_at) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_bookings_business_date   ON bookings(business_id, appointment_at);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON bookings(cancellation_token) WHERE cancellation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder        ON bookings(appointment_at, reminder_sent) WHERE status = 'confirmed' AND reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_businesses_slug          ON businesses(booking_slug)         WHERE booking_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_hours_biz       ON business_hours(business_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_hours_staff        ON staff_hours(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_blocked_times_range      ON blocked_times(staff_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_recurring       ON bookings(recurring_group_id)     WHERE recurring_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS businesses_parent_idx        ON businesses(parent_business_id)   WHERE parent_business_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique  ON bookings(business_id, appointment_at, staff_id) WHERE status = 'confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_no_staff_unique ON bookings(business_id, appointment_at) WHERE staff_id IS NULL AND status = 'confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS businesses_booking_slug_unique ON businesses(booking_slug) WHERE booking_slug IS NOT NULL;

-- ── Permissions catch-up ──────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON services          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff             TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_services    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_hours    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON blocked_times     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_audit_log TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_waitlist  TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_log         TO anon, authenticated;
