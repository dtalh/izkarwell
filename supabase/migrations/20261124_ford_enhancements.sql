-- Additive Ford pilot improvement. No existing records or photos are deleted.
begin;
alter table public.ford_pilot_records add column if not exists incomplete_note text not null default '';
alter table public.ford_pilot_records add column if not exists revision bigint not null default 0;
create table if not exists public.ford_pilot_edit_log(
 id bigint generated always as identity primary key,
 record_id uuid not null references public.ford_pilot_records(id),
 actor_id uuid not null,
 before_values jsonb not null,
 after_values jsonb not null,
 occurred_at timestamptz not null default now()
);
alter table public.ford_pilot_edit_log enable row level security;
revoke all on public.ford_pilot_edit_log from public,anon,authenticated;
grant select on public.ford_pilot_edit_log to authenticated;
drop policy if exists ford_pilot_edit_log_read on public.ford_pilot_edit_log;
create policy ford_pilot_edit_log_read on public.ford_pilot_edit_log for select to authenticated using (
 exists(select 1 from public.ford_pilot_records r where r.id=record_id)
);
-- Authorized users get only a boolean for possible duplicates, not other operators' details.
create or replace function public.ford_pilot_duplicate(p_name text,p_date date,p_exclude uuid default null)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot' and m.role in ('operator','admin')) then
  raise exception 'not_authorized' using errcode='42501';
 end if;
 if p_name is null or length(p_name)>120 or p_name not like 'TEST %' or p_date is null then raise exception 'invalid_test_record'; end if;
 return exists(select 1 from public.ford_pilot_records r where r.archived_at is null
  and (p_exclude is null or r.id<>p_exclude) and r.delivery_date=p_date
  and lower(translate(regexp_replace(trim(r.customer_name),'\s+',' ','g'),'Iİ','ıi'))=lower(translate(regexp_replace(trim(p_name),'\s+',' ','g'),'Iİ','ıi')));
end $$;
create or replace function public.ford_pilot_begin_v2(p_id uuid,p_name text,p_date date,p_account boolean,p_ford boolean,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if p_note is null or length(p_note)>500 then raise exception 'invalid_note'; end if;
 perform public.ford_pilot_begin(p_id,p_name,p_date,p_account,p_ford);
 update public.ford_pilot_records set incomplete_note=trim(p_note)
 where id=p_id and created_by=auth.uid() and status='draft' and archived_at is null;
 return p_id;
end $$;
-- Completed records can receive a first photo for a previously incomplete app.
-- No UPDATE/DELETE object policy; existing evidence is never overwritten.
drop policy if exists ford_pilot_edit_upload on storage.objects;
create policy ford_pilot_edit_upload on storage.objects for insert to authenticated with check (
 bucket_id='ford-pilot-private' and exists(
 select 1 from public.ford_pilot_records r join public.work_module_members m
 on m.user_id=auth.uid() and m.module_key='ford-pilot'
 where r.status='complete' and r.archived_at is null
 and (m.role='admin' or (m.role='operator' and r.created_by=auth.uid()))
 and (name=r.id::text||'/account.jpg' or name=r.id::text||'/ford.jpg'))
);
create or replace function public.ford_pilot_edit(p_id uuid,p_revision bigint,p_name text,p_date date,p_account boolean,p_ford boolean,p_note text)
returns bigint language plpgsql security definer set search_path='' as $$
declare r public.ford_pilot_records%rowtype; v_role text; changed bigint; old_values jsonb; new_values jsonb;
begin
 select m.role into v_role from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot';
 if v_role is null or v_role not in ('operator','admin') then raise exception 'not_authorized' using errcode='42501'; end if;
 select * into r from public.ford_pilot_records where id=p_id and archived_at is null and status='complete' for update;
 if not found or (v_role='operator' and r.created_by<>auth.uid()) then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_revision is distinct from r.revision then raise exception 'record_changed' using errcode='40001'; end if;
 if p_name is null or p_name not like 'TEST %' or length(trim(p_name)) not between 3 and 120 or p_date is null or p_account is null or p_ford is null or p_note is null or length(p_note)>500 then raise exception 'invalid_test_record'; end if;
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
create or replace function public.ford_pilot_edit_history(p_id uuid)
returns table(occurred_at timestamptz,actor_name text,actor_email text,before_values jsonb,after_values jsonb)
language plpgsql stable security definer set search_path='' as $$
declare v_role text;
begin
 select m.role into v_role from public.work_module_members m where m.user_id=auth.uid() and m.module_key='ford-pilot';
 if v_role is null or not exists(select 1 from public.ford_pilot_records r where r.id=p_id and (v_role='admin' or (r.archived_at is null and (v_role='reviewer' or r.created_by=auth.uid())))) then raise exception 'not_authorized' using errcode='42501'; end if;
 return query select l.occurred_at,left(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','İsim tanımlı değil'),150),u.email::text,l.before_values,l.after_values
 from public.ford_pilot_edit_log l left join auth.users u on u.id=l.actor_id where l.record_id=p_id order by l.id desc limit 100;
end $$;
revoke all on function public.ford_pilot_duplicate(text,date,uuid),public.ford_pilot_begin_v2(uuid,text,date,boolean,boolean,text),public.ford_pilot_edit(uuid,bigint,text,date,boolean,boolean,text),public.ford_pilot_edit_history(uuid) from public,anon,authenticated;
grant execute on function public.ford_pilot_duplicate(text,date,uuid),public.ford_pilot_begin_v2(uuid,text,date,boolean,boolean,text),public.ford_pilot_edit(uuid,bigint,text,date,boolean,boolean,text),public.ford_pilot_edit_history(uuid) to authenticated;
commit;
