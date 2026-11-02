# Ajustes técnicos del 29-10-2026

Decisiones del titular (paquete `tablemaroc-ajustes-tecnicos-2026-10-29`). **Tienen prioridad** sobre cualquier especificación anterior
que contemplase moneda dual o carga inmediata del mapa (ver `09-matriz-de-autoridad.md`).

| # | Decisión | Dónde se refleja |
|---|---|---|
| 1 | IndexedDB: máximo **20** fichas/páginas, política **LRU** | `10-politica-pwa-conectividad.md`, `public/sw.js` |
| 2 | Service Worker con cachés **versionadas**, actualización y limpieza de versiones antiguas | `10`, `public/sw.js`, `RegisterServiceWorker.tsx` |
| 3 | El mapa interactivo se carga **solo al llegar visualmente** a su sección (`IntersectionObserver`); ni SDK ni componentes pesados en el render inicial | `11-protocolo-fallback-mapas.md`, `MapFallback.tsx`, `useNearViewport.ts` |
| 4 | El placeholder del mapa **reserva su espacio** (sin CLS) | `11`, `MapFallback.tsx` |
| 5 | El timeout de **3000 ms** empieza **después** de iniciar la carga del mapa | `11`, `MapFallback.tsx` |
| 6 | Precios **exclusivamente en MAD** | `12-especificacion-precios-mad.md`, `codigo/shared/price.ts` |
| 7 | Eliminada toda conversión EUR/USD u otra: tipos de cambio, selectores, precios aproximados | código, docs y órdenes (`revisar-precios-mad`) |
| 8 | Sin campo genérico de moneda en `menu_items`: solo `price_mad` | `07-cambios-propuestos/modelo-de-datos-v2.md`, `codigo/database/migrations/propuesta-v2/0006_menus.sql` |
| 9 | Sin código muerto de conversión | `money.ts` y su prueba eliminados; sustituidos por `price.ts` |

Interpretaciones al aplicarlas: sin `IntersectionObserver` el mapa nunca se carga (fallback estático); la dirección, indicaciones y enlaces
se muestran siempre bajo el mapa para que el cambio de estado no desplace el contenido; la `VERSION` del Service Worker debe subirse en cada despliegue.
