-- Vomni Business Operations Tables
-- Created: 2026-03-25

-- businesses: one row per customer account
create table if not exists businesses (
  id uuid default gen_random_uuid() primary key,
  name text,
  owner_name text,
  owner_email text,
  google_review_link text,
  typeform_id text,
  typeform_link text,
  forwarding_email text,
  plan text,
  status text,
  created_at timestamptz default now()
);

-- bookings: individual appointments / customers
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id),
  customer_name text,
  customer_phone text,
  customer_email text,
  service text,
  appointment_at timestamptz,
  sms_sent_at timestamptz,
  sms_status text default 'pending',
  rating integer,
  review_status text default 'pending',
  created_at timestamptz default now()
);

-- feedback: private feedback captured before it reaches Google
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id),
  business_id uuid references businesses(id),
  rating integer,
  feedback_text text,
  status text default 'new',
  ai_reply text,
  created_at timestamptz default now()
);

-- google_redirects: log of customers redirected to leave a Google review
create table if not exists google_redirects (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id),
  business_id uuid references businesses(id),
  redirected_at timestamptz default now()
);

-- RLS: enabled but open (lock down per-business when auth is added)
alter table businesses enable row level security;
alter table bookings enable row level security;
alter table feedback enable row level security;
alter table google_redirects enable row level security;

create policy "Allow all" on businesses for all using (true) with check (true);
create policy "Allow all" on bookings for all using (true) with check (true);
create policy "Allow all" on feedback for all using (true) with check (true);
create policy "Allow all" on google_redirects for all using (true) with check (true);

-- Indexes
create index if not exists businesses_status_idx on businesses(status);
create index if not exists bookings_business_id_idx on bookings(business_id);
create index if not exists bookings_appointment_at_idx on bookings(appointment_at);
create index if not exists bookings_review_status_idx on bookings(review_status);
create index if not exists feedback_business_id_idx on feedback(business_id);
create index if not exists feedback_status_idx on feedback(status);
create index if not exists google_redirects_business_id_idx on google_redirects(business_id);
