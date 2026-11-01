-- One row per visa product on a destination. Re-running this file must not duplicate rows.

create table if not exists visa_options (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations (id) on delete cascade,
  label text not null,
  label_ar text,
  visa_type text not null default 'e-visa',
  embassy_visit boolean not null default false,
  method text,
  method_ar text,
  validity text,
  validity_ar text,
  stay text,
  stay_ar text,
  entry text,
  entry_ar text,
  gov_fee numeric(12, 2) not null default 0,
  service_fee numeric(12, 2) not null default 0,
  processing_hours integer,
  express_hours integer,
  express_fee numeric(12, 2),
  documents jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visa_options_destination_idx on visa_options (destination_id, sort_order);
create unique index if not exists visa_options_one_default_idx on visa_options (destination_id) where is_default;

insert into visa_options (
  destination_id, label, label_ar, visa_type, embassy_visit, method, method_ar,
  validity, validity_ar, stay, stay_ar, entry, entry_ar,
  gov_fee, service_fee, processing_hours, express_hours, express_fee,
  documents, is_default, is_active, sort_order
)
select
  d.id,
  coalesce(nullif(btrim(concat_ws(' · ', nullif(btrim(d.stay), ''), nullif(btrim(d.entry), '')), ' ·'), ''), 'Standard'),
  nullif(btrim(concat_ws(' · ', nullif(btrim(d.stay_ar), ''), nullif(btrim(d.entry_ar), '')), ' ·'), ''),
  d.visa_type,
  coalesce(d.embassy_visit, false),
  d.method,
  d.method_ar,
  d.validity,
  d.validity_ar,
  d.stay,
  d.stay_ar,
  d.entry,
  d.entry_ar,
  d.gov_fee,
  d.service_fee,
  d.processing_hours,
  d.express_hours,
  d.express_fee,
  null,
  true,
  true,
  0
from destinations d
where not exists (select 1 from visa_options o where o.destination_id = d.id);

alter table applications add column if not exists visa_option_id uuid references visa_options (id) on delete set null;
alter table applications add column if not exists visa_label text;
alter table applications add column if not exists visa_label_ar text;
alter table applications add column if not exists visa_details jsonb;

create index if not exists applications_visa_option_idx on applications (visa_option_id, created_at desc);

update applications a
set visa_option_id = o.id,
    visa_label = o.label,
    visa_label_ar = o.label_ar,
    visa_details = jsonb_build_object(
      'stay', o.stay,
      'stayAr', o.stay_ar,
      'validity', o.validity,
      'validityAr', o.validity_ar,
      'entry', o.entry,
      'entryAr', o.entry_ar,
      'visaType', o.visa_type,
      'method', o.method,
      'methodAr', o.method_ar,
      'embassyVisit', o.embassy_visit,
      'processingHours', o.processing_hours,
      'expressHours', o.express_hours
    )
from visa_options o
where o.destination_id = a.destination_id
  and o.is_default
  and a.visa_label is null;

alter table fee_changes add column if not exists visa_option_id uuid references visa_options (id) on delete set null;
alter table fee_changes add column if not exists option_label text;
