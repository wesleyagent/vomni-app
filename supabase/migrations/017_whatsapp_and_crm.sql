-- Migration 017: WhatsApp, CRM customer profiles, and CRM nudges
-- Run against Supabase SQL Editor in order

-- ═══════════════════════════════════════════════════════════════════
-- Migration 1 — WhatsApp opt-in on bookings
-- ═══════════════════════════════════════════════════════════════════

alter table bookings
  add column if not exists whatsapp_opt_in boolean default true,
  add column if not exists whatsapp_status text default 'pending';
  -- values: pending | sent | failed | opted_out

-- ═══════════════════════════════════════════════════════════════════
-- Migration 2 — WhatsApp message log
-- ═══════════════════════════════════════════════════════════════════

create table if not exists whatsapp_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  customer_phone text not null,
  template_name text not null,
  message_sid text,
  status text default 'sent', -- sent | failed | delivered | read
  error_message text,
  sent_at timestamptz default now()
);

create index if not exists idx_whatsapp_log_business on whatsapp_log(business_id);
create index if not exists idx_whatsapp_log_booking on whatsapp_log(booking_id);

-- ═══════════════════════════════════════════════════════════════════
-- Migration 3 — Customer profiles (CRM)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists customer_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  phone text not null,
  name text,
  whatsapp_opt_in boolean default true,
  total_visits int default 0,
  first_visit_at timestamptz,
  last_visit_at timestamptz,
  avg_days_between_visits int,
  predicted_next_visit_at timestamptz,
  nudge_sent_at timestamptz,
  nudge_count int default 0,
  is_lapsed boolean generated always as
    (last_visit_at < now() - interval '42 days') stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(business_id, phone)
);

create index if not exists idx_customer_profiles_business on customer_profiles(business_id);
create index if not exists idx_customer_profiles_lapsed on customer_profiles(is_lapsed);
create index if not exists idx_customer_profiles_predicted on customer_profiles(predicted_next_visit_at);

-- ═══════════════════════════════════════════════════════════════════
-- Migration 4 — CRM nudge log
-- ═══════════════════════════════════════════════════════════════════

create table if not exists crm_nudges (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  customer_phone text not null,
  nudge_type text not null check (nudge_type in ('pattern', 'lapsed')),
  sent_at timestamptz default now(),
  message_sid text,
  converted boolean default false,
  converted_booking_id uuid references bookings(id),
  weeks_since_last_visit int
);

create index if not exists idx_crm_nudges_business_phone on crm_nudges(business_id, customer_phone);

-- ═══════════════════════════════════════════════════════════════════
-- Migration 5 — RLS policies for new tables
-- ═══════════════════════════════════════════════════════════════════

alter table customer_profiles enable row level security;
create policy "Business owner access" on customer_profiles
  using (business_id in (
    select id from businesses where owner_email = auth.jwt()->>'email'
  ));

alter table crm_nudges enable row level security;
create policy "Business owner access" on crm_nudges
  using (business_id in (
    select id from businesses where owner_email = auth.jwt()->>'email'
  ));

alter table whatsapp_log enable row level security;
create policy "Business owner access" on whatsapp_log
  using (business_id in (
    select id from businesses where owner_email = auth.jwt()->>'email'
  ));
