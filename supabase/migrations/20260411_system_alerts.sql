-- system_alerts: stores cron health checks and Sentry error events
-- Used by the Vomni admin panel alerts dashboard

create table if not exists system_alerts (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('cron', 'sentry')),
  name        text not null,            -- cron job name or Sentry error type
  status      text not null check (status in ('success', 'failure')),
  detail      text,                     -- result payload, error message, etc.
  duration_ms integer,                  -- cron only
  created_at  timestamptz not null default now()
);

-- Only keep 30 days of alerts to avoid table bloat
create index if not exists system_alerts_created_at_idx on system_alerts (created_at desc);

-- No RLS needed — admin-only access via service role key
