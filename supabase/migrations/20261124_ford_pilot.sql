-- Test-only pilot. Run with SQL Editor administrator. No access granted automatically.
begin;
create table if not exists public.work_module_members (
 user_id uuid not null references auth.users(id) on delete cascade,
 module_key text not null,
 role text not null check(role in ('operator','reviewer','admin')),
 primary key(user_id,module_key)
);
alter table public.work_module_members enable row level security;
revoke all on public.work_module_members from public, anon, authenticated;
grant select on public.work_module_members to authenticated;
drop policy if exists work_own_role on public.work_module_members;
create policy work_own_role on public.work_module_members for select to authenticated using(user_id=auth.uid());
create table if not exists public.ford_pilot_records (
 id uuid primary key,
 created_by uuid not null references auth.users(id),
 customer_name text not null check(char_length(customer_name) between 3 and 120),
 delivery_date date not null,
 account_done boolean not null,
 ford_done boolean not null,
 status text not null default 'draft' check(status in ('draft','complete')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 check(customer_name like 'TEST %')
);
alter table public.ford_pilot_records enable row level security;
revoke all on public.ford_pilot_records from public,anon,authenticated;
grant select on public.ford_pilot_records to authenticated;
drop policy if exists ford_pilot_read on public.ford_pilot_records;
create policy ford_pilot_read on public.ford_pilot_records for select to authenticated using (
 exists(select 1 from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot'
 and (m.role in ('admin','reviewer') or created_by=auth.uid()))
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ford-pilot-private','ford-pilot-private',false,10000000,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=10000000,allowed_mime_types=array['image/jpeg'];
drop policy if exists ford_pilot_upload on storage.objects;
create policy ford_pilot_upload on storage.objects for insert to authenticated with check (
 bucket_id='ford-pilot-private' and exists(
 select 1 from public.ford_pilot_records r join public.work_module_members m
 on m.user_id=auth.uid() and m.module_key='ford-pilot' and m.role in ('operator','admin')
 where r.created_by=auth.uid() and r.status='draft'
 and ((r.account_done and name=r.id::text||'/account.jpg') or (r.ford_done and name=r.id::text||'/ford.jpg'))
 )
);
drop policy if exists ford_pilot_photo_read on storage.objects;
create policy ford_pilot_photo_read on storage.objects for select to authenticated using (
 bucket_id='ford-pilot-private' and exists(select 1 from public.ford_pilot_records r
 where (name=r.id::text||'/account.jpg' or name=r.id::text||'/ford.jpg'))
);
create or replace function public.ford_pilot_begin(p_id uuid,p_name text,p_date date,p_account boolean,p_ford boolean)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.work_module_members where user_id=auth.uid() and module_key='ford-pilot' and role in ('operator','admin')) then raise exception 'not_authorized'; end if;
 if p_name is null or p_name not like 'TEST %' or p_date is null or p_account is null or p_ford is null then raise exception 'invalid_test_record'; end if;
 insert into public.ford_pilot_records(id,created_by,customer_name,delivery_date,account_done,ford_done)
 values(p_id,auth.uid(),p_name,p_date,p_account,p_ford) on conflict(id) do nothing;
 if not exists(select 1 from public.ford_pilot_records where id=p_id and created_by=auth.uid() and customer_name=p_name and delivery_date=p_date and account_done=p_account and ford_done=p_ford) then raise exception 'record_conflict'; end if;
 return p_id;
end $$;
create or replace function public.ford_pilot_finish(p_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.ford_pilot_records%rowtype;
begin
 if not exists(select 1 from public.work_module_members where user_id=auth.uid() and module_key='ford-pilot' and role in ('operator','admin')) then raise exception 'not_authorized'; end if;
 select * into r from public.ford_pilot_records where id=p_id and created_by=auth.uid() for update;
 if not found then raise exception 'not_authorized'; end if;
 if r.account_done and not exists(select 1 from storage.objects where bucket_id='ford-pilot-private' and name=p_id::text||'/account.jpg') then raise exception 'missing_account_photo'; end if;
 if r.ford_done and not exists(select 1 from storage.objects where bucket_id='ford-pilot-private' and name=p_id::text||'/ford.jpg') then raise exception 'missing_ford_photo'; end if;
 update public.ford_pilot_records set status='complete',completed_at=coalesce(completed_at,now()) where id=p_id;
 return p_id;
end $$;
revoke all on function public.ford_pilot_begin(uuid,text,date,boolean,boolean),public.ford_pilot_finish(uuid) from public,anon,authenticated;
grant execute on function public.ford_pilot_begin(uuid,text,date,boolean,boolean),public.ford_pilot_finish(uuid) to authenticated;
commit;
