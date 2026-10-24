-- Configurable questionnaires. Re-running this file must not duplicate the Schengen seed
-- or overwrite a set an admin has edited. The seed runs once, tracked by questionnaire_seeds.

create table if not exists question_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  description text,
  description_ar text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists question_set_assignments (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references question_sets (id) on delete cascade,
  destination_id uuid not null references destinations (id) on delete cascade,
  visa_option_id uuid references visa_options (id) on delete cascade,
  visa_type text,
  created_at timestamptz not null default now(),
  check (visa_type is null or visa_type in ('e-visa', 'sticker', 'eta', 'visa-free')),
  check (visa_option_id is null or visa_type is null)
);

create unique index if not exists question_set_assignments_scope_idx
  on question_set_assignments (
    destination_id,
    coalesce(visa_option_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(visa_type, '')
  );

create index if not exists question_set_assignments_set_idx on question_set_assignments (question_set_id);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid references question_sets (id) on delete cascade,
  application_id uuid references applications (id) on delete cascade,
  key text not null,
  type text not null,
  label text not null,
  label_ar text,
  help_text text,
  help_text_ar text,
  required boolean not null default false,
  sort_order integer not null default 0,
  options jsonb not null default '[]',
  show_if jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type in ('short_text', 'long_text', 'yes_no', 'single_choice', 'multiple_choice', 'date', 'number', 'file')),
  check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  check (
    (question_set_id is not null and application_id is null)
    or (question_set_id is null and application_id is not null)
  )
);

drop index if exists questions_set_key_idx;
drop index if exists questions_app_key_idx;
create unique index questions_set_key_idx on questions (question_set_id, key) where question_set_id is not null and is_active;
create unique index questions_app_key_idx on questions (application_id, key) where application_id is not null and is_active;
create index if not exists questions_set_idx on questions (question_set_id, sort_order);
create index if not exists questions_application_idx on questions (application_id, sort_order);

create table if not exists application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  value_text text,
  value_json jsonb,
  file_path text,
  file_name text,
  file_mime text,
  file_size integer,
  updated_at timestamptz not null default now(),
  unique (application_id, question_id)
);

create index if not exists application_answers_question_idx on application_answers (question_id);
create index if not exists application_answers_file_idx on application_answers (file_path);

create table if not exists questionnaire_seeds (
  key text primary key,
  applied_at timestamptz not null default now()
);

-- Allow the questions step without changing applications that stay on the original steps.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'applications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%step%'
  loop
    execute format('alter table applications drop constraint %I', r.conname);
  end loop;
end $$;

alter table applications drop constraint if exists applications_step_check;
alter table applications add constraint applications_step_check
  check (step in ('travelers', 'documents', 'questions', 'review', 'payment', 'done'));

-- Schengen country codes match SCHENGEN_COUNTRY_CODES in src/lib/questions.ts.
with seed as (
  insert into questionnaire_seeds (key)
  select 'schengen-v1'
  where not exists (select 1 from questionnaire_seeds where key = 'schengen-v1')
  returning key
),
created as (
  insert into question_sets (id, name, name_ar, description, description_ar)
  select
    '6f0e5c2a-9b14-4c1e-9a77-0b1e5c2a9b14'::uuid,
    'Schengen application',
    'طلب شنغن',
    'Extra details used to prepare a Schengen visa form. Assign it to a sticker visa.',
    'بيانات إضافية لإعداد نموذج تأشيرة شنغن. اربطها بتأشيرة ملصقة.'
  from seed
  returning id
),
inserted as (
  insert into questions (
    id, question_set_id, key, type, label, label_ar, help_text, help_text_ar, required, sort_order, options, show_if
  )
  select
    v.id,
    c.id,
    v.key,
    v.type,
    v.label,
    v.label_ar,
    v.help_text,
    v.help_text_ar,
    v.required,
    v.sort_order,
    v.options,
    v.show_if
  from created c
  cross join (
    values
      ('6f0e5c2a-9b14-4c1e-9a77-000000000001'::uuid, 'travel_purpose', 'single_choice', 'Purpose of travel', 'غرض السفر', null::text, null::text, true, 10,
        '[{"value":"tourism","label":"Tourism","labelAr":"سياحة"},{"value":"business","label":"Business","labelAr":"عمل"},{"value":"family","label":"Visiting family or friends","labelAr":"زيارة أهل أو أصدقاء"},{"value":"other","label":"Other","labelAr":"أخرى"}]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000002'::uuid, 'travel_purpose_detail', 'long_text', 'Describe the purpose of the trip', 'صف غرض الرحلة', 'A short explanation for the visa form.', 'شرح قصير يُكتب في نموذج التأشيرة.', true, 20,
        '[]'::jsonb, '{"questionKey":"travel_purpose","equals":"other"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000003'::uuid, 'arrival_date', 'date', 'Intended date of arrival', 'تاريخ الوصول المتوقع', null::text, null::text, true, 30, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000004'::uuid, 'departure_date', 'date', 'Intended date of departure', 'تاريخ المغادرة المتوقع', null::text, null::text, true, 40, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000005'::uuid, 'main_destination', 'short_text', 'Main country of stay in the Schengen area', 'بلد الإقامة الرئيسي في شنغن', 'For example Spain, the Netherlands, or Greece.', 'مثل إسبانيا أو هولندا أو اليونان.', true, 50, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000006'::uuid, 'accommodation', 'long_text', 'Where will you stay?', 'أين ستقيم؟', 'Hotel name and address, or the host address.', 'اسم الفندق وعنوانه، أو عنوان المضيف.', true, 60, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000007'::uuid, 'accommodation_proof', 'file', 'Proof of accommodation', 'إثبات الإقامة', 'Hotel booking or invitation letter.', 'حجز فندق أو خطاب دعوة.', true, 70, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000008'::uuid, 'traveled_abroad', 'yes_no', 'Have you traveled outside Egypt before?', 'هل سافرت خارج مصر من قبل؟', null::text, null::text, true, 80, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000009'::uuid, 'travel_history', 'long_text', 'Previous international travel', 'السفر الدولي السابق', 'List the countries and approximate years.', 'اذكر الدول والسنوات التقريبية.', true, 90,
        '[]'::jsonb, '{"questionKey":"traveled_abroad","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-00000000000a'::uuid, 'previous_schengen', 'yes_no', 'Have you been issued a Schengen visa before?', 'هل حصلت على تأشيرة شنغن من قبل؟', null::text, null::text, true, 100, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-00000000000b'::uuid, 'previous_schengen_dates', 'short_text', 'Previous visa number and validity dates', 'رقم التأشيرة السابقة وتواريخ صلاحيتها', null::text, null::text, true, 110,
        '[]'::jsonb, '{"questionKey":"previous_schengen","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-00000000000c'::uuid, 'previous_schengen_copy', 'file', 'Copy of the previous Schengen visa', 'صورة تأشيرة شنغن السابقة', null::text, null::text, false, 120,
        '[]'::jsonb, '{"questionKey":"previous_schengen","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-00000000000d'::uuid, 'fingerprints', 'yes_no', 'Have you given fingerprints for a Schengen visa in the last 59 months?', 'هل قدمت بصمات لتأشيرة شنغن خلال آخر 59 شهراً؟', null::text, null::text, true, 130, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-00000000000e'::uuid, 'fingerprint_date', 'date', 'Date the fingerprints were taken', 'تاريخ أخذ البصمات', 'Leave this blank if you do not remember.', 'اتركه فارغاً إذا لم تتذكر.', false, 140,
        '[]'::jsonb, '{"questionKey":"fingerprints","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-00000000000f'::uuid, 'marital_status', 'single_choice', 'Marital status', 'الحالة الاجتماعية', null::text, null::text, true, 150,
        '[{"value":"single","label":"Single","labelAr":"أعزب"},{"value":"married","label":"Married","labelAr":"متزوج"},{"value":"divorced","label":"Divorced","labelAr":"مطلق"},{"value":"widowed","label":"Widowed","labelAr":"أرمل"},{"value":"other","label":"Other","labelAr":"أخرى"}]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000010'::uuid, 'spouse_name', 'short_text', 'Spouse full name as in the passport', 'الاسم الكامل للزوج أو الزوجة كما في جواز السفر', null::text, null::text, true, 160,
        '[]'::jsonb, '{"questionKey":"marital_status","equals":"married"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000011'::uuid, 'employed', 'yes_no', 'Are you currently employed or self-employed?', 'هل تعمل حالياً لدى جهة أو تعمل لحسابك؟', null::text, null::text, true, 170, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000012'::uuid, 'employer_name', 'short_text', 'Employer or business name', 'اسم جهة العمل أو النشاط', null::text, null::text, true, 180,
        '[]'::jsonb, '{"questionKey":"employed","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000013'::uuid, 'job_title', 'short_text', 'Job title', 'المسمى الوظيفي', null::text, null::text, true, 190,
        '[]'::jsonb, '{"questionKey":"employed","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000014'::uuid, 'employer_address', 'long_text', 'Employer address and phone', 'عنوان جهة العمل ورقم الهاتف', null::text, null::text, true, 200,
        '[]'::jsonb, '{"questionKey":"employed","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000015'::uuid, 'monthly_income', 'number', 'Monthly income in EGP', 'الدخل الشهري بالجنيه', 'Enter 0 if you have no personal income.', 'اكتب 0 إذا لم يكن لك دخل شخصي.', true, 210, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000016'::uuid, 'income_proof', 'file', 'Proof of income or funds', 'إثبات الدخل أو الرصيد', 'A bank statement, salary certificate, or similar document.', 'كشف حساب أو شهادة راتب أو مستند مشابه.', true, 220, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000017'::uuid, 'sponsor', 'yes_no', 'Will someone else pay for this trip?', 'هل سيمول شخص آخر هذه الرحلة؟', null::text, null::text, true, 230, '[]'::jsonb, null::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000018'::uuid, 'sponsor_name', 'short_text', 'Sponsor full name', 'الاسم الكامل للكفيل', null::text, null::text, true, 240,
        '[]'::jsonb, '{"questionKey":"sponsor","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-000000000019'::uuid, 'sponsor_relation', 'short_text', 'Relationship to the sponsor', 'صلة القرابة بالكفيل', null::text, null::text, true, 250,
        '[]'::jsonb, '{"questionKey":"sponsor","equals":"yes"}'::jsonb),
      ('6f0e5c2a-9b14-4c1e-9a77-00000000001a'::uuid, 'sponsor_letter', 'file', 'Sponsor letter or proof of support', 'خطاب الكفيل أو إثبات الإعالة', null::text, null::text, false, 260,
        '[]'::jsonb, '{"questionKey":"sponsor","equals":"yes"}'::jsonb)
  ) as v(id, key, type, label, label_ar, help_text, help_text_ar, required, sort_order, options, show_if)
  returning id
)
insert into question_set_assignments (question_set_id, destination_id, visa_type)
select c.id, d.id, 'sticker'
from created c
join destinations d on upper(btrim(d.code::text)) in (
  'AT', 'BE', 'BG', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
  'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
)
where (
  d.visa_type = 'sticker'
  or exists (
    select 1 from visa_options o
    where o.destination_id = d.id and o.visa_type = 'sticker' and o.is_active
  )
)
and exists (select 1 from inserted)
and not exists (
  select 1 from question_set_assignments a
  where a.destination_id = d.id
    and a.visa_option_id is null
    and coalesce(a.visa_type, '') = 'sticker'
);
