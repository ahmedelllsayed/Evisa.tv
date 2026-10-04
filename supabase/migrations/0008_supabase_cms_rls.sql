-- Supabase-only. Skipped on the embedded database because is_admin() is created in 0002.

alter table pages enable row level security;
alter table site_settings enable row level security;

drop policy if exists pages_public_read on pages;
create policy pages_public_read on pages for select using (published or public.is_admin());
drop policy if exists pages_admin_write on pages;
create policy pages_admin_write on pages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists site_settings_public_read on site_settings;
create policy site_settings_public_read on site_settings for select using (true);
drop policy if exists site_settings_admin_write on site_settings;
create policy site_settings_admin_write on site_settings for all using (public.is_admin()) with check (public.is_admin());
