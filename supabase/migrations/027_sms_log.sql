-- Migration 027: SMS log table for per-business usage tracking

create table if not exists sms_log (
  id           uuid      primary key default gen_random_uuid(),
  business_id  uuid      references businesses(id) on delete cascade,
  booking_id   uuid      references bookings(id)   on delete set null,
  message_sid  text,
  message_type text      default 'sms',  -- confirmation | cancellation | reminder | nudge | waitlist_notify | no_show | sms
  status       text      default 'sent', -- sent | failed
  error_message text,
  sent_at      timestamptz default now()
);

create index if not exists idx_sms_log_business on sms_log(business_id);
create index if not exists idx_sms_log_sent_at  on sms_log(sent_at);

-- Row-level security: only service-role key may insert/read (admin panel uses service role)
alter table sms_log enable row level security;

create policy "service role only" on sms_log
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
