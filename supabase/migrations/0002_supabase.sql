-- Supabase-only: links profiles to Supabase Auth, enables Row Level Security,
-- creates the private Storage bucket and turns on Realtime for tracking.
-- Skipped automatically by `npm run db:migrate` when running on the local database.

-- Profiles mirror auth.users
alter table profiles drop constraint if exists profiles_auth_fk;
alter table profiles add constraint profiles_auth_fk foreign key (id) references auth.users (id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.owns_application(app_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from applications where id = app_id and user_id = auth.uid());
$$;

-- Row Level Security
alter table profiles enable row level security;
alter table destinations enable row level security;
alter table faqs enable row level security;
alter table reviews enable row level security;
alter table events enable row level security;
alter table holidays enable row level security;
alter table fee_changes enable row level security;
alter table applications enable row level security;
alter table travelers enable row level security;
alter table documents enable row level security;
alter table application_events enable row level security;
alter table payments enable row level security;
alter table local_otps enable row level security;

-- Public catalog: readable by everyone, writable by admins
do $$
declare t text;
begin
  foreach t in array array['destinations', 'faqs', 'reviews', 'events', 'holidays', 'fee_changes'] loop
    execute format('drop policy if exists "%1$s_public_read" on %1$I', t);
    execute format('create policy "%1$s_public_read" on %1$I for select using (true)', t);
    execute format('drop policy if exists "%1$s_admin_write" on %1$I', t);
    execute format('create policy "%1$s_admin_write" on %1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = 'user');

drop policy if exists applications_owner on applications;
create policy applications_owner on applications for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists applications_owner_insert on applications;
create policy applications_owner_insert on applications for insert with check (user_id = auth.uid());
drop policy if exists applications_admin_update on applications;
create policy applications_admin_update on applications for update using (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['travelers', 'documents', 'application_events', 'payments'] loop
    execute format('drop policy if exists "%1$s_owner_read" on %1$I', t);
    execute format('create policy "%1$s_owner_read" on %1$I for select using (public.owns_application(application_id) or public.is_admin())', t);
    execute format('drop policy if exists "%1$s_admin_write" on %1$I', t);
    execute format('create policy "%1$s_admin_write" on %1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists travelers_owner_write on travelers;
create policy travelers_owner_write on travelers for all
  using (public.owns_application(application_id)) with check (public.owns_application(application_id));

-- Private bucket for passports and photos. Objects are stored as <user_id>/<application_id>/<file>.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_owner_read on storage.objects;
create policy documents_owner_read on storage.objects for select
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists documents_owner_insert on storage.objects;
create policy documents_owner_insert on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime for live tracking
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table application_events;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table applications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
