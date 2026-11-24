-- Platform user administration; explicit bootstrap is separate.
-- No existing roles are promoted automatically. No health data is queried.
begin;
create table if not exists public.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public,anon,authenticated;
create table if not exists public.platform_modules (
 module_key text primary key,
 title text not null,
 enabled boolean not null default true
);
alter table public.platform_modules enable row level security;
revoke all on public.platform_modules from public,anon,authenticated;
insert into public.platform_modules(module_key,title) values ('ford-pilot','Ford Uygulamaları')
on conflict(module_key) do nothing;
create table if not exists public.platform_role_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null,
 target_id uuid not null,
 module_key text not null,
 old_role text,
 new_role text,
 occurred_at timestamptz not null default now()
);
alter table public.platform_role_audit enable row level security;
revoke all on public.platform_role_audit from public,anon,authenticated;
create or replace function public.platform_is_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_admins where user_id=auth.uid());
$$;
create or replace function public.platform_list_modules()
returns table(module_key text,title text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.platform_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
 return query select m.module_key,m.title from public.platform_modules m where m.enabled order by m.title;
end $$;
create or replace function public.platform_list_users(p_search text default '',p_offset integer default 0)
returns table(user_id uuid,display_name text,email text,joined_at timestamptz,module_roles jsonb,is_platform_admin boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.platform_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 or p_offset>100000 or length(coalesce(p_search,''))>150 then raise exception 'invalid_query'; end if;
 return query
 select u.id,
 left(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),'İsim tanımlı değil'),150),
 u.email::text,u.created_at,
 coalesce((select jsonb_object_agg(m.module_key,m.role) from public.work_module_members m where m.user_id=u.id),'{}'::jsonb),
 exists(select 1 from public.platform_admins a where a.user_id=u.id)
 from auth.users u
 where coalesce(u.is_anonymous,false)=false
 and (coalesce(p_search,'')='' or strpos(lower(coalesce(u.email,'')),lower(p_search))>0
 or strpos(lower(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','')),lower(p_search))>0)
 order by u.created_at desc,u.id limit 50 offset p_offset;
end $$;
create or replace function public.platform_set_module_role(p_user_id uuid,p_module_key text,p_role text)
returns boolean language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not public.platform_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_user_id is null or not exists(select 1 from auth.users u where u.id=p_user_id and not coalesce(u.is_anonymous,false)) then raise exception 'invalid_user'; end if;
 if not exists(select 1 from public.platform_modules m where m.module_key=p_module_key and m.enabled) then raise exception 'invalid_module'; end if;
 if p_role is not null and p_role not in ('operator','reviewer','admin') then raise exception 'invalid_role'; end if;
 -- Serialize changes per user/module, including the case when no membership exists.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text||':'||p_module_key,0));
 select m.role into previous from public.work_module_members m where m.user_id=p_user_id and m.module_key=p_module_key;
 if previous is not distinct from p_role then return false; end if;
 if p_role is null then
   delete from public.work_module_members where user_id=p_user_id and module_key=p_module_key;
 else
   insert into public.work_module_members(user_id,module_key,role) values(p_user_id,p_module_key,p_role)
   on conflict(user_id,module_key) do update set role=excluded.role;
 end if;
 insert into public.platform_role_audit(actor_id,target_id,module_key,old_role,new_role)
 values(auth.uid(),p_user_id,p_module_key,previous,p_role);
 return true;
end $$;
create or replace function public.platform_role_history()
returns table(occurred_at timestamptz,actor_email text,target_email text,module_key text,old_role text,new_role text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.platform_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
 return query select l.occurred_at,a.email::text,t.email::text,l.module_key,l.old_role,l.new_role
 from public.platform_role_audit l left join auth.users a on a.id=l.actor_id left join auth.users t on t.id=l.target_id
 order by l.id desc limit 100;
end $$;
revoke all on function public.platform_is_admin(),public.platform_list_modules(),public.platform_list_users(text,integer),public.platform_set_module_role(uuid,text,text),public.platform_role_history() from public,anon,authenticated;
grant execute on function public.platform_is_admin(),public.platform_list_modules(),public.platform_list_users(text,integer),public.platform_set_module_role(uuid,text,text),public.platform_role_history() to authenticated;
commit;
