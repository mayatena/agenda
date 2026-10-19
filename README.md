# agenda

Agenda de Medicina instalable en el móvil: vistas de día, semana (desde el lunes) y mes, tareas organizadas y abiertas por asignatura, y una pestaña Personal.

## Estructura

- `app/`: la aplicación (HTML, manifiesto, service worker e iconos). Es lo único que se publica en internet.
- `netlify.toml`: indica a Netlify que publique solo `app/`.
- `supabase/migrations/`: SQL de la tabla `tareas`.
- `supabase/functions/tareas/`: función que lee y escribe las tareas.

## Cómo funcionan los datos

Las tareas están en el proyecto **Agenda** de Supabase (tabla `tareas`). La tabla no tiene acceso público: solo la función `tareas` puede leerla y escribirla, y solo responde si recibe la clave de acceso (secreto `AGENDA_CLAVE` de la función).

- La app pide la clave la primera vez y la guarda solo en ese dispositivo.
- Los cambios se aplican al momento en pantalla y se envían en cuanto hay conexión. Sin conexión, la app abre con la última copia y guarda los cambios pendientes.
- La app se sincroniza al abrirla, al volver a ella y cada 30 segundos.
- Las tareas añadidas desde el chat con Claude se escriben en la misma tabla, así que aparecen en el móvil en la siguiente sincronización.
- Cada hora, una tarea programada de Supabase (`arrastrar_pendientes`) pasa al día vigente las tareas abiertas y personales con fecha que quedaron sin hacer. El día cambia a las 3:00 (hora de Madrid). Las tareas organizadas (clases, seminarios) no se mueven.

## Publicar

1. En Netlify, importar este repositorio. No hace falta comando de compilación; la carpeta de publicación sale de `netlify.toml`.
2. En el móvil, abrir la dirección y usar "Añadir a pantalla de inicio" (iPhone, desde Compartir en Safari) o "Instalar app" (Android, desde el menú de Chrome).

## Cambiar la clave

En el panel de Supabase: Edge Functions, Secrets, `AGENDA_CLAVE`. La clave no debe empezar ni acabar con espacios. Después hay que volver a escribirla en cada dispositivo.
