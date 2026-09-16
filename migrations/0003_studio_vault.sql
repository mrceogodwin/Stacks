alter table studio_api_keys add column if not exists model text not null default '';
alter table studio_api_keys add column if not exists base_url text not null default '';
alter table studio_api_keys add column if not exists last_used_at timestamptz;

alter table studio_tools add column if not exists kind text not null default 'chat';
alter table studio_tools add column if not exists model text not null default '';
