create table if not exists studio_tool_pause (
  tool_id text primary key,
  paused boolean not null default false,
  reason text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists studio_reviews (
  id serial primary key,
  author text not null default '',
  handle text not null default '',
  body text not null,
  source text not null default 'site',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists studio_partners (
  id serial primary key,
  name text not null,
  blurb text not null default '',
  url text not null default '',
  mark text not null default '',
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists studio_ads (
  id serial primary key,
  label text not null,
  href text not null default '#flagship',
  icon text not null default 'spark',
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists studio_ticker (
  id serial primary key,
  line text not null,
  published boolean not null default true,
  sort_order int not null default 0
);

create table if not exists studio_ops_events (
  id serial primary key,
  kind text not null,
  detail text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists studio_rate_hits (
  bucket text not null,
  window_start timestamptz not null default now(),
  hits int not null default 1,
  primary key (bucket, window_start)
);

create index if not exists studio_ops_events_idx on studio_ops_events (created_at desc);
create index if not exists studio_reviews_pub_idx on studio_reviews (published, created_at desc);
