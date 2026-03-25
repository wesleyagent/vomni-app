create table if not exists demo_bookings (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  business_name text not null,
  business_type text not null,
  phone text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'booked', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists demo_bookings_status_idx on demo_bookings(status);
create index if not exists demo_bookings_created_at_idx on demo_bookings(created_at desc);

alter table demo_bookings enable row level security;

create policy "Allow all operations on demo_bookings"
  on demo_bookings for all
  using (true)
  with check (true);
