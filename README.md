# Ventana Pomodoro

Un temporizador Pomodoro tranquilo, instalable y sin cuenta. Incluye ambientes visuales, música local, tareas con seguimiento de sesiones y una ventana flotante.

## Empezar

Requiere Node.js 22.12 o posterior.

```sh
npm install
npm run dev
```

Abre la dirección local que muestra Astro, normalmente `http://localhost:4321`.

## Personalizar

- **Fondos:** añade cada ambiente en `public/scenes/<id>/background.webp` y registra su identificador en tres sitios: la lista de `src/components/WindowPanel.astro` (con su nombre), `sceneIds` en `src/scripts/pomodoro.js` y una regla `.scene-layer[data-scene="<id>"]` en `src/styles/global.css`. La cinta de ambientes se desliza de lado cuando hay más de cinco. `animated: true` en la lista solo pone la marca de play en la miniatura; la reproducción de video aún no está implementada.
- **Música:** abre **Banda sonora** en la app y añade archivos de audio desde tu dispositivo. Se guardan en el almacenamiento local del navegador.
- **Tareas:** activa Cuaderno desde Extensiones. Las tareas se conservan entre días y cada bloque de enfoque completado suma al contador de la tarea activa.

## Fin de ronda

Al terminar el foco o el descanso, el reloj se detiene y aparece una tarjeta que espera tu respuesta. Para que no se pase de largo suena un acorde (se repite suave hasta 3 veces), el título de la pestaña parpadea y llega una notificación del sistema si aceptaste el permiso. En Ajustes puedes activar **Iniciar rondas solas** o apagar la notificación; la alarma se elige o se apaga en **Alarma**.

## Compilar

```sh
npm run build
npm run preview
```

Los datos de tareas, ajustes y música permanecen en el navegador del usuario. La app no requiere inicio de sesión.
