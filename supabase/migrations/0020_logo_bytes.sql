alter table site_settings add column if not exists logo_bytes bytea;
alter table site_settings add column if not exists logo_mime text;
