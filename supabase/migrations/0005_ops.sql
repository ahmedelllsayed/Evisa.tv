-- Document rejection notes, application assignee, and the live-call booking link.
alter table documents add column if not exists reject_reason text;
alter table applications add column if not exists assignee_id uuid references profiles (id);
alter table site_settings add column if not exists booking_url text;
