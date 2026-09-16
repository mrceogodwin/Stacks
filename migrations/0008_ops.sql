create table if not exists studio_tool_prices (
  tool_id text primary key,
  generations int not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists studio_packs (
  id serial primary key,
  user_id text not null,
  name text not null,
  description text not null default '',
  lane text not null default 'free',
  file_url text not null default '',
  cover text,
  cost int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists studio_pack_unlocks (
  user_id text not null,
  pack_id int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

create table if not exists studio_tickets (
  id serial primary key,
  user_id text,
  email text not null,
  subject text not null default '',
  body text not null,
  status text not null default 'open',
  reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists studio_notifications (
  id serial primary key,
  user_id text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists studio_packs_pub_idx on studio_packs (published, lane, created_at desc);
create index if not exists studio_tickets_status_idx on studio_tickets (status, created_at desc);
create index if not exists studio_notifications_user_idx on studio_notifications (user_id, read, created_at desc);
