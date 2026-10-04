alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles add column if not exists sex text;
alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists nationality char(2);
alter table profiles add column if not exists passport_number text;
alter table profiles add column if not exists passport_expiry date;

create table if not exists profile_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);
