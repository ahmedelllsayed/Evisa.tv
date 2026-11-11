-- Visa questions and discount coupons. Safe to re-run.

create table if not exists visa_questions (
  id uuid primary key default gen_random_uuid(),
  visa_option_id uuid not null references visa_options (id) on delete cascade,
  prompt text not null,
  prompt_ar text,
  kind text not null check (kind in ('yes_no', 'single', 'text')),
  choices jsonb not null default '[]'::jsonb,
  required boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visa_questions_option_idx on visa_questions (visa_option_id, sort_order);

create table if not exists application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  question_id uuid references visa_questions (id) on delete set null,
  prompt text not null,
  prompt_ar text,
  kind text not null,
  answer text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists application_answers_question_idx
  on application_answers (application_id, question_id)
  where question_id is not null;

create index if not exists application_answers_application_idx on application_answers (application_id, sort_order);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(12, 2) not null,
  applies_to text not null check (applies_to in ('service', 'total')),
  destination_id uuid references destinations (id) on delete set null,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists coupons_code_idx on coupons (upper(code));

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null check (status in ('held', 'used', 'released')),
  amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists coupon_redemptions_application_idx on coupon_redemptions (application_id);
create index if not exists coupon_redemptions_coupon_idx on coupon_redemptions (coupon_id, status);

alter table applications add column if not exists coupon_id uuid references coupons (id) on delete set null;
alter table applications add column if not exists discount_amount numeric(12, 2) not null default 0;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'applications'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%travelers%'
    and pg_get_constraintdef(oid) ilike '%payment%';
  if constraint_name is not null then
    execute format('alter table applications drop constraint %I', constraint_name);
  end if;
end $$;

alter table applications drop constraint if exists applications_step_check;
alter table applications add constraint applications_step_check
  check (step in ('travelers', 'documents', 'answers', 'review', 'payment', 'done'));
