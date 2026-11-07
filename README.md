# agenda

Agenda de Medicina instalable en el móvil: vistas de día, semana (desde el lunes) y mes, tareas organizadas y abiertas por asignatura, y una pestaña Personal.

## Estructura

- `app/`: la aplicación (HTML, manifiesto, service worker e iconos). Es lo único que se publica en internet.
- `netlify.toml`: indica a Netlify que publique solo `app/`.
- `supabase/migrations/`: SQL de las tablas `tareas` y `notas` y de la tarea programada.
- `supabase/functions/tareas/`: función que lee y escribe las tareas y las notas.

## Cómo funcionan los datos

Las tareas están en el proyecto **Agenda** de Supabase (tabla `tareas`). La tabla no tiene acceso público: solo la función `tareas` puede leerla y escribirla, y solo responde si recibe la clave de acceso (secreto `AGENDA_CLAVE` de la función).

- La app pide la clave la primera vez y la guarda solo en ese dispositivo.
- Los cambios se aplican al momento en pantalla y se envían en cuanto hay conexión. Sin conexión, la app abre con la última copia y guarda los cambios pendientes.
- La app se sincroniza al abrirla, al volver a ella y cada 30 segundos.
- Las tareas añadidas desde el chat con Claude se escriben en la misma tabla, así que aparecen en el móvil en la siguiente sincronización.
- Cada hora, una tarea programada de Supabase (`arrastrar_pendientes`) pasa al día vigente las tareas abiertas y personales con fecha que quedaron sin hacer. El día cambia a las 3:00 (hora de Madrid). Las tareas organizadas (clases, seminarios) no se mueven.
- La pestaña **Exámenes** tiene dos apartados: **Notas** y **Calendario**. Un examen programado (fecha, hora, asignatura, porcentaje y temas) es una fila de la tabla `notas` con fecha; mientras no llega su fecha está en el Calendario y, al pasar, la app lo muestra en Notas como pendiente de calificación (no hace falta ninguna tarea programada: se calcula en la app). Los exámenes con fecha también salen en la agenda de la universidad (día, semana y mes), a su hora o en «Todo el día» si no la tienen; son solo una vista de la misma fila de `notas`, no tareas duplicadas.
- Las tareas organizadas ya no tienen «tipo» (clase, seminario…); si no llevan título se usa el nombre de la asignatura.
- Notas: guarda calificaciones por asignatura con su porcentaje en la nota final. Un examen ya hecho pero sin calificación se guarda como nota pendiente (nota vacía) y se pinta con otro color en la barra. Las notas están en la tabla `notas` de Supabase y se sincronizan igual que las tareas (copia local, cola de cambios pendientes). La función `tareas` atiende también las operaciones `notas_list`, `notas_upsert` y `notas_delete`.

## Publicar

1. En Netlify, importar este repositorio. No hace falta comando de compilación; la carpeta de publicación sale de `netlify.toml`.
2. En el móvil, abrir la dirección y usar "Añadir a pantalla de inicio" (iPhone, desde Compartir en Safari) o "Instalar app" (Android, desde el menú de Chrome).

## Cambiar la clave

En el panel de Supabase: Edge Functions, Secrets, `AGENDA_CLAVE`. La clave no debe empezar ni acabar con espacios. Después hay que volver a escribirla en cada dispositivo.
