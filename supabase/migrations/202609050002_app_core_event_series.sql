begin;

alter table app_core.events
  add column if not exists series_name text;

commit;
