alter table site_settings add column if not exists citizenship_codes jsonb not null default '[]'::jsonb;
