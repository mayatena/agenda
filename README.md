# agenda

Agenda de Medicina: planificador con vistas de día, semana (desde el lunes) y mes, una pestaña de tareas personales y asignaturas con color.

## Archivos

- `index.html`: la aplicación completa en un solo archivo.
- `TAREAS.md`: tus tareas en texto legible, pensado para verlo desde el móvil en GitHub.
- `tareas.json`: las mismas tareas como datos.
- `scripts/sincronizar_tareas.py`: convierte el volcado de tareas en `tareas.json` y `TAREAS.md`.

## Cómo se mantienen las tareas

La fuente de verdad es la agenda dentro de claude.ai, donde se marcan y editan las tareas. Una tarea programada vuelca esas tareas a este repositorio cada hora y solo hace commit si algo ha cambiado. Por eso `TAREAS.md` puede ir hasta una hora por detrás de lo que ves en la agenda.

Los cambios hechos a mano en `TAREAS.md` o `tareas.json` se sobrescriben en la siguiente sincronización.

Fuera de claude.ai, `index.html` guarda las tareas solo en el navegador donde se abra.
