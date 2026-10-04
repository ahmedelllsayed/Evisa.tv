-- Custom brand mark. Empty keeps the built-in wordmark.
alter table site_settings add column if not exists logo_url text;
