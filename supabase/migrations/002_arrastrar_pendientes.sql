create extension if not exists pg_cron;

-- Pasa al "día vigente" las tareas abiertas y personales con fecha que quedaron sin hacer.
-- El día cambia a las 3:00 (Europe/Madrid). Las tareas organizadas (clases, seminarios...) no se mueven.
create or replace function public.arrastrar_pendientes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := ((now() at time zone 'Europe/Madrid') - interval '3 hours')::date;
  n integer;
begin
  update public.tareas
     set date = hoy
   where done = false
     and kind in ('open', 'personal')
     and date is not null
     and date < hoy;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.arrastrar_pendientes() from public, anon, authenticated;

-- Cada hora en punto: es idempotente y evita problemas con el cambio de hora de verano.
select cron.schedule('arrastrar-pendientes', '0 * * * *', 'select public.arrastrar_pendientes()');
