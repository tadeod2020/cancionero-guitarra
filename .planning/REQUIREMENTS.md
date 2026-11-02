# Requirements

## Core Functional Requirements
1. **REQ-01: Gestión de Canciones (CRUD)**
   - Crear, ver, editar y eliminar canciones con validación de campos obligatorios (título de la canción).
   - Campos de cada canción:
     - `title` (nombre de la canción, obligatorio)
     - `artist` (artista/banda, opcional)
     - `mastery` (cuánto me la sé: `learning` = "Aprendiendo", `almost` = "Casi lista", `mastered` = "Dominada")
     - `readyToSing` (booleano: `true` = "Lista para cantar", `false` = "Todavía no")
     - `key` / `capo` / `strumming` (tono, traste de cejilla/capo, rasgueo o notas breves)
     - `sections` (progresión rápida de acordes por secciones, ej. Intro, Verso, Pre-Coro, Coro, Puente, con acordes como `Am - F - C - G`)
     - `lyricsWithChords` (letra con acordes opcional, soporta formato `[Am]Letra` o líneas de acordes sobre letra)

2. **REQ-02: Seguimiento de Dominio y Estado de Canto**
   - Indicadores visuales claros (con texto e ícono, nunca solo color) del nivel de dominio:
     - **Aprendiendo** (en práctica inicial)
     - **Casi lista** (falta pulir cambios o ritmo)
     - **Dominada** (la toco de memoria / fluida)
   - Estado claro de canto:
     - **Lista para cantar** vs **Todavía no**
   - Posibilidad de cambiar rápidamente el nivel de dominio y el switch "¿Lista para cantar?" directamente desde la vista de detalle de la canción y desde la tarjeta.

3. **REQ-03: Visualización de Acordes y Modo Tocar**
   - Vista de canción optimizada para leer mientras se toca la guitarra en el iPhone.
   - Muestra las secciones de acordes en píldoras claras de alto contraste y la letra con acordes alineados.
   - Transposición instantánea de acordes (`-1` / `+1` semitono) tanto en las secciones como en la letra cifrada sin alterar el archivo original a menos que se guarde.
   - Wake Lock activo al abrir una canción para evitar que el iPhone bloquee la pantalla mientras se toca.

4. **REQ-04: Búsqueda, Filtros y Estadísticas de Repertorio**
   - Resumen rápido en cabecera: Total de canciones, cuántas están "Dominadas" y cuántas están "Listas para cantar".
   - Búsqueda instantánea por nombre de canción, artista o acordes.
   - Filtros combinables por nivel (`Todas`, `Aprendiendo`, `Casi lista`, `Dominada`) y por estado de canto (`Todas`, `Listas para cantar`, `Todavía no`).

5. **REQ-05: Almacenamiento 100% Offline, PWA iOS Safari y Respaldo**
   - Guardado automático en `localStorage` con canciones de ejemplo iniciales para explorar el formato.
   - Exportación e importación de respaldo en archivo `.json` con validación de esquema.
   - Instalación nativa en Safari iOS ("Compartir → Agregar a pantalla de inicio") con `manifest.webmanifest`, `apple-touch-icon.png`, `sw.js` offline y guía integrada para instalar en iPhone.
