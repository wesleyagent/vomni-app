-- Vomni Agent Workspace Tables
-- Run this in your Supabase SQL editor at supabase.com/dashboard

-- Leads table (populated by Prospector agent)
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  business_name text not null,
  business_type text not null default 'other',
  location text not null default '',
  city text not null default '',
  country text not null default 'UK',
  google_rating numeric(3,1) not null default 0,
  review_count integer not null default 0,
  competitor_name text not null default '',
  competitor_rating numeric(3,1) not null default 0,
  instagram_handle text not null default '',
  email text not null default '',
  outreach_channel text not null default 'instagram',
  score integer not null default 5,
  status text not null default 'new',
  notes text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Copy queue table (populated by Outreach Writer)
create table if not exists copy_queue (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  variant_a text not null default '',
  variant_b text not null default '',
  variant_c text not null default '',
  approved_variant text,
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Conversations table (managed by Objection Handler)
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  thread jsonb not null default '[]',
  suggested_response text not null default '',
  status text not null default 'new_reply',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Weekly reports table (written by Analyst)
create table if not exists weekly_reports (
  id uuid default gen_random_uuid() primary key,
  week_starting date not null,
  leads_found integer not null default 0,
  outreach_sent integer not null default 0,
  reply_rate numeric(5,2) not null default 0,
  demos_booked integer not null default 0,
  new_customers integer not null default 0,
  what_worked text not null default '',
  what_didnt text not null default '',
  recommendations text not null default '',
  created_at timestamptz default now()
);

-- Enable Row Level Security (allow anon read/write for now — lock down when ready)
alter table leads enable row level security;
alter table copy_queue enable row level security;
alter table conversations enable row level security;
alter table weekly_reports enable row level security;

create policy "Allow all" on leads for all using (true) with check (true);
create policy "Allow all" on copy_queue for all using (true) with check (true);
create policy "Allow all" on conversations for all using (true) with check (true);
create policy "Allow all" on weekly_reports for all using (true) with check (true);

-- Indexes for common queries
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_city_idx on leads(city);
create index if not exists copy_queue_status_idx on copy_queue(status);
create index if not exists copy_queue_lead_id_idx on copy_queue(lead_id);
create index if not exists conversations_status_idx on conversations(status);
create index if not exists conversations_lead_id_idx on conversations(lead_id);
