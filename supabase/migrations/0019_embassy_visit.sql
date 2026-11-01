alter table destinations add column if not exists embassy_visit boolean not null default false;

update destinations
set embassy_visit = true
where visa_type = 'sticker'
  and coalesce(method, '') ilike '%embassy%';
