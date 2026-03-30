-- 009: Multi-calendar connections
-- Supports Google, Outlook/Office365, Apple iCloud (CalDAV), and generic CalDAV

CREATE TABLE IF NOT EXISTS calendar_connections (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id       uuid        REFERENCES staff(id) ON DELETE CASCADE,  -- NULL = business-level
  provider       text        NOT NULL CHECK (provider IN ('google','outlook','apple','caldav')),
  token_encrypted text,      -- AES-256-GCM encrypted OAuth tokens (JSON)
  calendar_id    text,       -- calendar identifier (e.g. 'primary' for Google)
  email          text,       -- connected account email
  caldav_url     text,       -- for CalDAV / Apple iCloud
  caldav_username text,      -- CalDAV username
  is_active      boolean     NOT NULL DEFAULT true,
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cal_connections_business_idx ON calendar_connections(business_id);
CREATE INDEX IF NOT EXISTS cal_connections_staff_idx    ON calendar_connections(staff_id);
CREATE INDEX IF NOT EXISTS cal_connections_active_idx   ON calendar_connections(business_id, is_active);

DROP TRIGGER IF EXISTS cal_connections_updated_at ON calendar_connections;
CREATE TRIGGER cal_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add Microsoft OAuth columns for businesses that use Outlook
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS outlook_calendar_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS outlook_calendar_email     text;
