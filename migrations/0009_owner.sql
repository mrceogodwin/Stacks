create table if not exists studio_activity (
  id serial primary key,
  actor text not null default '',
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists studio_activity_created_idx on studio_activity (created_at desc);
