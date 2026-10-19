create table public.tareas (
  id text primary key,
  kind text not null check (kind in ('org', 'open', 'personal')),
  title text not null,
  date date,
  subject text not null default '',
  color text not null default '',
  type text not null default '',
  start_time text not null default '',
  end_time text not null default '',
  done boolean not null default false,
  created bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index tareas_date_idx on public.tareas (date);

-- Seguridad por filas activada y sin políticas: la clave pública no puede leer ni escribir.
-- Solo la función con la clave de servicio accede a los datos.
alter table public.tareas enable row level security;
revoke all on public.tareas from anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tareas_touch
before update on public.tareas
for each row execute function public.touch_updated_at();
