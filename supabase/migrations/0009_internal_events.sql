alter table application_events add column if not exists internal boolean not null default false;
