-- Operations: sample reviews, account anonymisation, auth limits, and file access.

alter table reviews add column if not exists is_sample boolean not null default false;
alter table reviews add column if not exists verified boolean not null default false;
alter table reviews add column if not exists source text;

update reviews set is_sample = true
where is_sample = false
  and author in (
    'Ryan Mitchell', 'Hana Suzuki', 'Oscar Nilsson', 'Laura Romero', 'James Whitfield',
    'Nina Petrova', 'Adam Nowak', 'Mia Johansson', 'Louis B.', 'Salma K.', 'Omar H.',
    'Nour A.', 'Karim M.', 'Yasmin R.', 'Rahul Mehta', 'Neha Agarwal', 'Karthik Reddy',
    'Pooja Singh', 'Taneka C.', 'Deepa', 'Bhuvanesh P.', 'Gerald T.', 'Mandar K.',
    'Pratyay B.', 'Aarti S.', 'Preeti'
  );

alter table profiles add column if not exists anonymized_at timestamptz;
alter table profiles add column if not exists locale text;
alter table profiles add column if not exists totp_secret text;
alter table profiles add column if not exists totp_enabled boolean not null default false;

alter table admin_audit add column if not exists actor_id uuid;
alter table admin_audit add column if not exists ip text;
alter table admin_audit add column if not exists user_agent text;

alter table fee_changes add column if not exists actor_email text;

alter table contact_messages add column if not exists user_id uuid;
alter table contact_messages add column if not exists application_id uuid;
alter table contact_messages add column if not exists status text not null default 'open';
alter table contact_messages add column if not exists assignee_id uuid;
alter table contact_messages add column if not exists deleted_at timestamptz;

create table if not exists message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references contact_messages (id) on delete cascade,
  author_email text,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists auth_attempts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  email text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists auth_attempts_ip_idx on auth_attempts (ip, created_at);
create index if not exists auth_attempts_email_idx on auth_attempts (email, created_at);

create table if not exists file_access_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  storage_path text not null,
  created_at timestamptz not null default now(),
  ip text
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists user_sessions_user_idx on user_sessions (user_id);
