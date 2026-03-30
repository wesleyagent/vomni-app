-- Fix blocked_times schema to match new UI expectations
ALTER TABLE blocked_times
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS day_of_week integer,  -- 0=all, 1=Mon... for recurring
  ADD COLUMN IF NOT EXISTS date date;  -- for one-off blocks

-- Add color column to services (was accidentally added to staff only)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS color text;

-- Add notification_email to businesses if not exists
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS notification_email text;

-- Grant permissions to anon role on new booking tables (so dashboard writes work)
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_services TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_hours TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON blocked_times TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_audit_log TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_waitlist TO anon, authenticated;
