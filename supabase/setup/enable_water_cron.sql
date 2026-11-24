-- Run ONLY after deploying updated izkarwell-push Edge Function.
-- Named cron.schedule replaces existing job of the same name.
select cron.schedule(
  'izkarwell-water-reminders-v1',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://dfexhuqdbcrjfhscmqjy.supabase.co/functions/v1/izkarwell-push',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-izkarwell-cron', (select decrypted_secret from vault.decrypted_secrets
        where name='izkarwell_water_cron_v1' limit 1)
    ),
    body := '{"action":"scheduled-water"}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (
    select 1 from public.push_devices
    where enabled and water_enabled and next_due_at <= now()
  );
  $job$
);
select jobid, jobname, schedule, active
from cron.job where jobname='izkarwell-water-reminders-v1';
