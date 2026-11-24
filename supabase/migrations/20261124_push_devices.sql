-- izkarwell. v1.2 notifications foundation
-- Does not modify sync_events or existing health data.
begin;
create table public.push_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  subscription jsonb not null
    check (jsonb_typeof(subscription) = 'object'
      and octet_length(subscription::text) <= 8192),
  enabled boolean not null default false,
  water_enabled boolean not null default false,
  interval_minutes integer not null default 120
    check (interval_minutes in (30,60,120,180)),
  start_minute integer not null default 540
    check (start_minute between 0 and 1439),
  end_minute integer not null default 1260
    check (end_minute between 0 and 1439),
  timezone text not null default 'Europe/Istanbul'
    check (char_length(timezone) between 1 and 80),
  private_mode boolean not null default true,
  next_due_at timestamptz,
  last_test_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id),
  check (end_minute > start_minute)
);
create index push_devices_due_idx on public.push_devices(next_due_at)
  where enabled and water_enabled;
alter table public.push_devices enable row level security;
revoke all on public.push_devices from public, anon, authenticated;
grant select, insert, update, delete on public.push_devices to service_role;
commit;
