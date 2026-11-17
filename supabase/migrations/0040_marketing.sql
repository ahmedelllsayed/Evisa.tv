-- Marketing: coupon conditions and single-use codes, segments, lists, templates, channels,
-- campaigns and automations on one message queue, suppressions, referral rewards.

create table if not exists marketing_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  filter jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table coupons add column if not exists name text;
alter table coupons add column if not exists destination_ids jsonb not null default '[]'::jsonb;
alter table coupons add column if not exists visa_types jsonb not null default '[]'::jsonb;
alter table coupons add column if not exists min_total numeric(12, 2);
alter table coupons add column if not exists max_discount numeric(12, 2);
alter table coupons add column if not exists per_customer integer not null default 1;
alter table coupons add column if not exists first_order_only boolean not null default false;
alter table coupons add column if not exists segment_id uuid references marketing_segments (id) on delete set null;
alter table coupons add column if not exists system text;
update coupons set destination_ids = jsonb_build_array(destination_id::text)
where destination_id is not null and destination_ids = '[]'::jsonb;
update coupons set destination_id = null where destination_id is not null;

create table if not exists coupon_codes (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons (id) on delete cascade,
  code text not null unique,
  user_id uuid references profiles (id) on delete cascade,
  email text,
  campaign_id uuid,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists coupon_codes_coupon_idx on coupon_codes (coupon_id, created_at);

alter table coupon_redemptions add column if not exists code_id uuid references coupon_codes (id) on delete set null;
alter table applications add column if not exists coupon_code_id uuid references coupon_codes (id) on delete set null;
alter table applications add column if not exists coupon_auto_at timestamptz;

create table if not exists marketing_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table marketing_contacts alter column email drop not null;
alter table marketing_contacts add column if not exists phone text;
create unique index if not exists marketing_contacts_phone_key on marketing_contacts (phone) where phone is not null;

create table if not exists marketing_list_members (
  list_id uuid not null references marketing_lists (id) on delete cascade,
  contact_id uuid not null references marketing_contacts (id) on delete cascade,
  primary key (list_id, contact_id)
);

insert into marketing_lists (name)
select 'جهات مستوردة' where exists (select 1 from marketing_contacts)
on conflict (name) do nothing;
insert into marketing_list_members (list_id, contact_id)
select l.id, c.id from marketing_lists l cross join marketing_contacts c where l.name = 'جهات مستوردة'
on conflict do nothing;

create table if not exists marketing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  subject text,
  subject_en text,
  body text not null default '',
  body_en text,
  wa_name text,
  wa_language text,
  wa_params jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_channels (
  channel text primary key check (channel in ('sms', 'whatsapp')),
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  secret text,
  updated_at timestamptz not null default now()
);

create table if not exists marketing_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  segment_id uuid references marketing_segments (id) on delete set null,
  audience jsonb not null default '{}'::jsonb,
  template_id uuid references marketing_templates (id) on delete set null,
  content jsonb not null default '{}'::jsonb,
  coupon_id uuid references coupons (id) on delete set null,
  coupon_code text,
  unique_codes boolean not null default false,
  link_url text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'paused', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null check (trigger in ('abandoned', 'lapsed', 'approved', 'signup')),
  delay_hours integer not null default 24,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  template_id uuid references marketing_templates (id) on delete set null,
  coupon_id uuid references coupons (id) on delete set null,
  unique_codes boolean not null default false,
  link_url text,
  active boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_messages (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  campaign_id uuid references marketing_campaigns (id) on delete cascade,
  automation_id uuid references marketing_automations (id) on delete cascade,
  ref_key text,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  user_id uuid references profiles (id) on delete set null,
  contact_id uuid references marketing_contacts (id) on delete set null,
  address text not null,
  name text,
  locale text,
  coupon_code text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  provider_ref text,
  attempts integer not null default 0,
  sent_at timestamptz,
  clicks integer not null default 0,
  clicked_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists marketing_messages_campaign_key on marketing_messages (campaign_id, address) where campaign_id is not null;
create unique index if not exists marketing_messages_automation_key on marketing_messages (automation_id, ref_key) where automation_id is not null;
create index if not exists marketing_messages_status_idx on marketing_messages (status, channel, created_at);
create index if not exists marketing_messages_address_idx on marketing_messages (channel, address, sent_at);

create table if not exists marketing_suppressions (
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  address text not null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (channel, address)
);

alter table applications add column if not exists campaign_id uuid references marketing_campaigns (id) on delete set null;

create table if not exists referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles (id) on delete cascade,
  friend_id uuid not null references profiles (id) on delete cascade,
  application_id uuid not null unique references applications (id) on delete cascade,
  code_id uuid references coupon_codes (id) on delete set null,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists referral_rewards_referrer_idx on referral_rewards (referrer_id, created_at);

insert into marketing_campaigns (id, name, channel, content, coupon_id, coupon_code, status, created_by, created_at, updated_at, started_at, finished_at)
select id, subject, 'email', jsonb_build_object('subject', subject, 'body', body), coupon_id, coupon_code,
       case when status = 'sent' then 'sent' else 'paused' end,
       created_by, created_at, updated_at, created_at, case when status = 'sent' then updated_at end
from email_campaigns
on conflict (id) do nothing;

insert into marketing_messages (id, token, campaign_id, channel, user_id, contact_id, address, name, status, error, sent_at, created_at)
select id, substr(replace(id::text, '-', ''), 1, 12), campaign_id, 'email', user_id, contact_id, lower(email), name, status, error, sent_at, coalesce(sent_at, now())
from email_recipients
on conflict (id) do nothing;

insert into marketing_suppressions (channel, address, reason)
select 'email', lower(email), 'unsubscribed' from profiles where marketing_opt_out
on conflict do nothing;
insert into marketing_suppressions (channel, address, reason)
select 'email', lower(email), 'unsubscribed' from marketing_contacts where unsubscribed_at is not null and email is not null
on conflict do nothing;
