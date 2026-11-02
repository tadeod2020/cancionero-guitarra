# Project: Cancionero de Guitarra (iPhone Safari PWA)

## Vision
Una Progressive Web App (PWA) diseñada específicamente para iPhone (Safari "Agregar a pantalla de inicio"), rápida, 100% offline y táctil, para guardar y consultar el repertorio personal de canciones en guitarra, sus acordes por secciones, letra cifrada opcional, qué tan dominada está cada canción y si ya está lista para cantarla o todavía no.

## Stack & Architecture
- **Frontend**: HTML5 semántico (`<dialog>`, `<form>`, `<button>`, `<article>`), CSS moderno (Design Tokens, `@container`, `:has()`, `env(safe-area-inset-*)`, `color-scheme: dark light`), y JavaScript ES Modules sin dependencias pesadas.
- **PWA / iOS Safari**: `manifest.webmanifest`, `sw.js` (Service Worker cache-first para uso 100% offline), iconos PNG nativos (`180x180` Apple Touch Icon, `192x192`, `512x512`), `viewport-fit=cover`, inputs con `font-size >= 16px` (evita el auto-zoom de Safari en iOS), y Wake Lock API para mantener la pantalla encendida al tocar.
- **Persistencia**: `localStorage` con validación defensiva de esquema + exportación/importación de copia de seguridad en JSON.
- **Testing**: Pruebas unitarias automatizadas con `node --test` para la lógica de dominio, transposición de acordes, parseo de cifrado/secciones, filtrado y persistencia.

## Non-Goals
- No requiere cuentas, login ni servidores externos.
- Sin dependencias externas ni CDNs que fallen sin conexión.
