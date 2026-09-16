create table if not exists studio_counters (
  kind text not null,
  item_id text not null,
  count integer not null default 0,
  primary key (kind, item_id)
);
create index if not exists studio_counters_kind_idx on studio_counters (kind);
