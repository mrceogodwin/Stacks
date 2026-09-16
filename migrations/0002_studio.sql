create table if not exists studio_apps (
  id serial primary key,
  user_id text not null,
  name text not null,
  slug text not null,
  category text not null default 'App',
  description text not null default '',
  long_copy text not null default '',
  url text not null default '',
  tone text not null default 'teal',
  icon text not null default 'spark',
  thumbnail text,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists studio_apps_user_id_idx on studio_apps (user_id);
create index if not exists studio_apps_published_idx on studio_apps (published);

create table if not exists studio_tools (
  id serial primary key,
  user_id text not null,
  name text not null,
  slug text not null,
  category text not null default 'Writing',
  description text not null default '',
  long_copy text not null default '',
  tone text not null default 'teal',
  icon text not null default 'spark',
  prompt text not null default '',
  provider text not null default 'xai',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists studio_tools_user_id_idx on studio_tools (user_id);
create index if not exists studio_tools_published_idx on studio_tools (published);

create table if not exists studio_api_keys (
  id serial primary key,
  user_id text not null,
  label text not null,
  provider text not null default 'xai',
  secret text not null,
  last4 text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists studio_api_keys_user_id_idx on studio_api_keys (user_id);
