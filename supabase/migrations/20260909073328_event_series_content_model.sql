create table app_core.event_series (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null unique,
  short_description text, description text, image_url text, seo_title text, seo_description text,
  is_public boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table app_core.event_series enable row level security;
revoke all on table app_core.event_series from public, anon, authenticated;
grant select, insert, update, delete on table app_core.event_series to service_role;
alter table app_core.events add column series_id uuid references app_core.event_series(id) on delete set null;
create index events_series_id_starts_at_idx on app_core.events(series_id, starts_at);
insert into app_core.event_series (slug,name,short_description,description,image_url)
select distinct on (series_name) regexp_replace(regexp_replace(lower(series_name),'[^a-z0-9]+','-','g'),'(^-|-$)','','g'), series_name,
 max(short_description) over(partition by series_name), max(description) over(partition by series_name), max(image_url) over(partition by series_name)
from app_core.events where series_name is not null and btrim(series_name)<>'' order by series_name,starts_at desc;
update app_core.events e set series_id=s.id from app_core.event_series s where e.series_name=s.name;
