-- izkarwell v1.3 — server-only scheduler authentication
-- Safe to rerun. Does not change health data or enable reminders.
begin;
create extension if not exists supabase_vault with schema vault;
do $$
begin
  if not exists (select 1 from vault.secrets where name='izkarwell_water_cron_v1') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
      'izkarwell_water_cron_v1',
      'Dedicated credential for izkarwell reminder scheduler'
    );
  end if;
end $$;

create or replace function public.izkarwell_check_cron(p_token text)
returns boolean
language sql security definer
set search_path = ''
as $$
  select coalesce(
    length(p_token)=64 and exists (
      select 1 from vault.decrypted_secrets
      where name='izkarwell_water_cron_v1'
        and decrypted_secret=p_token
    ), false
  );
$$;
revoke all on function public.izkarwell_check_cron(text) from public, anon, authenticated;
grant execute on function public.izkarwell_check_cron(text) to service_role;
commit;
