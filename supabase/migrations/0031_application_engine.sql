-- Additive commercial engine: status history, locked requirements, payment events, receipts, and mail outbox.
-- Safe to re-run. It does not drop columns or rewrite existing roles.

create table if not exists application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid,
  actor_email text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists application_status_history_app_idx on application_status_history (application_id, created_at);

alter table applications add column if not exists price_locked_at timestamptz;
alter table applications add column if not exists requirements_locked jsonb;

alter table destinations add column if not exists source_url text;
alter table destinations add column if not exists reviewed_at timestamptz;

alter table payments add column if not exists refunded_amount numeric(12, 2) not null default 0;

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  merchant_order_id text,
  application_id uuid,
  status text not null,
  amount numeric(12, 2),
  currency char(3),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  receipt_no text not null unique,
  amount numeric(12, 2) not null,
  currency char(3) not null,
  issued_at timestamptz not null default now(),
  unique (payment_id)
);

create table if not exists notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  application_id uuid,
  user_id uuid,
  to_email text,
  subject text,
  body_text text,
  body_html text,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notification_outbox_pending_idx on notification_outbox (status, created_at);

create table if not exists visa_requirement_versions (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations (id) on delete cascade,
  visa_option_id uuid,
  nationality_code text not null default 'EG',
  version integer not null default 1,
  status text not null default 'published',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  requirements_json jsonb not null default '{}'::jsonb,
  source_url text,
  reviewed_at timestamptz,
  reviewed_by text
);
create unique index if not exists visa_requirement_versions_key
  on visa_requirement_versions (destination_id, coalesce(visa_option_id, '00000000-0000-0000-0000-000000000000'::uuid), nationality_code, version);

alter table pages add column if not exists workflow_status text not null default 'published';
update pages set workflow_status = 'archived' where published = false and workflow_status = 'published';

alter table funnel_events add column if not exists device text;

update applications a
set requirements_locked = coalesce(src.docs, '[]'::jsonb),
    price_locked_at = coalesce(a.price_locked_at, a.paid_at)
from (
  select a2.id,
    case
      when vo.documents is not null and jsonb_typeof(vo.documents) = 'array' and jsonb_array_length(vo.documents) > 0 then vo.documents
      else d.documents
    end as docs
  from applications a2
  join destinations d on d.id = a2.destination_id
  left join visa_options vo on vo.id = a2.visa_option_id
) src
where a.id = src.id and a.paid_at is not null and a.requirements_locked is null;

insert into visa_requirement_versions (destination_id, nationality_code, version, status, requirements_json, source_url, reviewed_at)
select d.id, 'EG', 1, 'published',
  jsonb_build_object('documents', d.documents, 'visa_type', d.visa_type),
  d.source_url, d.reviewed_at
from destinations d
where not exists (
  select 1 from visa_requirement_versions v
  where v.destination_id = d.id and v.visa_option_id is null and v.nationality_code = 'EG' and v.version = 1
);
