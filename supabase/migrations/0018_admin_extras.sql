alter table site_settings add column if not exists extras jsonb not null default '{}'::jsonb;

alter table profiles add column if not exists banned boolean not null default false;

alter table contact_messages add column if not exists read_at timestamptz;

create table if not exists admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);

update pages
set content = jsonb_set(
  content,
  '{body}',
  to_jsonb((content->>'body') || E'\n\n## 5. Cookies and analytics\nIf you accept cookies, the site loads Google Analytics 4 to count visits and application steps. The choice is stored in a cookie. You can refuse and the site still works. Payment data is not sent to analytics.')
)
where slug = 'privacy'
  and coalesce(content->>'body', '') like '%What we collect%'
  and coalesce(content->>'body', '') not like '%Cookies and analytics%';

update pages
set content = jsonb_set(
  content,
  '{bodyAr}',
  to_jsonb((content->>'bodyAr') || E'\n\n## 5. الكوكيز والتحليلات\nإذا وافقت على الكوكيز يحمّل الموقع Google Analytics 4 لعدّ الزيارات وخطوات الطلب. يُحفظ الاختيار في كوكي. يمكنك الرفض ويبقى الموقع يعمل. لا تُرسل بيانات الدفع إلى التحليلات.')
)
where slug = 'privacy'
  and coalesce(content->>'bodyAr', '') like '%ماذا نجمع%'
  and coalesce(content->>'bodyAr', '') not like '%الكوكيز والتحليلات%';
