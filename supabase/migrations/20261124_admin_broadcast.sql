-- izkarwell. — administrator broadcast foundation
-- No administrator is granted automatically. No notifications are sent.
begin;
create table if not exists public.notification_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.notification_admins enable row level security;
revoke all on public.notification_admins from public, anon, authenticated;
grant select on public.notification_admins to service_role;

alter table public.push_devices
  add column if not exists announcements_enabled boolean not null default false;
commit;
