create table if not exists studio_owners (
  user_id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists studio_settings (
  key text primary key,
  value text not null default ''
);

create table if not exists studio_wallets (
  user_id text primary key,
  email text not null default '',
  generations int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists studio_payments (
  id serial primary key,
  user_id text not null,
  email text not null,
  amount text not null,
  currency text not null default 'USDT',
  tx_hash text not null default '',
  note text not null default '',
  status text not null default 'pending',
  generations_credit int not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists studio_payments_status_idx on studio_payments (status, created_at desc);
create index if not exists studio_payments_user_idx on studio_payments (user_id, created_at desc);
