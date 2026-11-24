-- Ford pilot desktop portal: recoverable removal, audit trail, existing data preserved.
begin;
alter table public.ford_pilot_records add column if not exists archived_at timestamptz;
alter table public.ford_pilot_records add column if not exists archived_by uuid;
create table if not exists public.ford_pilot_archive_log(
 id bigint generated always as identity primary key,
 record_id uuid not null references public.ford_pilot_records(id),
 actor_id uuid not null,
 action text not null check(action in ('archive','restore')),
 occurred_at timestamptz not null default now()
);
alter table public.ford_pilot_archive_log enable row level security;
revoke all on public.ford_pilot_archive_log from public,anon,authenticated;
drop policy if exists ford_pilot_read on public.ford_pilot_records;
create policy ford_pilot_read on public.ford_pilot_records for select to authenticated using (
 exists(select 1 from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot'
 and (m.role='admin' or (archived_at is null and (m.role='reviewer' or created_by=auth.uid()))))
);
drop policy if exists ford_pilot_upload on storage.objects;
create policy ford_pilot_upload on storage.objects for insert to authenticated with check (
 bucket_id='ford-pilot-private' and exists(
 select 1 from public.ford_pilot_records r join public.work_module_members m
 on m.user_id=auth.uid() and m.module_key='ford-pilot' and m.role in ('operator','admin')
 where r.created_by=auth.uid() and r.status='draft' and r.archived_at is null
 and ((r.account_done and name=r.id::text||'/account.jpg') or (r.ford_done and name=r.id::text||'/ford.jpg'))
 )
);
-- Old clients must not finalize a removed draft.
create or replace function public.ford_pilot_protect_archived()
returns trigger language plpgsql set search_path='' as $$
begin
 if old.archived_at is not null and new.archived_at is not null and new.status is distinct from old.status then
  raise exception 'archived_record';
 end if;
 return new;
end $$;
drop trigger if exists ford_pilot_protect_archived on public.ford_pilot_records;
create trigger ford_pilot_protect_archived before update on public.ford_pilot_records
for each row execute function public.ford_pilot_protect_archived();
create or replace function public.ford_pilot_archive(p_id uuid,p_archive boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if p_archive is null or not exists(select 1 from public.work_module_members where user_id=auth.uid() and module_key='ford-pilot' and role='admin') then raise exception 'not_authorized'; end if;
 update public.ford_pilot_records
 set archived_at=case when p_archive then now() else null end,
 archived_by=case when p_archive then auth.uid() else null end
 where id=p_id and ((p_archive and archived_at is null) or (not p_archive and archived_at is not null));
 get diagnostics changed=row_count;
 if changed=1 then
  insert into public.ford_pilot_archive_log(record_id,actor_id,action)
  values(p_id,auth.uid(),case when p_archive then 'archive' else 'restore' end);
 end if;
 return changed=1;
end $$;
revoke all on function public.ford_pilot_archive(uuid,boolean) from public,anon,authenticated;
grant execute on function public.ford_pilot_archive(uuid,boolean) to authenticated;
commit;
