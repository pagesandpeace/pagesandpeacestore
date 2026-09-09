alter table app_core.event_series
  add column if not exists default_title text,
  add column if not exists default_subtitle text,
  add column if not exists default_short_description text,
  add column if not exists default_description text,
  add column if not exists default_image_url text,
  add column if not exists default_capacity integer,
  add column if not exists default_ticket_name text,
  add column if not exists default_ticket_description text,
  add column if not exists default_ticket_price_pence integer;

with representative as (
  select distinct on (e.series_id)
    e.series_id,
    e.title,
    e.subtitle,
    e.short_description,
    e.description,
    e.image_url,
    e.capacity,
    tt.name as ticket_name,
    tt.description as ticket_description,
    tt.price_pence
  from app_core.events e
  left join lateral (
    select name, description, price_pence
    from app_core.ticket_types tt
    where tt.event_id = e.id
    order by tt.created_at asc
    limit 1
  ) tt on true
  where e.series_id is not null
    and e.status in ('published','draft')
  order by e.series_id,
    (e.starts_at >= now()) desc,
    (e.capacity > 0) desc,
    case when e.starts_at >= now() then e.starts_at end asc nulls last,
    e.starts_at desc
)
update app_core.event_series s
set
  default_title = coalesce(s.default_title, r.title),
  default_subtitle = coalesce(s.default_subtitle, r.subtitle),
  default_short_description = coalesce(s.default_short_description, s.short_description, r.short_description),
  default_description = coalesce(s.default_description, s.description, r.description),
  default_image_url = coalesce(s.default_image_url, s.image_url, r.image_url),
  default_capacity = coalesce(s.default_capacity, nullif(r.capacity, 0), 20),
  default_ticket_name = coalesce(s.default_ticket_name, r.ticket_name, 'General admission'),
  default_ticket_description = coalesce(s.default_ticket_description, r.ticket_description),
  default_ticket_price_pence = coalesce(s.default_ticket_price_pence, r.price_pence, 0)
from representative r
where r.series_id = s.id;

alter table app_core.event_series
  drop constraint if exists event_series_default_capacity_check,
  add constraint event_series_default_capacity_check check (default_capacity is null or default_capacity > 0),
  drop constraint if exists event_series_default_ticket_price_check,
  add constraint event_series_default_ticket_price_check check (default_ticket_price_pence is null or default_ticket_price_pence >= 0);