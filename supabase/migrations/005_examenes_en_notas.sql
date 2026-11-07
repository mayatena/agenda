-- Un examen programado es una nota con fecha: se ve en el Calendario mientras no llega su fecha
-- y, al pasar, la app lo muestra en Notas como pendiente de calificación.
alter table public.notas
  add column date date,
  add column start_time text not null default '',
  add column topics text not null default '';

create index notas_date_idx on public.notas (date);
