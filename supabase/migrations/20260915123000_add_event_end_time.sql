alter table app_core.events add column if not exists ends_at timestamptz;

alter table app_core.events drop constraint if exists events_ends_after_start;
alter table app_core.events add constraint events_ends_after_start check (ends_at is null or ends_at > starts_at);
