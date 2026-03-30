-- Add Google Calendar fields to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS google_event_id text;

-- Add Google Calendar source marker to blocked_times
ALTER TABLE blocked_times
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add webhook fields to calendar_connections
ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS webhook_channel_id text,
  ADD COLUMN IF NOT EXISTS webhook_resource_id text,
  ADD COLUMN IF NOT EXISTS webhook_expires_at timestamptz;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_connections TO anon, authenticated;
