-- Read only creator identities for Ford records the reviewer/admin may access.
begin;
create or replace function public.ford_pilot_report_creators(p_record_ids uuid[])
returns table(record_id uuid, creator_name text, creator_email text)
language plpgsql stable security definer set search_path='' as $$
declare v_role text;
begin
 select m.role into v_role from public.work_module_members m
 where m.user_id=auth.uid() and m.module_key='ford-pilot';
 if v_role is null or v_role not in ('admin','reviewer') then
   raise exception 'not_authorized' using errcode='42501';
 end if;
 if coalesce(cardinality(p_record_ids),0)>250 then raise exception 'batch_too_large'; end if;
 return query
 select r.id,
 left(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),'İsim tanımlı değil'),150),
 u.email::text
 from public.ford_pilot_records r
 join auth.users u on u.id=r.created_by
 where r.id=any(p_record_ids) and (v_role='admin' or r.archived_at is null);
end $$;
revoke all on function public.ford_pilot_report_creators(uuid[]) from public,anon,authenticated;
grant execute on function public.ford_pilot_report_creators(uuid[]) to authenticated;
commit;
