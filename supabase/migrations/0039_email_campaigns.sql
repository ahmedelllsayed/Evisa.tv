alter table profiles add column if not exists marketing_opt_out boolean not null default false;

create table if not exists marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  coupon_id uuid references coupons (id) on delete set null,
  coupon_code text,
  created_by uuid references profiles (id) on delete set null,
  status text not null default 'sending' check (status in ('sending', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists email_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references email_campaigns (id) on delete cascade,
  email text not null,
  name text,
  user_id uuid references profiles (id) on delete set null,
  contact_id uuid references marketing_contacts (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz,
  unique (campaign_id, email)
);

create index if not exists email_recipients_campaign_idx on email_recipients (campaign_id, status);
