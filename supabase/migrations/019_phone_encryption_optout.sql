-- Migration 019: Phone encryption, opt-out handling, review rules columns
-- Run against Supabase SQL Editor after 018_review_request_sent.sql

-- ═══════════════════════════════════════════════════════════════════
-- bookings — encrypted phone columns
-- ═══════════════════════════════════════════════════════════════════

alter table bookings
  add column if not exists customer_phone_encrypted text,
  add column if not exists phone_display text;

-- ═══════════════════════════════════════════════════════════════════
-- customer_profiles — encryption, opt-out, source, review tracking
-- ═══════════════════════════════════════════════════════════════════

alter table customer_profiles
  add column if not exists phone_encrypted text,
  add column if not exists phone_display text,
  add column if not exists opted_out boolean default false,
  add column if not exists opted_out_at timestamptz,
  add column if not exists source text default 'booking'
    check (source in ('booking', 'import')),
  add column if not exists import_platform text,
  add column if not exists has_left_review boolean default false,
  add column if not exists last_review_request_at timestamptz,
  add column if not exists notes text;

-- ═══════════════════════════════════════════════════════════════════
-- clients (import staging) — encryption, normalisation tracking
-- ═══════════════════════════════════════════════════════════════════

alter table clients
  add column if not exists phone_encrypted text,
  add column if not exists phone_display text,
  add column if not exists normalisation_failed boolean default false,
  add column if not exists import_platform text;

-- ═══════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════

create index if not exists idx_customer_profiles_opted_out
  on customer_profiles(business_id, opted_out)
  where opted_out = true;

create index if not exists idx_customer_profiles_source
  on customer_profiles(business_id, source);

create index if not exists idx_whatsapp_log_review_requests
  on whatsapp_log(business_id, template_name, sent_at)
  where template_name = 'review_request';
