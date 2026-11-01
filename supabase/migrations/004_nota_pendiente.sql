-- Una nota puede estar pendiente: el examen está hecho, pero todavía no se conoce la calificación.
alter table public.notas alter column score drop not null;
