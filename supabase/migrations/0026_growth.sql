create table if not exists funnel_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  locale text,
  destination_slug text,
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_created_idx on funnel_events (created_at desc);

alter table applications add column if not exists staff_checks jsonb not null default '{}'::jsonb;

alter table profiles add column if not exists referral_code text;
alter table profiles add column if not exists referred_by uuid;

create unique index if not exists profiles_referral_code_idx on profiles (referral_code) where referral_code is not null;
