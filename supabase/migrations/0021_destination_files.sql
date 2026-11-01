create table if not exists destination_files (
  destination_id uuid not null references destinations (id) on delete cascade,
  kind text not null check (kind in ('image', 'hero', 'flag', 'video')),
  bytes bytea not null,
  mime text not null,
  primary key (destination_id, kind)
);
