-- Core schema. Portable: runs on Supabase Postgres and on the embedded local database (PGlite).

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  code char(2) not null unique,
  slug text not null unique,
  name text not null,
  region text,
  visa_required boolean not null default true,
  visa_type text not null default 'e-visa',
  validity text,
  stay text,
  entry text default 'Single',
  accepted_at text default 'All Ports of Entry',
  method text default 'Paperless',
  gov_fee numeric(12, 2) not null default 0,
  service_fee numeric(12, 2) not null default 0,
  currency char(3) not null default 'EGP',
  processing_hours integer,
  express_hours integer,
  express_fee numeric(12, 2),
  documents jsonb not null default '[]',
  image text,
  hero_image text,
  flag text,
  lat double precision,
  lng double precision,
  cities jsonb not null default '[]',
  sources jsonb not null default '[]',
  rejection_reasons jsonb not null default '[]',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FAQs with destination_id null are templates shown on every visa page;
-- "{country}" in question/answer is replaced with the destination name.
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references destinations (id) on delete cascade,
  scope text not null default 'visa' check (scope in ('visa', 'home', 'refunds', 'emergency')),
  category text not null default 'General Information',
  question text not null,
  answer text not null,
  sort_order integer not null default 0
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references destinations (id) on delete cascade,
  scope text not null default 'visa' check (scope in ('visa', 'home', 'refunds', 'wall')),
  author text not null,
  location text,
  title text,
  body text not null,
  rating smallint not null default 5 check (rating between 1 and 5),
  product text,
  url text,
  published_at date not null default current_date,
  sort_order integer not null default 0
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references destinations (id) on delete set null,
  name text not null,
  city text not null,
  country_code char(2) not null,
  starts_on date not null,
  image text,
  sort_order integer not null default 0
);

create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null,
  date date not null,
  name text not null,
  unique (country_code, date)
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references profiles (id) on delete cascade,
  destination_id uuid not null references destinations (id),
  status text not null default 'draft'
    check (status in ('draft', 'payment_pending', 'submitted', 'in_review', 'filed', 'approved', 'rejected', 'cancelled', 'refunded')),
  step text not null default 'travelers' check (step in ('travelers', 'documents', 'review', 'payment', 'done')),
  departure_date date,
  express boolean not null default false,
  guaranteed_at timestamptz,
  traveler_count integer not null default 1,
  gov_fee numeric(12, 2) not null default 0,
  service_fee numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'EGP',
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_user_idx on applications (user_id, created_at desc);

create table if not exists travelers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  sex text,
  date_of_birth date,
  nationality char(2),
  passport_number text,
  passport_expiry date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  traveler_id uuid references travelers (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes integer,
  status text not null default 'uploaded' check (status in ('uploaded', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  status text,
  title text not null,
  description text,
  on_time boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists application_events_app_idx on application_events (application_id, created_at);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount numeric(12, 2) not null,
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

create table if not exists fee_changes (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations (id) on delete cascade,
  old_total numeric(12, 2) not null,
  new_total numeric(12, 2) not null,
  reason text,
  changed_at timestamptz not null default now()
);

-- One-time codes for the built-in email sign-in used when Supabase Auth is not configured.
create table if not exists local_otps (
  email text primary key,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null
);
