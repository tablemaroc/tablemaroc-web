# Documento maestro de Claude Design · Tablemaroc

**Creado:** 06-11-2026 · **Última revisión:** 06-11-2026 · **Dueño:** el titular · **Lo aplica:** Claude.
**Lienzo de diseño:** https://claude.ai/artifact/A97NGeZkwn7V87tnsxwn2i («Tablemaroc — Sistema de diseño»).

Este documento guía el flujo de trabajo del diseño de la web, en bloques. Si algo choca con
`docs/01-documento-maestro-operacion.md`, manda el doc 01 y se avisa al titular del conflicto.

---

## Bloque 1 · Reglas de trabajo (obligatorias)

| # | Regla | En la práctica |
|---|---|---|
| 1 | **Preguntar antes de cualquier cambio** | Ningún cambio (diseño, texto, documento, código) sin el «sí» del titular, aunque sea pequeño u obvio. Si el titular pide un cambio concreto y claro, ese pedido es el «sí» para ese cambio y nada más. |
| 2 | **No inventar nada** | Ni funciones, ni pantallas, ni casos, ni textos, ni datos, ni ejemplos. Nada de nombres de restaurantes, ciudades, notas, precios u horarios de ejemplo: siempre marcadores `[NOMBRE DEL RESTAURANTE]`, `[CIUDAD]`, `[NOTA]`, `[N]`, `[PRECIO]`, `[HORA]`, `[FECHA]`. |
| 3 | **Hacer exactamente lo pedido** | Las ideas propias se proponen en una línea al final, nunca se meten. |
| 4 | **Si hay dos lecturas, preguntar** | Con opciones cortas (por ejemplo: «¿qué Ver más?»). |
| 5 | **Avisar de los conflictos** | Si un pedido choca con los docs 01, 16 o 17 o con la accesibilidad, se avisa en una línea y decide el titular. |
| 6 | **Aplicar cada decisión en todas las pantallas a la vez** | Móvil y ordenador, pantalla propia y su versión dentro de la Home, y los documentos. |
| 7 | **Responder siempre en español** | También avisos y resúmenes. |
| 8 | **Decir la verdad** | Decir siempre lo que no se ha comprobado (por ejemplo, «no lo he probado con Play»). |
| 9 | **Respetar los cambios del titular en el lienzo** | Antes de editar, comparar la copia local con la publicada (huella sha256) y, si difiere, leer la publicada. |
| 10 | **Apuntar las decisiones** | Cada decisión aprobada entra en el Bloque 4 con su fecha; si afecta al producto, también en el doc 01 (preguntando antes). |

## Bloque 2 · Flujo de trabajo

1. El titular pide algo (en el chat o con un comentario en el lienzo).
2. Claude comprueba si está claro y si choca con algo (reglas 2, 4 y 5).
3. Claude pregunta y explica en una o dos líneas qué va a cambiar y dónde.
4. Con el «sí», Claude hace solo ese cambio, en todas las pantallas afectadas (regla 6).
5. Claude pasa la lista de comprobación del Bloque 3 y publica.
6. Claude resume qué cambió, qué queda y qué no ha comprobado.
7. La decisión se apunta en el Bloque 4.

## Bloque 3 · Lista de comprobación antes de publicar

- [ ] La copia local coincide con la publicada (huellas iguales) o se ha releído la publicada.
- [ ] El código de cada pantalla se lee sin errores (revisión de sintaxis del script de cada mesa).
- [ ] **Cada acción usada en la pantalla existe de verdad**: se ejecuta `renderVals()` y se comprueba que todo
      `{{ hueco }}` de la plantilla (onClick, onScroll, valores) está definido. Revisar la sintaxis no basta.
- [ ] Etiquetas abiertas y cerradas en igual número (`<div>`, `<sc-if>`).
- [ ] Todo botón dibujado funciona (menú ☰, idioma, flechas, pestañas) o se avisa de que es solo dibujo.
- [ ] Se cumple el Bloque 4.6 en cada menú o panel: un solo panel abierto a la vez, tocar fuera cierra, barra de
      desplazamiento siempre visible y «dónde estoy» (✓ y resaltado en la opción actual y al pasar por encima).
- [ ] Las pantallas nuevas están enlazadas desde las que llevan a ellas y marcadas para Play si tienen botones.
- [ ] Sin datos inventados: solo marcadores entre corchetes.
- [ ] Sin negro (`#1C1B19`) y sin cafés, comida callejera ni mercados.
- [ ] Contraste mínimo WCAG AA y áreas táctiles de 44 × 44 px.

## Bloque 4 · Decisiones del titular (06-11-2026)

### 4.1 Alcance

- **Tablemaroc es solo de restaurantes.** Sin cafés y teterías, comida callejera ni mercados (también en docs 01, 16 y 17).
- Palabra **«restaurantes»** en la web (no «locales»). La página de cada restaurante sigue llamándose «info del local» (doc 01).

### 4.2 Estilo

| Elemento | Valor |
|---|---|
| Fondo de la web | **Blanco liso `#FFFFFF`, sin foto**, en todas las pantallas web (06-11-2026; antes crema, yeso, azul medina, naranja arena, foto naranja, foto verde `#2B5B2E`, foto naranja sobre blanco y foto negra sobre blanco) |
| Texto sobre el fondo | **Verde muy oscuro `#0A3F35`** (11,8:1 sobre blanco), también la cabecera; logo con arco verde de marca `#0F5C4D`. Sobre el verde de marca, blanco. Subrayados de pestañas y página actual en azafrán `#E0A23B` |
| Cabecera y pie en móvil | **Arena `#F2D7B6`** (cabecera con logo, idioma y ☰; barra inferior Inicio · Cuenta), texto verde muy oscuro `#0A3F35`; el hueco del arco del logo, arena. En ordenador la cabecera sigue sin cambios (06-11-2026; antes crema `#F4EFE6`, descartado por parecerse demasiado al fondo blanco) |
| Menú ☰, lista de idiomas y ventanas | **Arena `#F2D7B6`** de fondo (menú ☰ móvil, lista de idiomas en móvil y ordenador, ventana de Crea tu página / Contacto del administrador), texto verde muy oscuro `#0A3F35` (06-11-2026; antes blanco) |
| Tarjetas | **Verde claro `#E3EFEB`** con borde fino, en todas las pantallas web (restaurantes, mejores restaurantes, guías, ciudades, reseñas, reservas, favoritos, desplegables de información); texto verde muy oscuro `#0A3F35` (06-11-2026; antes blanco `#FFFFFF`). Filtros, selector de ciudad, menús y botones siguen blancos |
| Texto | Verde muy oscuro `#0A3F35` — **nada de negro** |
| Fondos destacados | Verde de marca `#0F5C4D` con texto blanco (antes negros) |
| Azafrán `#E0A23B` | Solo relleno y estrellas |
| Arcilla `#9C3F17` | Cerrado y avisos |
| Tipografía | Literata como única fuente web; el resto, fuentes del sistema |
| Nota de un restaurante | 5 estrellas (sin número de nota junto a la ciudad) |

### 4.3 Cabecera y navegación

- **Móvil:** logo, idioma y **menú ☰**. Barra inferior solo **Inicio** y **Cuenta**.
- **Menú ☰ (móvil):** Mi cuenta · Restaurantes · Ciudades · Guías · Sobre nosotros · Legales · Contacto del administrador ·
  botón **Crea tu página**. Sin Platos típicos ni Cómo funcionan las reseñas. Debajo, en el espacio libre, el **logo
  grande** (arco y «tablemaroc») centrado; es decorativo y tocarlo cierra el menú como cualquier zona vacía (06-11-2026).
- **Ordenador:** sin ☰; cabecera normal con Restaurantes · Ciudades · Guías · Sobre nosotros · Legales · Contacto del
  administrador · ES · Mi cuenta · Crea tu página.
- **Idioma:** botón ES que abre Español · English · Français y cambia la etiqueta (ES/EN/FR). Los textos aún no se traducen.
- **Crea tu página / Contacto del administrador:** muestran los datos de contacto del administrador.

### 4.4 Home

- Sin título y sin la frase «¿En qué ciudad estás?».
- **Lista de ciudades:** primera opción «Ciudades» y 27 ciudades de la A a la Z: Agadir, Alhucemas, Arcila, Beni Melal,
  Casablanca, Chefchaouen, El Jadida, Errachidia, Esauira, Fez, Ifrán, Kenitra, Larache, Marrakech, Mequinez, Mohammedia,
  Nador, Rabat, Safi, Salé, Tánger, Tarudant, Taza, Tetuán, Tiznit, Uarzazate, Uxda.
- **«Ver restaurantes»:** ciudad elegida → sus restaurantes; sin elegir y en Marruecos → los de la ciudad donde está;
  fuera de Marruecos o sin permiso de ubicación → mensaje «Elige una ciudad».
- Sin buscador de platos ni de locales, sin «Ciudades · Ver más» ni «Qué buscas».
- **Mejores restaurantes:** uno cada vez, a todo el ancho, con flecha a la derecha, sin barra de desplazamiento y sin
  pasar solo. Tarjeta: foto, nombre, ciudad (sin icono), «Mejor plato» y 5 estrellas.
- **Guías** debajo de Mejores restaurantes, sin «Ver más».

### 4.5 Restaurantes de una ciudad

- Sin introducción de la ciudad.
- Filtros: Abierto ahora · Vegetariano · Pago con tarjeta · Terraza.
- **Todos los restaurantes con scroll**, sin «Ver más» (excepción aprobada a «una sola pantalla»).
- Título de la lista: **solo el nombre de la ciudad**, «[CIUDAD]» (06-11-2026; antes «Restaurantes en [CIUDAD]»).
- Al bajar: el título «[CIUDAD]» queda fijo arriba, pegado a la cabecera; «Cambiar ciudad» desaparece.
- Botón redondo verde **«Volver arriba»** que aparece al bajar.
- Igual en la pantalla propia y en la lista dentro de la Home, en móvil y ordenador.

### 4.6 Menús y paneles flotantes — para todas las pantallas, actuales y futuras (aprobado por el titular, 06-11-2026)

- **Solo un panel flotante abierto a la vez.** Al abrir uno, se cierran los demás:
  - abrir el **menú ☰** cierra la lista de idiomas;
  - abrir la **lista de idiomas** cierra el menú ☰ y cualquier ventana;
  - abrir **Crea tu página** o **Contacto del administrador** cierra la lista de idiomas;
  - elegir un idioma cierra la lista.
- **Orden de capas** (de abajo arriba): contenido → título fijo de la lista (3) → botón «Volver arriba» (5) →
  lista de idiomas (20) → menú ☰ y ventanas (30). Un panel nunca puede quedar encima del menú.
- **Tocar fuera cierra:** la lista de idiomas se cierra al tocar en cualquier otro sitio; el menú ☰ se cierra al tocar
  una zona vacía (sin botón ni enlace) del propio menú; las ventanas se cierran al tocar el fondo oscuro.
- **Barra de desplazamiento moderna** en todo lo que se desplaza (pantallas, menú, listas): fina (8 px), verde de marca
  semitransparente, redondeada y sin fondo. Las filas que se deslizan de lado (Mejores restaurantes, filtros) no la muestran.
- **Menú ☰ y lista de idiomas: barra siempre visible** (aunque todo quepa), con un carril verde muy claro a la
  derecha; el indicador verde aparece en cuanto hay más contenido del que cabe.
- **«Dónde estoy»:**
  - lista de idiomas: el idioma actual lleva ✓ y fondo verde claro; la etiqueta del botón dice ES, EN o FR;
  - menú ☰ (móvil): la página en la que estás va resaltada con fondo verde claro, en negrita y con ✓
    (en una guía se marca «Guías»; en la Home no hay opción que marcar);
  - cabecera (ordenador): la página actual va en negrita y subrayada en verde;
  - al pasar el dedo o el ratón por una opción del menú o de idiomas, esa opción se resalta.
- Cualquier panel nuevo (filtros, avisos, ventanas) sigue esta regla y entra en este orden.

### 4.6 bis Ciudades

- Dos pestañas: **«Todas»** (las 27 de la A a la Z) y **«Más visitadas»**.
- «Más visitadas», en este orden: **Marrakech, Agadir, Casablanca, Tánger, Fez**. Fuente: pernoctaciones en
  alojamientos clasificados del Observatorio Nacional del Turismo (2024-2025), búsqueda del 06-11-2026.
  Cada ciudad lleva a la lista de restaurantes de esa ciudad.

### 4.7 Guías

- Pantalla «Guías»: sin botón «Ver más» (móvil y ordenador).

### 4.8 Panel (fase 2, parte A) — tanda 1, 06-11-2026

- **Por tandas:** 1) esqueleto y escritorio; 2) acceso de administración y de propietario; 3) listado y formulario del local.
  Cada tanda se revisa antes de seguir.
- **Mismo estilo que la web:** fondo blanco, barra lateral y cabecera móvil en arena `#F2D7B6`, tarjetas verde claro
  `#E3EFEB`, botones verde de marca, Literata en títulos, pestañas con subrayado azafrán. **Modo claro y oscuro** con
  variables CSS (reutilizable en otros proyectos); se elige en Tweaks («modo»).
- **Barra lateral por rol** (doc 01 §20): Administración (Escritorio · Contenido · Comunidad · Sistema), Propietario
  («Mi local»: Escritorio, Reservas, Información, Menú, Fotos, Reseñas, Empleados) y Empleado (solo Reservas). Se elige en
  Tweaks del esqueleto («rol»). En móvil se abre con ☰, a pantalla completa, con el logo grande abajo.
- **Escritorio:** interruptor Automático / Manual y pestañas Automático / Manual (funcionan). En móvil, la moderación
  tiene subpestañas Reseñas / Fotos. Aprobar, Rechazar, Siguiente, buscar y avisos están solo dibujados («isla»).
- Datos de los bocetos sustituidos por marcadores ([HORA], [N], [USUARIO], [NOMBRE DEL RESTAURANTE], [TIPO DE VIAJE]).

### 4.9 Panel (fase 2, parte A) — tanda 2: acceso, 06-11-2026

- **Una sola pantalla de acceso para todos los roles** (doc 01 §20), no dos accesos separados como en `diseno/login/`.
- **Mismo estilo que la web:** fondo blanco, tarjeta verde claro `#E3EFEB`, texto `#0A3F35`, botón principal verde de
  marca, Literata en títulos, modo claro y oscuro (Tweaks «modo»). Sin cabecera de la web.
- **7 pantallas**, en móvil y ordenador: 1) Acceso, con el título **«Tablemaroc · Panel»**, los 3 botones con el mismo peso y
  la nota «¿Es tu primera vez? Activa tu acceso desde el email que te enviamos»; 2) Continuar con email; 3) Continuar con
  Google; 4) Continuar con huella o cara; 5) Código de la app («Segundo paso», solo Administración, después de Google);
  6) Acceso no autorizado; 7) Activa tu acceso (primera vez, desde el email recibido; rol Propietario o Empleado en Tweaks).
- **Administración que entra con email → «Acceso no autorizado»**. Se quita el botón «Ir al panel de locales» del boceto.
- **Mensajes de error incluidos**, elegidos en Tweaks: email no válido, código incorrecto, código caducado, demasiados
  intentos y huella o cara cancelada (también código de la app incorrecto o demasiados intentos). Los textos que no están
  en `docs/18-textos/04-interfaz.md` quedan como marcador `[AVISO: …]`.
- Iconos de email y llave dibujados en línea (sin emojis); «Continuar con Google» sin logo, como en el boceto.

### 4.10 Decisiones del 07-11-2026 (para programar la Home)

- **Mejores restaurantes:** los elige el titular. Cada restaurante lleva la marca «Sale en Mejores restaurantes» (con su
  orden); salen todos los marcados. Hasta que el panel esté diseñado, el titular dice cuáles y Claude Code los marca.
- **Logo:** se usa el del diseño (arco). Se quita «sin arcos» del doc 17.
- **Letra Literata:** alojada en tablemaroc.com (woff2 propio), sin conexión con Google.
- **JavaScript:** se acepta en todo lo necesario (menú ☰, idioma, «Volver arriba», ubicación…).
- **Contacto del administrador:** lo rellena el titular **desde el panel**; en el diseño queda el marcador. El panel
  necesita ese campo (Ajustes).
- **Pie de página: sí** (decisión del titular, 07-11-2026). Hay que diseñarlo antes de subir la Home, en todas las
  pantallas web (móvil y ordenador), como navegación secundaria: ciudades, guías y legales, sin «Política de cookies».
  *(Claude lo apuntó por error como «sin pie de página»; corregido el mismo día.)*
- **Restaurantes de una ciudad:** se programa junto con la Home.

## Bloque 5 · Pantallas en el lienzo

| Pantalla | Móvil | Ordenador | Con Play |
|---|---|---|---|
| Sistema visual · Librería de componentes | — | — | No |
| Home | Sí | Sí | Sí |
| Restaurantes de una ciudad | Sí | Sí | Sí |
| Ciudades · Guías · Guía | Sí | Sí | Sí |
| Info del local (pestaña Info) | Sí | Sí | Ordenador |
| Mi cuenta (Reseñas · Reservas · Favoritos · Datos) | Sí | Sí | Sí |
| Sobre nosotros / Legales | Sí | Sí | Sí |
| Panel · Esqueleto | Sí | Sí | Sí |
| Panel 02 · Escritorio (Automático · Manual) | Sí | Sí | Sí |
| Panel 01 · Acceso (7 pantallas: acceso, email, Google, huella o cara, código de la app, no autorizado, activa tu acceso) | Sí | Sí | Sí |

## Bloque 6 · Errores cometidos y lecciones

| Error | Lección |
|---|---|
| Respondí en inglés, también en frases cortas mientras trabajaba («Found it…», «Document the error…»). | Todo en español, incluidos los avisos breves entre pasos (regla 7). |
| Inventé datos de ejemplo: «Café Clock», «Comer en Fez», nota 4,6 con 128 reseñas, 85 MAD, horarios, tajines y las ciudades Marrakech, Fez y Chefchaouen como únicas. | Solo marcadores entre corchetes (regla 2). Corregido en todas las mesas. |
| Añadí cosas no pedidas: la opción «Donde estoy ahora» y el caso «sin permiso de ubicación». | Preguntar antes (reglas 1 y 3). El caso de ubicación se quedó porque el titular lo aprobó. |
| Propuse un logo de arco, aunque el doc 17 pide «sin arcos». | Leer todos los documentos antes de diseñar. El titular aprobó el arco el 07-11-2026 (Bloque 4.10). |
| Un fallo en el código generado dejó 11 pantallas con un aviso rojo. | Revisar la sintaxis antes de publicar (Bloque 3). |
| Dibujé el menú ☰ y el botón de idioma sin que funcionaran en las pantallas nuevas. | Todo botón dibujado debe funcionar (Bloque 3). |
| Creé pantallas sin enlazarlas desde la Home. | Enlazar al crear (Bloque 3). |
| El título fijo dejaba un hueco y luego arrastraba «Cambiar ciudad». | Probar el comportamiento al desplazar y hacer solo lo pedido. |
| Una decisión (quitar la nota, quitar el negro) quedaba en una pantalla y no en otras. | Aplicar cada decisión en todas las pantallas a la vez (regla 6). |
| Copias locales desfasadas respecto al lienzo. | Comparar huellas antes de publicar (regla 9). |
| Al añadir «tocar fuera cierra», metí las acciones nuevas dentro de la lista de idiomas y no en la pantalla: los botones dejaron de funcionar («nada funciona»). La revisión de sintaxis no lo detectó. | Comprobar que cada acción usada existe ejecutando la pantalla (Bloque 3). Corregido en las 15 pantallas y en los generadores. |
| Dije que había puesto la foto de fondo, pero el color de fondo de cada pantalla la tapaba: solo se veía naranja. | No dar por hecho un cambio visual sin comprobar qué lo puede anular; avisar de que no se ha visto en pantalla. Corregido. |
| Entendí «no hace falta pie de página, hazlo» como «quitar el pie» y lo apunté y subí así; el titular quería el pie. | Ante una frase que admite dos lecturas, preguntar antes de cambiar documentos (regla 4). Corregido. |
| Con la lista de idiomas abierta, al abrir el menú ☰ la lista quedaba encima del menú. | Regla de capas (Bloque 4.6): un solo panel abierto y orden fijo de capas. Corregido en todas las pantallas. |

## Bloque 7 · Pendiente de decisión del titular

- **Traducción** de los textos al cambiar de idioma.
- **Pie de página** sin diseñar todavía (aprobado que exista, 07-11-2026).
- **Doc 01, §19:** sigue diciendo «las listas largas se cortan con Ver más o paginación»; choca con el scroll aprobado.
- **Docs 16 y 17:** la fila de la Home y las fases aún describen parte de la Home anterior.
- **Ciudades del Sáhara Occidental** (El Aaiún, Dajla), fuera de la lista.
- **Acceso del panel:** textos de los avisos que faltan (email no válido, código caducado, huella o cara cancelada y
  demasiados intentos con el código de la app). *(El encargo de login y los docs 16 y 17 ya dicen «una sola pantalla de
  acceso», 06-11-2026.)*
- **Pantallas que faltan:** menú del restaurante, reseñas, mapa, plato típico, escribir reseña, reserva, acceso,
  errores, reclamar un local y el panel.

## Bloque 8 · Documentos relacionados

| Documento | Para qué |
|---|---|
| `docs/01-documento-maestro-operacion.md` | Fuente de autoridad del proyecto |
| `docs/16-encargo-claude-design.md` | Encargo completo de diseño |
| `docs/17-prompt-claude-design.md` | Prompts por fases para Claude Design |
| `docs/18-textos/` | Textos de la web en es/en/fr |
| `diseno/` | Bocetos de estructura |
