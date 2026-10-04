-- Editable static pages and site-wide contact settings.
-- Safe to re-run: tables use IF NOT EXISTS and seeds use ON CONFLICT DO NOTHING.

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  template text not null,
  title text not null,
  published boolean not null default true,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists site_settings (
  id integer primary key default 1 check (id = 1),
  name text not null,
  legal_name text,
  description text,
  tagline text,
  general_email text,
  support_email text,
  press_email text,
  partnerships_email text,
  phone text,
  whatsapp text,
  offices jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into site_settings (
  id, name, legal_name, description, tagline,
  general_email, support_email, press_email, partnerships_email,
  phone, whatsapp, offices
) values (
  1,
  'Atlys',
  'Atlys, Inc.',
  'Atlys helps you plan, apply, and track visas seamlessly across the world.',
  'Visas On Time Guaranteed',
  'help@atlys.com',
  'support@atlys.com',
  'pr@atlys.com',
  'partnerships@atlys.com',
  '+1 607-208-2132',
  'https://wa.me/16072082132',
  '[{"city":"New York","address":"447 Broadway STE 851, New York, USA"},{"city":"Dubai","address":"3rd Floor, Burjuman Mall, Khalid Bin Al Waleed Rd - Al Mankhool - Dubai"},{"city":"Delhi","address":"7 Khullar Farms, New Delhi, India"}]'::jsonb
) on conflict (id) do nothing;

insert into pages (slug, template, title, published, sort_order) values
  ('on-time-guaranteed', 'on-time', 'On Time Guaranteed', true, 10),
  ('partners', 'partners', 'Partners', true, 20),
  ('newsroom', 'newsroom', 'Newsroom', true, 30),
  ('contact', 'contact', 'Contact', true, 40),
  ('emergency-care', 'emergency', 'Emergency Helpline', true, 50),
  ('tools/visa-requirements', 'requirements', 'Visa Requirements', true, 60),
  ('tools/visa-photo-maker', 'photo', 'Visa Photo Creator', true, 70),
  ('passport-index', 'passport', 'Passport Index', true, 80),
  ('wall-of-love', 'wall', 'Wall of Love', true, 90),
  ('transparency/refunds-policy', 'refunds', 'Refunds Policy', true, 100),
  ('transparency/status', 'status', 'Status', true, 110),
  ('transparency/price-change-log', 'fees', 'Fee Change Audit', true, 120),
  ('privacy', 'prose', 'Privacy Policy', true, 130),
  ('terms', 'prose', 'Terms and Conditions', true, 140),
  ('rejection-recovery', 'prose', 'Rejection Recovery', true, 150)
on conflict (slug) do nothing;
