# Prompts para Claude Design: pantallas de la web de Tablemaroc

**Fecha:** 06-11-2026 · Decisión del titular: el aspecto de la web lo hace **Claude Design** (maestro §19) y lo aprueba el titular.
**Base:** `docs/16-encargo-claude-design.md` (el encargo completo) y los bocetos de `diseno/`.

Las pantallas se piden **por fases**: primero el estilo (fase 1), que el titular aprueba; después el resto con ese estilo.
Así, si el estilo no convence, solo se rehace una fase. El panel va aparte, después de la web (fases 5 y 6).

---

## Cómo usarlo (titular)

1. Abre **Claude Design** en claude.ai y crea un proyecto nuevo llamado **Tablemaroc · web**.
2. **Adjunta** al proyecto:
   - `docs/16-encargo-claude-design.md` (el encargo);
   - los bocetos de la fase que vayas a pedir (carpetas de `diseno/`, imágenes de `movil/` y `ordenador/`).
3. **Pega el prompt de la fase** (los bloques de abajo, en orden). Empieza por el **prompt inicial** y la **fase 1**.
4. Revisa lo que proponga. Pide cambios en la misma conversación hasta que te guste.
5. Cuando apruebes una fase, **exporta** el resultado (HTML/CSS o «enviar a Claude Code») y dámelo: lo conecto con lo que
   ya funciona por debajo (datos, acceso, reservas, reseñas, sin conexión…).
6. Pasa a la fase siguiente **en la misma conversación**, para que mantenga el estilo aprobado.

---

## Prompt inicial (pégalo una vez, al empezar)

```
Vas a diseñar la web de Tablemaroc, una guía de restaurantes, cafés y teterías, comida callejera y mercados de Marruecos
para turistas europeos. Te adjunto el encargo completo (16-encargo-claude-design.md) y los bocetos de estructura en gris.

Reglas que mandan sobre todo lo demás:
- El encargo adjunto es la fuente de autoridad. Su apartado «5 bis» recoge decisiones posteriores a los bocetos: donde un
  boceto no las muestre, manda el 5 bis.
- Los bocetos fijan la ESTRUCTURA y el CONTENIDO de cada pantalla. Tú defines el ASPECTO (colores, tipografía, logo,
  iconos, espaciado). No añadas ni quites funciones, campos, filtros ni pantallas.
- Idiomas: español (base), inglés y francés. Diseña en español; el francés ocupa un 20–30 % más: deja margen.
- Prohibido: alcohol (ni dato, ni filtro, ni icono), barrios o zonas, anuncios o «patrocinado», precios en euros (solo
  MAD; el rango de precio con puntos ●●○○), la palabra «ficha» (se dice «info del local»), la etiqueta «Agotado»,
  aviso de cookies (no hace falta), carruseles automáticos y vídeos.
- Mobile-first: móvil de 390 px de ancho y ordenador de 1280 px. Una sola pantalla por plantilla: lo que no cabe va en
  pestañas o secciones plegables, y en ordenador se aprovechan las columnas.
- Uso real: turista en la medina, al sol, con una mano y mala cobertura. Contraste alto (mínimo WCAG AA), áreas táctiles
  de al menos 44 × 44 px, nada que dependa del color solo.

Formato de entrega (lo programará Claude Code con Astro, casi sin JavaScript):
- HTML semántico y CSS, sin frameworks de CSS ni de JavaScript. Pestañas y plegables solo con HTML y CSS
  (por ejemplo <details> o radio + :checked). Los elementos interactivos (Reservar, ♡ Favoritos, Escribir reseña,
  acceso, «Ver mapa», «Abierto ahora», buscador con filtros) se marcan como «isla» y se dibujan, pero sin lógica.
- Variables CSS (design tokens) para colores, tipografía, espaciado, radios y sombras, con modo claro (y oscuro si lo
  propones). Menos de 60 KB de HTML + CSS por página, sin contar fotos.
- Nada externo: sin fuentes de Google ni CDN. Como mucho UNA fuente web (woff2, que alojaremos nosotros); el resto,
  fuentes del sistema. Iconos en SVG en línea. Fotos con tamaño reservado (sin saltos al cargar) y texto alternativo.

Trabajaremos por fases. Ahora no diseñes nada: confirma que lo has entendido y espera a la fase 1.
```

---

## Fase 1: estilo, componentes, esqueleto y Home (para aprobar)

Adjunta: `diseno/web-esqueleto` y `diseno/web-01-home`.

```
FASE 1. Propón el sistema visual de Tablemaroc y aplícalo a la portada:

1. Sistema visual: paleta (con modo claro y, si lo ves, oscuro), tipografía, escala de espaciado, radios, sombras,
   logo (wordmark «Tablemaroc» y símbolo) e icono de app (192, 512 y versión maskable). Personalidad: auténtica pero
   sobria, de confianza, editorial; que evoque Marruecos sin tópicos (sin arcos, camellos, lámparas ni zellige de cliché).
   El diseño antiguo (arena y terracota, Fraunces y Manrope, logo de estrella) está descartado: propón algo nuevo.
2. Componentes base: botones (principal, secundario, de icono), chips de filtro, tarjeta de local (foto, nombre, tipo,
   ciudad, ●●○○, estrellas y nº de reseñas, «Abierto ahora»), tarjeta de plato y de guía, pestañas, plegable, campo de
   texto, estrellas, insignias de datos rápidos (vegetariano, tarjeta, terraza, idiomas ES·EN·FR), avisos (información,
   cerrado temporalmente, Ramadán, sin conexión, «Hay una versión nueva · Actualizar»).
3. Esqueleto: cabecera (logo, buscador, selector de idioma ES/EN/FR, acceso), pie de página como navegación secundaria
   (ciudades, tipos de lugar, guías, legales; sin «Política de cookies») y barra inferior del móvil
   (Inicio, Buscar, Explorar, Cuenta).
4. Home en móvil y ordenador, siguiendo el boceto.

Entrega cada pieza en móvil (390 px) y ordenador (1280 px). Explica en pocas líneas por qué eliges la paleta y la tipografía.
```

> **Para el titular:** aquí te paras. Revisa el estilo y pide cambios hasta que lo apruebes. Solo entonces sigue con la fase 2.

---

## Fase 2: listado, info del local y menú (el corazón de la web)

Adjunta: `diseno/web-02-listado`, `diseno/web-03-info-del-local` y `diseno/web-04-menu`.

```
FASE 2. Con el estilo aprobado en la fase 1, diseña:

1. Listado único (sirve para ciudad, ciudad + tipo, tipos de lugar, guías, platos y resultados de búsqueda): título,
   introducción, filtros (tipo, ciudad, vegetariano, pago con tarjeta, terraza, abierto ahora), 20 resultados y
   «Ver más». Las 4 pestañas del boceto de búsqueda (Todo, Locales, Platos, Guías). Estado «sin resultados».
2. Info del local, con su parte de arriba (foto de la entrada, nombre, nota y nº de reseñas, ♡ guardar, estado de
   apertura, botones Reservar · Cómo llegar · Llamar, datos rápidos) y las pestañas Info · Menú · Reseñas · Mapa.
   - Estados de «Abierto ahora»: Abierto · Cerrado · Sin horario · «Horario de Ramadán: consultar» · Cerrado
     temporalmente · Cerrado definitivamente (con «Alternativas cercanas» y sin Reservar).
   - Datos sin verificar se muestran como «pendiente», nunca inventados.
   - Pestaña Reseñas: media de estrellas, reseñas con nombre visible, fecha de visita, tipo de viaje, fotos del autor
     y la «Respuesta del local» debajo; botón «Escribir reseña».
   - Pestaña Mapa: imagen estática, botón «Ver mapa» (mapa interactivo solo al pulsar, crédito «© OpenStreetMap»),
     dirección e indicaciones en texto y «Cómo llegar».
   - Bloque «Cerca de aquí» y enlace discreto «¿Es tu local?».
   - Variante para comida callejera y mercados (se ocultan los bloques que no aplican, p. ej. Menú o Reservar).
3. Menú: categorías plegables, precio en MAD, «Precio pendiente» cuando no esté verificado, alérgenos solo si
   existen, fecha de verificación. Sin platos agotados ni etiqueta «Agotado».

Cada pantalla y cada pestaña en móvil y ordenador.
```

---

## Fase 3: plato típico, guía, escribir reseña y reserva

Adjunta: `diseno/web-05-plato-tipico`, `diseno/web-06-guia`, `diseno/web-08-escribir-resena` y `diseno/web-12-reserva`.

```
FASE 3. Con el mismo estilo, diseña:

1. Plato típico: pestañas «Dónde comerlo» (locales que lo sirven) y «Qué es».
2. Guía: entradilla, autoría declarada y locales en bloques plegables.
3. Escribir reseña: estrellas (1 a 5), texto (hasta 2000 caracteres), fecha de visita, tipo de viaje (pareja, familia,
   amigos, solo), hasta 3 fotos, casilla antispam de Turnstile (reserva unos 300 × 65 px) y «Reseña enviada»
   (explica que se publica tras revisarla). Errores de campo claros.
4. Reserva: formulario (fecha, hora según las franjas del local, número de personas, petición especial opcional,
   «Solicitar reserva», sin pago), «Solicitud enviada» (pendiente de confirmar) y «Reserva confirmada», ambas con el
   botón «Cancelar reserva» y el aviso de que llega un email.

Cada pantalla en móvil y ordenador.
```

---

## Fase 4: acceso, mi cuenta, páginas de texto, errores y reclamar un local

Adjunta: `diseno/login` (la carpeta `usuarios` y su `ENCARGO.md`), `diseno/web-09-mi-cuenta`, `diseno/web-10-pagina-de-texto`
y `diseno/web-11-errores`.

```
FASE 4. Con el mismo estilo, diseña:

1. Acceso sin contraseñas (sigue el ENCARGO.md de la carpeta de login): Entrar (con botón «Crear cuenta»),
   «Continuar con email» (pedir email + casilla de Turnstile → escribir el código de 6 cifras → si no hay cuenta,
   «Crear cuenta»: nombre visible y aceptar condiciones), «Continuar con Google» (elegir cuenta y último paso:
   nombre visible y aceptar) y «Continuar con huella o cara» (siempre con ese texto, nunca «passkey» en la interfaz).
   Sin contraseñas, sin «recuperar contraseña», sin SMS y sin Apple.
2. Mi cuenta, con pestañas Reseñas (estado de cada una, editar, borrar), Reservas (estado y «Cancelar»),
   Favoritos (también sin conexión: nombre, dirección, indicaciones y «Cómo llegar») y Datos (nombre visible,
   «Descargar mis datos», «Borrar mi cuenta» con confirmación, «Salir»).
3. Página de texto (legales, sobre nosotros, cómo funcionan las reseñas, contacto).
4. Errores y estados: 404, 500, sin conexión (es/en/fr) y mantenimiento.
5. Reclamar un local («¿Es tu local?»): elegir la vía de verificación (email del dominio del local, teléfono público del
   local, visita al local o documento del negocio), nota opcional y «Solicitud enviada».
6. Plantilla de correo (código de acceso y aviso de reserva): sencilla, legible sin imágenes, sin enlaces de seguimiento.

Cada pantalla en móvil y ordenador.
```

---

## Fases 5 y 6: el panel (después de la web)

Se pedirán cuando la web esté aprobada, con el mismo estilo adaptado al panel (`docs/16`, apartado 6, y las carpetas
`diseno/panel-*` y `diseno/login/administrador` y `propietario`). Fase 5: esqueleto, acceso, escritorio con moderación,
listado y formulario del local. Fase 6: fotos, redirecciones, usuarios, auditoría, copias de seguridad (con «Crear copia»
y «Restaurar desde archivo»), ajustes, reservas y empleados.
