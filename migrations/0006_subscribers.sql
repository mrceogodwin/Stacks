create table if not exists studio_subscribers (
  id         serial primary key,
  email      text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists studio_subscribers_created_idx on studio_subscribers (created_at desc);
