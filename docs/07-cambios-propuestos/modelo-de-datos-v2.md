# Modelo de datos v2

**Estado:** APROBADO por el titular el 29-10-2026. Añadidos en la aprobación: relación guía–barrio, perfil automático al registrarse, integridad de traducciones y fechas en el menú. Favoritos: fuera del MVP.

## Idiomas
`es`, `en`, `fr` exclusivamente.

## Entidades nuevas/propuestas
- `auditoria`
- `redirect`
- `foto_traduccion`
- `consent`
- `menu`
- `menu_category`
- `menu_item`
- `menu_traduccion`
- `reserva`
- `reserva_slot`
- `reclamacion_de_negocio`

## Lugar
Además de los campos ya previstos, añadir:

- `verification_status`
- `verified_at`
- `verified_by`
- `verification_source`

Conservar los campos de estado, slug, ciudad/barrio, tipo, precio, coordenadas,
horarios, contacto, redes e `is_indexable`.

## Foto
Registrar origen, licencia, autor, moderación y traducciones de alt mediante
`foto_traduccion`.

## Menú
Menú ligado a lugar; categorías; artículos; precio en MAD (`price_mad`); descripción; alérgenos;
disponibilidad; fotografía; traducciones es/en/fr.

## Reservas
Separar la solicitud de reserva de la disponibilidad/slots para permitir integración
real en Fase 2.

## RLS conceptual
- público: contenido publicado y reseñas aprobadas;
- usuario: solo sus propios datos permitidos;
- administración: moderación y estados;
- auditoría: acceso de servicio;
- secretos: nunca en navegador.

La implementación exacta debe validarse contra el esquema real antes de aplicar migraciones.

## Menú: precios (solo MAD)

Los `menu_items` almacenan el precio en `price_mad`. Tablemaroc usa exclusivamente MAD: no existe campo genérico
de moneda en `menu_items` ni conversiones a otras monedas (`docs/12-especificacion-precios-mad.md`).

## Fichas y mapas

Las fichas de lugares conservan `lat` y `lng` cuando estén disponibles y deben poder
servir de base al fallback de mapas definido por `11-protocolo-fallback-mapas.md`.

## PWA/offline

La política de conectividad se implementa en la capa web/Service Worker e `IndexedDB` (máximo 20 páginas, LRU);
no implica guardar secretos ni datos sensibles en almacenamiento local.
