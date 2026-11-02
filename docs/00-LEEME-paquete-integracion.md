# Tablemaroc — paquete documental de congelación

**Fecha:** 29-10-2026  
**Estado:** candidato a congelación; requiere aprobación final del titular.

## Objetivo

Este paquete reúne las reglas, decisiones, órdenes, plantillas y propuestas necesarias
para dejar una base documental única antes de continuar el desarrollo.

Integrado en el repositorio `tablemaroc.com` el 29-10-2026. El código que acompaña a las
especificaciones 10, 11 y 12 es un andamiaje inicial (ver `docs/13-codigo-integrado.md`);
no es código de aplicación completo.

## Autoridad

1. `01-documento-maestro-operacion.md` es la fuente operativa principal.
2. `09-matriz-de-autoridad.md` resuelve qué documento manda por tema.
3. Una propuesta de `07-cambios-propuestos/` no sustituye el modelo aprobado hasta que
   el titular la apruebe.
4. Si existe conflicto no resuelto, Claude Code no ejecuta la parte conflictiva.

## Decisiones consolidadas

- País/mercado: Marruecos.
- Idiomas: español (`es`), inglés (`en`) y francés (`fr`).
- Árabe eliminado del producto: sin `/ar/`, sin `hreflang ar`, sin RTL.
- Cada idioma se publica/indexa solo cuando su traducción está realmente preparada.
- Menú digital: MVP.
- Reservas: Fase 1.5 opcional mediante solicitud simple; Fase 2 con integración real.
- Quality Gate por entidad e idioma.
- Auditoría de cambios.
- Backups sin secretos reales.
- Claude Code no elimina, archiva ni despublica por iniciativa propia.
- Publicación siempre bajo aprobación del titular.

## Qué NO se debe interpretar como cerrado

Los elementos de `07-cambios-propuestos/` siguen siendo propuestas hasta su aprobación.
Entre ellos: detalles finales del modelo de datos, proveedor SMS, reservas Fase 2,
recetas, analítica/cookies y hoja de carga inicial.

## Regla de fuentes

No se atribuyen a Claude Code, ChatGPT, Google u otra fuente conclusiones que no estén
respaldadas por el material disponible.

## Comprobación antes de congelar

- [ ] El titular aprueba el documento maestro.
- [ ] El titular aprueba la matriz de autoridad.
- [ ] El titular confirma es/en/fr.
- [ ] El titular confirma menú MVP.
- [ ] El titular decide Fase 1.5 de reservas.
- [ ] El titular decide los pendientes de alta prioridad.
- [ ] Se revisa que no haya secretos en el paquete.
- [ ] Se conserva el ZIP y su SHA-256.

## Documentos técnicos integrados

Se incorporan al paquete:

- `10-politica-pwa-conectividad.md`
- `11-protocolo-fallback-mapas.md`
- `12-especificacion-precios-mad.md`

Y sus órdenes operativas correspondientes en `05-ordenes-nuevas/`.
