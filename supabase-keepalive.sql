-- Run once in the Supabase SQL Editor.
-- This function is called by the scheduled keepalive script.
create or replace function public.keepalive_ping()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'timestamp', now()
  );
$$;

grant execute on function public.keepalive_ping() to anon, authenticated, service_role;
