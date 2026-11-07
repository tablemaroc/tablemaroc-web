# Modelo de datos de Tablemaroc (borrador conceptual)

Documento de planificación: describe entidades, campos y relaciones. No es SQL ni código definitivo.

> Cambios propuestos (menú, reservas, auditoría, consentimientos, verificación, moneda, `foto_traduccion`): `docs/07-cambios-propuestos/modelo-de-datos-v2.md`. Son propuestas hasta que el titular las apruebe. Los umbrales y requisitos vigentes del Quality Gate están en `docs/01-documento-maestro-operacion.md` §4.
Base de datos: PostgreSQL en Supabase. Seguridad con RLS.

## Principios
- Cada entidad en su propia tabla; textos traducibles separados en la tabla de traducciones.
- Nombres en minúsculas y snake_case en base de datos; carpetas del proyecto en kebab-case.
- Los lugares los carga manualmente el titular, que aporta la información. El contenido propio (descripciones, fotos propias, guías, reseñas) es la base del valor de la web. Si más adelante se usa Google Places, solo se guarda el `place_id` y el resto se refresca según sus condiciones.
- Todo dato público lleva estado y fecha de creación y actualización.

## Jerarquía geográfica (alcance nacional)
1. **region**: región administrativa de Marruecos. Campos: id, slug, coordenadas aproximadas.
2. **ciudad**: pertenece a una región. Campos: id, slug, coordenadas, estado de publicación.
3. **barrio**: pertenece a una ciudad. Campos: id, slug, coordenadas, estado.
Se empieza por Tánger y se amplía sin cambiar la estructura.

## Entidades principales

### lugar (establecimiento)
- id, slug, place_id de Google (opcional, solo para enlazar con Google Maps), ciudad, barrio (opcional)
- tipo_de_lugar, rango_de_precio, coordenadas
- horarios, teléfono, web y redes
- estado (borrador, publicado, archivado)
- is_indexable (calculado por el Quality Gate, por idioma)
- fechas de creación y última verificación

### tipo_de_lugar
Restaurante, café o tetería, puesto de comida callejera, mercado o zoco.

### especialidad (etiquetas de cocina)
Ejemplos: marroquí tradicional, rifeña, de mariscos, vegetariana, halal. Relación muchos a muchos con lugar.

### plato
- id, slug, región de origen (opcional)
- ingredientes principales
- relación muchos a muchos con lugar (dónde destaca)

### guia
- id, slug, autoría, estado
- relaciones con lugares, platos, ciudades y barrios

### idioma
es, en, fr. Campos: código, nombre, activo. Todos se escriben de izquierda a derecha; el árabe y el RTL están retirados.

### traduccion
Una fila por entidad e idioma.
- entidad (tipo e id), idioma
- título, descripción, contenido, metadatos SEO
- estado: borrador, revisada, publicada

### usuario y perfil
- Autenticación con Supabase Auth (email, Google, teléfono).
- perfil público: nombre visible, foto, idioma preferido, fecha de alta.

### resena (estilo Google Business)
- id, usuario, lugar, puntuación única de 1 a 5 estrellas, comentario, idioma, fecha de visita
- fotos opcionales asociadas (ver foto)
- el usuario puede editar o borrar su propia reseña
- estado de moderación: pendiente, aprobada, rechazada (con motivo)
- Solo las reseñas aprobadas se muestran públicamente.
- La valoración media del lugar y el número de reseñas se calculan solo con reseñas aprobadas.

### respuesta_de_propietario (a cargo de Claude Code, fase posterior)
- id, reseña, texto, fecha, autor (Tablemaroc en nombre del local, o el propietario si algún día tiene cuenta verificada)
- Las respuestas se publican en nombre del local: el titular confirma que todos los locales de la web han dado su autorización.

### foto
- id, lugar o reseña asociada, usuario, ruta de almacenamiento, texto alternativo
- estado de moderación igual que reseña.

### favorito (opcional en MVP)
usuario y lugar.

### reclamacion_de_negocio (fase 2)
Dueños que verifican su ficha mediante Google Business.

## Relaciones resumidas
- region 1 → n ciudad 1 → n barrio
- ciudad 1 → n lugar; barrio 1 → n lugar
- lugar n ↔ n especialidad; lugar n ↔ n plato; guia n ↔ n lugar
- lugar 1 → n resena y foto; usuario 1 → n resena
- cualquier entidad publicable 1 → n traduccion (una por idioma)

## Quality Gate (`is_indexable`)
Se evalúa por entidad y por idioma. Un lugar es indexable solo si cumple todo:
1. Traducción publicada en ese idioma.
2. Descripción por encima de un mínimo de longitud (umbral por definir).
3. Al menos una foto con texto alternativo.
4. Ubicación válida (coordenadas y ciudad).
5. Enlaces internos entrantes y salientes (barrio, plato o guía).
6. Estado publicado y datos verificados recientemente.
Si falla alguna regla, la página puede existir pero no se indexa (noindex y fuera del sitemap). Las páginas huérfanas quedan marcadas para revisión.

## Seguridad (RLS)
- Lectura pública solo de contenido publicado y reseñas aprobadas.
- Los usuarios editan solo sus propias reseñas y fotos.
- La moderación y los estados los gestiona solo el rol de administración.
- Las claves secretas nunca van al navegador.

## Pendiente de decidir
- Umbrales exactos del Quality Gate.
- Formato de la hoja de cálculo para la carga inicial de lugares (lo indicará el titular el 29-10-2026). El panel de administración es necesario en cualquier caso.
- Inclusión de recetas como entidad.
