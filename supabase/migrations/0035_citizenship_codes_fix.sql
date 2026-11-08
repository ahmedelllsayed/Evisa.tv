-- Heal citizenship lists that were stored as a JSON string, and add the column when an older database skipped it.

do $$
declare
  coltype text;
begin
  select data_type into coltype
  from information_schema.columns
  where table_schema = 'public' and table_name = 'site_settings' and column_name = 'citizenship_codes';

  if coltype is null then
    alter table site_settings add column citizenship_codes jsonb not null default '[]'::jsonb;
  elsif coltype = 'text' then
    alter table site_settings
      alter column citizenship_codes type jsonb
      using case
        when citizenship_codes is null or btrim(citizenship_codes) = '' then '[]'::jsonb
        when left(btrim(citizenship_codes), 1) = '[' then citizenship_codes::jsonb
        else '[]'::jsonb
      end;
  elsif coltype = 'jsonb' then
    update site_settings
    set citizenship_codes = (citizenship_codes #>> '{}')::jsonb
    where id = 1
      and jsonb_typeof(citizenship_codes) = 'string'
      and left(citizenship_codes #>> '{}', 1) = '[';
  end if;
end $$;
