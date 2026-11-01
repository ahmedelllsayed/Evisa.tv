-- Staff roles. This file runs on every boot, so every statement must be safe to repeat.
-- profiles.role stays a text column. Existing admins stay "admin".

alter table profiles drop column if exists role_backup;

do $$
declare
  col_type text;
  constraint_name name;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'role';

  if col_type in ('text', 'character varying') then
    for constraint_name in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      where rel.relname = 'profiles'
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%role%'
    loop
      execute format('alter table profiles drop constraint %I', constraint_name);
    end loop;

    alter table profiles add constraint profiles_role_check
      check (role in ('user', 'viewer', 'support', 'operator', 'manager', 'admin', 'super_admin'));
  end if;
end $$;

create table if not exists admin_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null unique,
  resources jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into admin_permissions (role, resources) values
  ('super_admin', '{"applications":["view","create","edit","delete","assign","approve","refund"],"users":["view","create","edit","delete","ban","change_role"],"content":["view","create","edit","delete","publish"],"settings":["view","edit"],"reports":["view","export"],"audit":["view"],"staff":["view","manage"]}'::jsonb),
  ('admin', '{"applications":["view","create","edit","assign","approve","refund"],"users":["view","create","edit","delete","ban","change_role"],"content":["view","create","edit","delete","publish"],"settings":["view","edit"],"reports":["view","export"],"audit":["view"],"staff":["view","manage"]}'::jsonb),
  ('manager', '{"applications":["view","edit","assign","approve"],"users":["view"],"content":["view","create","edit","publish"],"settings":["view"],"reports":["view","export"],"audit":["view"],"staff":["view"]}'::jsonb),
  ('operator', '{"applications":["view","edit","assign"],"users":[],"content":["view"],"settings":[],"reports":["view"],"audit":[],"staff":[]}'::jsonb),
  ('support', '{"applications":["view"],"users":["view"],"content":["view"],"settings":[],"reports":["view"],"audit":[],"staff":[]}'::jsonb),
  ('viewer', '{"applications":["view"],"users":[],"content":["view"],"settings":[],"reports":["view"],"audit":[],"staff":[]}'::jsonb),
  ('user', '{"applications":[],"users":[],"content":[],"settings":[],"reports":[],"audit":[],"staff":[]}'::jsonb)
on conflict (role) do update
  set resources = excluded.resources,
      updated_at = now();

create table if not exists staff_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  department text,
  specialty text[],
  max_applications integer default 10,
  notes text,
  active boolean default true,
  hired_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_role on profiles (role);
create index if not exists idx_staff_profiles_active on staff_profiles (active);
create index if not exists idx_staff_profiles_specialty on staff_profiles using gin (specialty);

create or replace function update_staff_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_profiles_updated_at on staff_profiles;
create trigger staff_profiles_updated_at
  before update on staff_profiles
  for each row
  execute function update_staff_profiles_updated_at();
