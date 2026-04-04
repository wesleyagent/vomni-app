create table if not exists contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  business    text,
  message     text not null,
  status      text not null default 'new',  -- new | read | replied
  created_at  timestamptz not null default now()
);
