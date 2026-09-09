create or replace function app_core.slugify_event_text(input text) returns text language sql immutable strict set search_path='' as $$ select trim(both '-' from regexp_replace(regexp_replace(lower(input),'[^a-z0-9]+','-','g'),'-+','-','g')) $$;
create or replace function app_core.sync_event_series() returns trigger language plpgsql set search_path='' as $$
declare v_id uuid; v_base text; v_slug text; v_suffix integer:=1;
begin
 if new.series_name is null or btrim(new.series_name)='' then new.series_name:=null;new.series_id:=null;return new;end if;
 new.series_name:=btrim(new.series_name);select id into v_id from app_core.event_series where lower(name)=lower(new.series_name) limit 1;
 if v_id is null then v_base:=app_core.slugify_event_text(new.series_name);if v_base='silent-read' then v_base:='silent-reading';end if;if v_base='' then v_base:='events';end if;v_slug:=v_base;
 while exists(select 1 from app_core.event_series where slug=v_slug) loop v_suffix:=v_suffix+1;v_slug:=v_base||'-'||v_suffix;end loop;
 insert into app_core.event_series(slug,name,short_description,description,image_url) values(v_slug,new.series_name,new.short_description,new.description,new.image_url) returning id into v_id;end if;
 new.series_id:=v_id;return new;end $$;
drop trigger if exists sync_event_series_before_write on app_core.events;
create trigger sync_event_series_before_write before insert or update of series_name on app_core.events for each row execute function app_core.sync_event_series();
update app_core.event_series set slug='silent-reading' where name='Silent Read' and slug<>'silent-reading';
with candidates as (select id,slug old_slug,app_core.slugify_event_text(title)||'-'||to_char(starts_at at time zone 'Europe/London','YYYY-MM-DD') clean_slug from app_core.events where status='published' and starts_at>=now() and slug like '%copy%')
update app_core.events e set legacy_slug=coalesce(e.legacy_slug,c.old_slug),slug=c.clean_slug from candidates c where e.id=c.id and not exists(select 1 from app_core.events other where other.slug=c.clean_slug and other.id<>e.id);
