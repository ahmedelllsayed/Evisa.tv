-- Site-wide approval rates shown on every visa page.
alter table site_settings add column if not exists approval_rate numeric not null default 96.7;
alter table site_settings add column if not exists approval_overall numeric not null default 75.3;
