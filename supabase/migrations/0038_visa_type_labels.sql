-- Public names for extra and custom visa types. Safe to re-run.

alter table visa_options add column if not exists type_label text;
alter table visa_options add column if not exists type_label_ar text;
alter table destinations add column if not exists type_label text;
alter table destinations add column if not exists type_label_ar text;
