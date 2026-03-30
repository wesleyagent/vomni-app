-- 007: Add google_calendar_email and notification_email to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS google_calendar_email text,
  ADD COLUMN IF NOT EXISTS notification_email     text;

-- Copy owner_email into notification_email as the default notification target
UPDATE businesses
SET notification_email = owner_email
WHERE notification_email IS NULL AND owner_email IS NOT NULL;
