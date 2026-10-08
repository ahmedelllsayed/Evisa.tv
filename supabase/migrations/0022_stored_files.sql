create table if not exists stored_files (
  path text primary key,
  bytes bytea not null,
  mime text,
  created_at timestamptz not null default now()
);
