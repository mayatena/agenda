create table public.notas (
  id text primary key,
  subject text not null check (subject ~ '^[a-z]+$'),
  name text not null default 'Nota',
  score numeric(4, 2) not null check (score >= 0 and score <= 10),
  weight numeric(5, 2) not null check (weight > 0 and weight <= 100),
  created bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index notas_subject_idx on public.notas (subject);

-- Igual que la tabla de tareas: seguridad por filas activada y sin políticas.
-- Solo la función con la clave de servicio accede a los datos.
alter table public.notas enable row level security;
revoke all on public.notas from anon, authenticated;

create trigger notas_touch
before update on public.notas
for each row execute function public.touch_updated_at();
