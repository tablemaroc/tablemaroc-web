# Orden: revisar PWA y conectividad móvil

## Objetivo

Verificar que Tablemaroc funciona correctamente en dispositivos móviles bajo condiciones de red variables en Marruecos.

## Antes de empezar

- Lee `docs/10-politica-pwa-conectividad.md`.
- Lee el Documento Maestro y la orden de rendimiento disponible en el proyecto.
- No cambies estrategias de caché ni Service Worker sin aprobación cuando la implementación actual no coincida con esta política.

## Pasos

1. Comprobar el Service Worker.
2. Verificar estrategia Cache-First para iconos, CSS críticos, fuentes y la página principal de guías gastronómicas.
3. Verificar estrategia Network-First para fichas de restaurantes y menús digitales.
4. Comprobar el fallback a los últimos datos almacenados en `IndexedDB` cuando no hay red.
   - Comprobar el límite de **20** fichas/páginas y la política LRU (al superarse, se elimina la menos recientemente usada).
   - Comprobar que las cachés llevan versión y que al activar una versión nueva se limpian las cachés y copias de versiones anteriores, y que existe un mecanismo de actualización (`SKIP_WAITING`).
5. Revisar que las fotografías utilicen WebP/AVIF y `lazy-loading`.
6. Probar escenarios de conectividad variable/offline.
7. Registrar discrepancias, impacto y propuesta de corrección.
8. No publicar cambios sin la aprobación correspondiente.

## Entregable

Informe en `resultados/` con pruebas realizadas, comportamiento observado, discrepancias, impacto y acciones propuestas.
