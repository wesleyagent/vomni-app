-- Rate limits table for distributed, global rate limiting across all serverless instances.
-- Replaces the per-process in-memory store that resets on every cold start / new instance.
--
-- Design: fixed-window counter keyed by (key).
-- The `check_rate_limit` RPC atomically increments the counter within the current window
-- and returns whether the request should be allowed.

create table if not exists rate_limits (
  key         text        primary key,
  count       integer     not null default 1,
  expires_at  timestamptz not null
);

-- Clean up expired rows automatically (Postgres cron extension not required;
-- rows are lazily overwritten on next hit, but this index keeps queries fast).
create index if not exists rate_limits_expires_at_idx on rate_limits (expires_at);

-- ── Atomic check-and-increment RPC ─────────────────────────────────────────
-- Returns TRUE  → request is allowed (count was under limit, now incremented)
-- Returns FALSE → request is denied  (count was at or above limit)
--
-- Uses FOR UPDATE to prevent race conditions between concurrent requests
-- hitting the same key at the same time (e.g. double-submit on slow network).

create or replace function check_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count      integer;
  v_expires_at timestamptz;
begin
  -- Lock the row for this key (if it exists)
  select count, expires_at
    into v_count, v_expires_at
    from rate_limits
   where key = p_key
     for update;

  if not found or now() > v_expires_at then
    -- No existing row or window expired — start a new window at 1
    insert into rate_limits (key, count, expires_at)
    values (p_key, 1, now() + (p_window_seconds || ' seconds')::interval)
    on conflict (key) do update
       set count      = 1,
           expires_at = now() + (p_window_seconds || ' seconds')::interval;
    return true;
  end if;

  if v_count >= p_limit then
    -- Already at the limit — deny without incrementing
    return false;
  end if;

  -- Under the limit — increment and allow
  update rate_limits
     set count = count + 1
   where key = p_key;

  return true;
end;
$$;

-- Grant execute to the service_role used by supabaseAdmin
grant execute on function check_rate_limit(text, integer, integer) to service_role;
