-- Migration 028: extend system_alerts to support 'warning' type
-- Warnings are app-level events (e.g. locale fallback, missing config)
-- that are not cron failures or Sentry errors but still need visibility.

-- Drop the old type check and replace with an expanded one
ALTER TABLE system_alerts
  DROP CONSTRAINT IF EXISTS system_alerts_type_check;

ALTER TABLE system_alerts
  ADD CONSTRAINT system_alerts_type_check
  CHECK (type IN ('cron', 'sentry', 'warning'));

-- Optional path context (request path that triggered the warning)
ALTER TABLE system_alerts
  ADD COLUMN IF NOT EXISTS path text;
