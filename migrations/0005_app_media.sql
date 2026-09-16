alter table studio_apps add column if not exists video_url text not null default '';
alter table studio_apps add column if not exists download_url text not null default '';
alter table studio_tools add column if not exists video_url text not null default '';
