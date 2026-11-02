# Roadmap

## Phase 1: Dominio, Transposición de Acordes y Almacenamiento Seguro
- Implementar módulo `src/domain.js` con modelo de datos, validación defensiva, transposición musical de acordes (notación inglesa `C, D, E...` y latina opcional, acordes menores, 7, maj7, sus4, slash chords `G/B`), parseo de secciones y letra con acordes, y filtros de repertorio.
- Implementar `src/storage.js` para persistencia en `localStorage`, datos semilla iniciales y exportación/importación JSON segura.
- Crear suite de pruebas unitarias `tests/domain.test.js` con `node --test`.

## Phase 2: Interfaz Mobile-First para iPhone Safari y Accesibilidad WCAG AA
- Construir `index.html`, `styles.css` y `src/app.js` siguiendo las guías de `modern-web-guidance` (`<dialog>` nativo con `overscroll-behavior: contain`, botones semánticos, labels explícitos, targets táctiles >= 44x44px, `font-size >= 16px` en inputs, `env(safe-area-inset-*)`, soporte de modo oscuro/claro estilo estudio cálido).
- Implementar vistas:
  1. Lista de repertorio con contadores, buscador, filtros por cuánto me la sé y si está lista para cantar.
  2. Vista de canción ("Modo Tocar") con progresión por secciones, letra cifrada, transposición `+ / -`, y cambio rápido de nivel de dominio y estado de canto.
  3. Modal nativo `<dialog>` para crear/editar canción con constructor intuitivo de secciones de acordes y letra opcional.
  4. Modal nativo `<dialog>` de respaldo (Exportar/Importar JSON) e instrucciones de instalación en Safari de iPhone.

## Phase 3: Empaquetado PWA Offline y Verificación Integral
- Generar iconos PNG reales (`icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`), `manifest.webmanifest` y `sw.js`.
- Ejecutar pruebas unitarias (`node --test`) y levantar servidor HTTP local para verificar el funcionamiento end-to-end.
