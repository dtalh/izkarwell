-- v2.1 preparation only: real customer entry remains OFF.
-- Apply after all v2.0 migrations. Existing records and photos are preserved.
begin;
create table if not exists public.ford_corporate_settings (
 singleton boolean primary key default true check(singleton),
 real_entry_enabled boolean not null default false
);
alter table public.ford_corporate_settings enable row level security;
revoke all on public.ford_corporate_settings from public,anon,authenticated;
insert into public.ford_corporate_settings(singleton,real_entry_enabled) values(true,false)
on conflict(singleton) do update set real_entry_enabled=false;
alter table public.ford_pilot_records add column if not exists is_test boolean not null default true;
-- Remove only the legacy TEST-prefix constraint.
do $$
declare c record;
begin
 for c in select conname from pg_constraint where conrelid='public.ford_pilot_records'::regclass
 and contype='c' and pg_get_constraintdef(oid) like '%customer_name%TEST %'
 loop execute format('alter table public.ford_pilot_records drop constraint %I',c.conname); end loop;
end $$;
create or replace function public.ford_corporate_is_test(p_name text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_name like 'TEST %',false)
$$;
create or replace function public.ford_corporate_enabled()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select real_entry_enabled from public.ford_corporate_settings where singleton),false)
$$;
create or replace function public.ford_corporate_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_role text;
begin
 select m.role into v_role from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot';
 if v_role is null then raise exception 'not_authorized' using errcode='42501'; end if;
 return jsonb_build_object('role',v_role,'real_entry_enabled',public.ford_corporate_enabled());
end $$;
-- Server-derived immutable record type: older clients cannot bypass this gate.
create or replace function public.ford_corporate_record_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.is_test:=public.ford_corporate_is_test(new.customer_name);
 else
  if new.is_test is distinct from old.is_test or public.ford_corporate_is_test(new.customer_name) is distinct from old.is_test then raise exception 'record_type_immutable'; end if;
  if new.archived_at is distinct from old.archived_at and (to_jsonb(new)-'archived_at'-'archived_by')=(to_jsonb(old)-'archived_at'-'archived_by') then return new; end if;
 end if;
 if not new.is_test and not public.ford_corporate_enabled() then raise exception 'corporate_entry_disabled' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists ford_corporate_record_guard on public.ford_pilot_records;
create trigger ford_corporate_record_guard before insert or update on public.ford_pilot_records for each row execute function public.ford_corporate_record_guard();
create or replace function public.ford_pilot_begin(p_id uuid,p_name text,p_date date,p_account boolean,p_ford boolean)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.work_module_members where user_id=auth.uid() and module_key='ford-pilot' and role in ('operator','admin')) then raise exception 'not_authorized'; end if;
 if p_name is null or length(trim(p_name)) not between 3 and 120 or p_date is null or p_account is null or p_ford is null then raise exception 'invalid_customer_record'; end if;
 if not public.ford_corporate_is_test(p_name) and not public.ford_corporate_enabled() then raise exception 'corporate_entry_disabled' using errcode='42501'; end if;
 insert into public.ford_pilot_records(id,created_by,customer_name,delivery_date,account_done,ford_done)
 values(p_id,auth.uid(),p_name,p_date,p_account,p_ford) on conflict(id) do nothing;
 if not exists(select 1 from public.ford_pilot_records where id=p_id and created_by=auth.uid() and archived_at is null and customer_name=p_name and delivery_date=p_date and account_done=p_account and ford_done=p_ford) then raise exception 'record_conflict'; end if;
 return p_id;
end $$;
create or replace function public.ford_pilot_duplicate(p_name text,p_date date,p_exclude uuid default null)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot' and m.role in ('operator','admin')) then
  raise exception 'not_authorized' using errcode='42501';
 end if;
 if p_name is null or length(trim(p_name)) not between 3 and 120 or p_date is null then raise exception 'invalid_customer_record'; end if;
 if not public.ford_corporate_is_test(p_name) and not public.ford_corporate_enabled() then raise exception 'corporate_entry_disabled' using errcode='42501'; end if;
 return exists(select 1 from public.ford_pilot_records r where r.archived_at is null and r.is_test=public.ford_corporate_is_test(p_name)
  and (p_exclude is null or r.id<>p_exclude) and r.delivery_date=p_date
  and lower(translate(regexp_replace(trim(r.customer_name),'\s+',' ','g'),'Iİ','ıi'))=lower(translate(regexp_replace(trim(p_name),'\s+',' ','g'),'Iİ','ıi')));
end $$;
create or replace function public.ford_pilot_edit(p_id uuid,p_revision bigint,p_name text,p_date date,p_account boolean,p_ford boolean,p_note text)
returns bigint language plpgsql security definer set search_path='' as $$
declare r public.ford_pilot_records%rowtype; v_role text; changed bigint; old_values jsonb; new_values jsonb;
begin
 select m.role into v_role from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot';
 if v_role is null or v_role not in ('operator','admin') then raise exception 'not_authorized' using errcode='42501'; end if;
 select * into r from public.ford_pilot_records where id=p_id and archived_at is null and status='complete' for update;
 if not found or (v_role='operator' and r.created_by<>auth.uid()) then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_revision is distinct from r.revision then raise exception 'record_changed' using errcode='40001'; end if;
 if p_name is null or length(trim(p_name)) not between 3 and 120 or p_date is null or p_account is null or p_ford is null or p_note is null or length(p_note)>500 then raise exception 'invalid_customer_record'; end if;
 if p_account and not exists(select 1 from storage.objects where bucket_id='ford-pilot-private' and name=p_id::text||'/account.jpg') then raise exception 'missing_account_photo'; end if;
 if p_ford and not exists(select 1 from storage.objects where bucket_id='ford-pilot-private' and name=p_id::text||'/ford.jpg') then raise exception 'missing_ford_photo'; end if;
 old_values=jsonb_build_object('customer_name',r.customer_name,'delivery_date',r.delivery_date,'account_done',r.account_done,'ford_done',r.ford_done,'incomplete_note',r.incomplete_note);
 new_values=jsonb_build_object('customer_name',trim(p_name),'delivery_date',p_date,'account_done',p_account,'ford_done',p_ford,'incomplete_note',trim(p_note));
 if old_values=new_values then return r.revision; end if;
 update public.ford_pilot_records set customer_name=trim(p_name),delivery_date=p_date,account_done=p_account,ford_done=p_ford,incomplete_note=trim(p_note),revision=revision+1
 where id=p_id returning revision into changed;
 insert into public.ford_pilot_edit_log(record_id,actor_id,before_values,after_values) values(p_id,auth.uid(),old_values,new_values);
 return changed;
end $$;
-- Restrictive storage policy combines with existing ownership policies.
create or replace function public.ford_corporate_can_upload(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ford_pilot_records r join public.work_module_members m
 on m.user_id=auth.uid() and m.module_key='ford-pilot'
 where r.archived_at is null and (r.is_test or public.ford_corporate_enabled())
 and (m.role='admin' or (m.role='operator' and r.created_by=auth.uid()))
 and (p_name=r.id::text||'/account.jpg' or p_name=r.id::text||'/ford.jpg'))
$$;
drop policy if exists ford_corporate_upload_gate on storage.objects;
create policy ford_corporate_upload_gate on storage.objects as restrictive for insert to authenticated
with check (bucket_id<>'ford-pilot-private' or public.ford_corporate_can_upload(name));
-- Enforce record-level photo access even if an additional permissive policy exists.
create or replace function public.ford_corporate_can_read(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ford_pilot_records r join public.work_module_members m
 on m.user_id=auth.uid() and m.module_key='ford-pilot'
 where (m.role='admin' or (r.archived_at is null and (m.role='reviewer' or r.created_by=auth.uid())))
 and (p_name=r.id::text||'/account.jpg' or p_name=r.id::text||'/ford.jpg'))
$;
drop policy if exists ford_corporate_read_gate on storage.objects;
create policy ford_corporate_read_gate on storage.objects as restrictive for select to authenticated
using (bucket_id<>'ford-pilot-private' or public.ford_corporate_can_read(name));
drop policy if exists ford_corporate_anon_gate on storage.objects;
create policy ford_corporate_anon_gate on storage.objects as restrictive for all to anon
using (bucket_id<>'ford-pilot-private') with check (bucket_id<>'ford-pilot-private');
update storage.buckets set public=false where id='ford-pilot-private';
-- Recheck every export record against current permissions.
create or replace function public.ford_corporate_check_export(p_ids uuid[])
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_role text;
begin
 select m.role into v_role from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot';
 if v_role is null or v_role not in ('reviewer','admin') or p_ids is null or cardinality(p_ids)>250 then return false; end if;
 return not exists(select 1 from unnest(p_ids) as x(id) where not exists(
  select 1 from public.ford_pilot_records r where r.id=x.id and (v_role='admin' or r.archived_at is null)));
end $$;
revoke all on function public.ford_corporate_is_test(text),public.ford_corporate_enabled(),public.ford_corporate_status(),public.ford_corporate_record_guard(),public.ford_corporate_can_upload(text),public.ford_corporate_can_read(text),public.ford_corporate_check_export(uuid[]) from public,anon,authenticated;
grant execute on function public.ford_corporate_status(),public.ford_corporate_can_upload(text),public.ford_corporate_can_read(text),public.ford_corporate_check_export(uuid[]) to authenticated;
-- Original RPC grants are retained by CREATE OR REPLACE.
commit;
