# Orden: escribir, editar, generar y subir contenido (sin eliminar)

## Objetivo
Gestionar el contenido de Tablemaroc (lugares, platos, guías, ciudades, barrios y traducciones) de forma ordenada y segura.

## Antes de empezar
- Lee `reglas-generales.md` y `docs/modelo-de-datos.md`.
- Pregunta qué acción se pide (crear, editar, generar o subir), qué contenido y en qué idioma.

## Crear o generar
1. Usa la información que aporta el titular. No inventes datos.
2. Aplica la orden `generar-textos` y después `anti-duplicidad-y-google`.
3. Guarda el contenido con estado "borrador" y la traducción como "borrador".
4. Comprueba las reglas del Quality Gate y di cuáles no cumple.

## Editar
1. Muestra el contenido actual y los cambios propuestos (antes y después).
2. Mantén la coherencia entre idiomas: si cambias un dato factual (horario, dirección), indica qué traducciones deben actualizarse.
3. Actualiza la fecha de última verificación solo si el dato se ha comprobado.
4. Si cambia la URL, crea una redirección permanente (301) desde la antigua y actualiza enlaces internos y sitemaps.

## Eliminar: NO se hace
- Claude Code nunca elimina, archiva ni despublica contenido, páginas ni URLs. Eliminar puede perjudicar a la web.
- Si detecta contenido flojo, duplicado u obsoleto, propone mejorarlo y explica el motivo en el informe. Decide siempre el titular.
- Las reseñas siguen la política de moderación (aprobar o rechazar al recibirlas); nunca se retiran por conveniencia comercial.

## Subir y publicar
- Claude Code sube el contenido creado a la web (base de datos o panel de administración) en estado "borrador". No es visible al público.
- Cuando el titular lo aprueba (puede hacerlo en lote, varios a la vez), pasa a "publicada" y se hace visible. Después, comprueba que aparece en el sitemap si es indexable.

## Entregable
Registro de cambios en `resultados/`: qué se creó, editó o archivó, en qué idiomas, qué redirecciones se añadieron y qué queda pendiente de aprobación.

## Aprobación
Publicar y cambiar URLs requiere siempre la aprobación del titular. Eliminar no se hace.
