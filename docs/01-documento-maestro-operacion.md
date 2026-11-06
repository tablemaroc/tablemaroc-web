# Documento maestro de operación de Tablemaroc

**Estado:** vigente, se actualiza con cada decisión del titular.  
**Última actualización:** 06-11-2026 (ver «Registro de cambios» al final).  
**Autoridad:** máxima autoridad operativa documental.

**Vocabulario:** la página de cada local (restaurante, café, puesto o mercado) se llama **«info del local»**, no «ficha»,
en la documentación y en la interfaz de la web y del panel. Donde un documento anterior diga «ficha», se entiende «info del local».

Si otra orden o documento contradice este documento, Claude Code no ejecuta la parte contradictoria:
la señala, registra el conflicto y espera decisión del titular. Las decisiones del 01-11-2026 prevalecen
sobre cualquier documento anterior (incluidos `10`, `11`, `12`, `14` y `decisiones.md`) en lo que se contradigan.

---

## 1. Principios irrenunciables

1. Claude Code opera el proyecto de principio a fin según las reglas de este documento, incluida la publicación.
   El titular solo contrata servicios de pago y gestiona claves y secretos (§2).
2. **Nunca se borra contenido publicado**, porque perjudica al SEO. Se modifica, se mejora, se fusiona con
   redirección 301 o se marca como cerrado (§3.1). Solo se borra lo imprescindible por obligación legal (§3.2).
3. Si se detecta contenido débil, duplicado, obsoleto o problemático, se corrige o se busca una solución sin borrar.
4. **No se inventan datos.**
5. Precios, horarios, direcciones, ingredientes, disponibilidad, premios y citas deben proceder del titular
   o de fuentes verificables con fecha/referencia. Lo no verificado se muestra como pendiente.
6. **Sin ningún tipo de ingreso:** sin afiliados, sin anuncios, sin destacados de pago y sin suscripciones.
   Nada altera puntuaciones, moderación ni orden orgánico.
7. **Minimizar gastos:** se elige siempre la opción sin coste por uso cuando existe (sin SMS, sin APIs de mapas de pago).
8. Se aplica privacidad por defecto conforme al **RGPD y a la Ley 09-08 de Marruecos, las dos siempre** (decisión del titular, 06-11-2026).
9. Los secretos no se guardan en Git ni en backups normales.
10. Idiomas oficiales del producto: `es`, `en`, `fr`.
11. Árabe retirado del producto: sin RTL y sin `hreflang ar`.
12. **Sin alcohol:** no existe ningún dato, filtro, icono ni texto sobre alcohol en la web, el panel ni los bocetos (decisión del titular, 01-11-2026).
13. No se añaden funciones, campos ni filtros que el titular no haya aprobado; las propuestas se presentan como propuestas.

---

## 2. Responsabilidades

### Titular

Solo:

- contratar y pagar servicios (hosting, dominio, email transaccional y cualquier otro de pago);
- crear, guardar y facilitar claves y secretos por la vía segura acordada;
- resolver conflictos documentales cuando Claude Code se lo pida;
- decidir cambios en este documento;
- encargarse de las reservas: supervisión, incidencias y contacto con los restaurantes (§18 bis).

### Claude Code

Hace todo lo demás:

- crear, verificar, traducir, revisar y **publicar** contenido;
- moderar reseñas y fotos (aprobar o rechazar con motivo);
- cambios de URL, siempre con redirección 301;
- marcar locales como cerrados, fusionar duplicados y corregir datos (§3.1);
- SEO, Quality Gate, sitemap y enlazado interno;
- desarrollo, despliegue, seguridad, copias de seguridad, monitorización y mantenimiento;
- informes al titular.

Límites:

- no contrata servicios ni genera gastos sin que el titular los contrate;
- no expone secretos;
- no borra contenido publicado (§3);
- todas sus acciones quedan registradas en la auditoría (§7) y deben poder revertirse.

Claude Code solo actúa cuando hay una sesión abierta o una tarea programada; la moderación periódica se hace
mediante tareas programadas (§6).

La responsabilidad legal de la web sigue siendo del titular.

### Panel de administración

**Panel propio**, sin depender de servicios ni productos de terceros (decisión del titular, 01-11-2026): moderno, profesional y
**reutilizable en otros proyectos futuros** (núcleo común + módulos propios de cada proyecto). Se descarta Directus.
Claude Code opera mediante la API autenticada del panel, con permisos propios y todo auditado; no asume que puede hacer clic en el panel.

---

## 3. Estados

### Contenido
`borrador -> revisado -> publicado`

- `borrador`: no visible y no indexable.
- `revisado`: verificado, pendiente de publicar.
- `publicado`: visible y candidato a indexación si supera el Quality Gate.
- Un contenido publicado **no vuelve a borrador ni se archiva**: se mejora o se aplica §3.1.

Estado de apertura de un lugar publicado (no lo despublica): `abierto | cerrado temporalmente | cerrado definitivamente`.

### 3.1 Soluciones en lugar de borrar

| Caso | Solución |
|---|---|
| Local cerrado temporalmente | La info del local sigue publicada con el aviso «Cerrado temporalmente» |
| Local cerrado definitivamente | Info del local publicada con «Cerrado definitivamente» y alternativas cercanas |
| Info del local duplicada | Fusión en una sola info del local; la URL sobrante redirige (301) a la buena |
| Cambio de nombre o de URL | Redirección 301 de la URL antigua a la nueva |
| Contenido pobre o desactualizado | Se mejora; mientras tanto, no indexable (Quality Gate) |
| Dato erróneo | Se corrige y queda auditado |

### 3.2 Excepciones legales (se borra solo lo imprescindible)

- Solicitud de un usuario de borrar su cuenta y sus datos (RGPD).
- Contenido ilegal o difamatorio, u orden judicial.
- Datos personales publicados por error.

La info del local nunca se borra por estas causas; solo el contenido afectado.

### Traducciones
`borrador -> revisada -> publicada`

Un idioma solo puede publicarse/indexarse cuando su traducción está realmente preparada.

### Reseñas
`pendiente -> aprobada | rechazada`

Las rechazadas conservan el motivo de moderación. Solo las aprobadas se muestran y cuentan para la valoración media.

Límites (decisión del titular, 06-11-2026): las reseñas **no están limitadas**: sin límite total y **sin límite por local**
(el mismo usuario puede reseñar un local en cada visita). Solo hay un freno antispam de **5 reseñas cada 24 horas** por usuario.
Cada reseña se puede editar desde «Mi cuenta» (al editarla vuelve a moderación). Hasta 3 fotos por reseña.

### Respuestas a reseñas (MVP)
`borrador -> publicada`

El propietario contesta las reseñas aprobadas de su local desde su panel (sección «Reseñas»), una respuesta por reseña
(decisión del titular, 06-11-2026). **Las respuestas no pasan por moderación:** se publican en cuanto el propietario las envía.
Solo se aplican las excepciones legales de §3.2 (contenido ilegal o difamatorio, orden judicial, datos personales publicados por error).

### Fotos
`pendiente -> aprobada | rechazada`

Deben registrarse origen, autor/licencia y moderación.

### Menú digital
`borrador -> revisado -> publicado`

El menú está ligado a un lugar e incluye categorías, artículos, precios, alérgenos, disponibilidad y fotografías
únicamente cuando la información exista y sea fiable.

**Platos agotados** (decisión del titular, 01-11-2026): un plato que deja de estar disponible se **archiva**. Un plato archivado
no aparece en la web, no se borra y se puede reactivar desde el panel. La web no muestra la etiqueta «Agotado».

---

## 4. Quality Gate e `is_indexable`

El Quality Gate es un criterio interno de calidad. No debe presentarse como requisito oficial de Google.

### 4.1 Requisitos comunes por entidad e idioma

1. Traducción publicada en ese idioma.
2. Descripción suficiente según el umbral interno de la entidad.
3. Estado publicado.
4. Sin duplicidad relevante detectada.
5. Enlazado interno suficiente.
6. Datos factuales verificados cuando corresponda.
7. Metadatos y elementos multimedia válidos cuando la entidad los requiera.

### 4.2 Requisitos específicos

| Entidad | Requisitos |
|---|---|
| Lugar | Coordenadas válidas + ciudad; al menos 1 foto aprobada con alt en el idioma; al menos 1 enlace entrante y 2 salientes; verificación reciente cuando aplique. |
| Plato | Al menos 1 relación con lugar; al menos 1 foto aprobada; enlaces útiles a lugares y/o guías; no requiere coordenadas propias. |
| Guía | Al menos 3 relaciones útiles; al menos 2 fotos aprobadas; autoría declarada. |
| Ciudad | Coordenadas; al menos 3 lugares publicados; al menos 1 foto aprobada. |
| Menú | Ligado a lugar publicado; cada categoría publicada tiene al menos 1 artículo publicado; precios verificados o claramente marcados como pendientes; traducción del idioma correspondiente. |

### 4.3 Umbrales internos

| Entidad | Mínimo interno |
|---|---:|
| Lugar | 300 caracteres |
| Plato | 300 caracteres |
| Guía | 500 caracteres |
| Ciudad | 500 caracteres |
| Menú | 200 caracteres |

Estos mínimos son criterios internos. No se debe rellenar artificialmente un texto para alcanzarlos.

### 4.4 Enlazado interno

- Lugar: al menos 1 entrante + 2 salientes.
- Plato: al menos 1 relación saliente útil.
- Guía: al menos 3 relaciones útiles.
- Ciudad: al menos 1 relación saliente útil.

La navegación secundaria (pie de página, migas de pan, «cerca de aquí», listados por ciudad y tipo) es la vía
principal para cumplir estos mínimos.

Si una entidad falla el Quality Gate, permanece almacenada y publicada si procede, pero no indexable. Nunca se borra por fallarlo.

---

## 5. Acceso técnico

| Vía | Uso |
|---|---|
| Base de datos | Scripts/backend autorizados; credenciales solo en entorno seguro. |
| Copias de seguridad | Panel → «Copias de seguridad»: hacer, descargar y restaurar copias completas. Sin CSV (decisión del titular, 02-11-2026). |
| API interna | Endpoint documentado y autenticado. |
| Panel | Gestión de contenido. |

Prohibido:

- credenciales hardcodeadas;
- claves de servicio en el navegador;
- secretos en Git;
- asumir acceso técnico inexistente.

Las operaciones técnicas relevantes deben quedar auditadas.

---

## 6. Dependencias y frecuencias

### Dependencia lógica

`datos -> contenido -> traducciones -> moderación -> publicación -> Quality Gate -> sitemap/SEO`

### Frecuencias

- **3 veces al día**: moderación de reseñas y fotos por tarea programada de Claude Code (decisión del titular, 01-11-2026).
- Diario: backup de base de datos.
- Semanal: Search Console, rendimiento y backups de fotos/configuración no secreta.
- Mensual: seguridad, duplicidad, SEO, estado y crecimiento.
- Trimestral: prueba de restauración.
- Bajo demanda: contenido y traducciones.

---

## 7. Auditoría

Campos mínimos:

`id`, `fecha`, `actor`, `origen`, `entidad_tipo`, `entidad_id`, `accion`, `campo`,
`valor_anterior`, `valor_nuevo`, `motivo`.

Fuentes permitidas:

- `panel`
- `claude_code`
- `sistema`

Entidades auditables:

- place
- dish
- guide
- city
- translation
- review
- photo
- menu
- redirect
- account
- config

---

## 8. Notificaciones

MVP: email + panel.

Claude Code informa al titular de:

- servicios de pago que haya que contratar o renovar;
- claves que haya que crear o rotar;
- fallo de backup;
- caídas/5xx;
- alertas de seguridad;
- conflictos documentales.

Y gestiona por sí mismo (con informe periódico): reseñas problemáticas, fotos con derechos dudosos, menús pendientes,
verificaciones antiguas y problemas de indexación.

Sin SMS ni push.

---

## 9. Backups

- Base de datos (D1): diario, exportado a R2.
- **Copia externa en el PC del titular** (decisión del titular, 06-11-2026): botón «Crear copia» del panel. Copia **completa**
  (base de datos + fotos), **cifrada** en el propio navegador con la contraseña de copia del titular, y guardada en una carpeta
  de su PC elegida una vez. Cada copia **sustituye a la anterior** (un solo archivo). Se restaura desde el panel con
  «Restaurar desde archivo». La contraseña de copia va en el gestor de contraseñas del titular: sin ella no se puede restaurar.
- Fotos y configuración no secreta: semanal.
- Retención propuesta: 7 diarias, 4 semanales y 3 mensuales.
- Copias externas y cifradas (la del PC, cifrada con AES-GCM; la contraseña nunca sale del navegador).
- Secretos reales: gestor seguro del titular; nunca en backup normal.
- Puede conservarse un inventario de secretos, nunca sus valores.
- Restauración documentada.
- Prueba de restauración trimestral.

---

## 10. Privacidad

Se aplican **siempre** el RGPD (usuarios europeos) y la **Ley 09-08 de Marruecos** (responsable en Marruecos; autoridad: CNDP),
cumpliendo en cada punto la regla más exigente de las dos (decisión del titular, 06-11-2026). Los trámites ante la CNDP
(declaración o autorización, y transferencia de datos a Cloudflare fuera de Marruecos) los confirma el asesor.

Revisar:

- base legal/consentimiento, con versión y fecha;
- exportación y eliminación de datos y de la cuenta por el propio usuario;
- retención;
- analítica sin cookies, para evitar el banner de cookies;
- política de privacidad, aviso legal y condiciones en es/en/fr, revisados por un asesor;
- minimización;
- logs y accesos;
- fotos subidas sin metadatos de ubicación.

---

## 11. Métricas

- búsquedas;
- páginas de info del local vistas;
- clics en «Cómo llegar»;
- teléfono/web;
- filtros;
- ciudades/platos consultados;
- conversión a reseña;
- reseñas aprobadas;
- menús vistos;
- QR.

---

## 12. Producto por fases

### MVP

- favoritos, disponibles sin conexión en el móvil (adelantado de la Fase 2, 01-11-2026);
- acceso de propietarios al panel (rol «Propietario») y reclamación de su local con verificación de titularidad sin coste (adelantado de la Fase 2, 01-11-2026);
- reservas gestionadas (§18 bis);
- respuestas del propietario a las reseñas de su local, sin moderación (§3; adelantado de la Fase 2, 06-11-2026);

- lugares;
- ciudades;
- platos;
- guías;
- traducciones es/en/fr;
- fotos;
- cuentas de usuario y reseñas moderadas (§18);
- menú digital;
- panel;
- mapas sin coste por uso (§16);
- SEO/Quality Gate/sitemap;
- seguridad;
- backups;
- auditoría;
- notificaciones;
- analítica sin cookies.

### Fase 2

- recetas si se aprueban;
- más idiomas si se decide;
- seguimiento avanzado.

### Retirado

- árabe, RTL y `hreflang ar`;
- barrios y zonas (sin páginas, sin campo y sin filtro);
- afiliados, anuncios, destacados de pago y cualquier monetización;
- contraseñas (el login es sin contraseña, §18);
- login con Apple;
- Google Maps como mapa embebido.

---

## 13. Idiomas y URLs

Público principal: turistas europeos.

URLs oficiales:

- `/es/`
- `/en/`
- `/fr/`

`hreflang` únicamente entre esas tres versiones.

No existen:

- `/ar/`;
- `hreflang ar`;
- traducciones árabes;
- RTL.

**Idioma** (decisión del titular, 01-11-2026):
- **Idioma base de la web: español.** Es el idioma de referencia del contenido y el de reserva.
- Al entrar sin idioma elegido (por ejemplo en `tablemaroc.com/`), se usa el **idioma del navegador** si es es, en o fr;
  si no es ninguno de los tres, se usa el **español**.
- El usuario puede cambiar de idioma en cualquier momento y su elección se recuerda.
- `hreflang x-default` apunta a la versión en español.
La implementación concreta debe revisarse con la documentación técnica/SEO vigente antes de desarrollarse.

---

## 14. Regla de conflicto

Manda `09-matriz-de-autoridad.md`.

Si no resuelve el conflicto:

1. no ejecutar la parte conflictiva;
2. registrar el conflicto;
3. informar al titular;
4. esperar decisión.

---

## 15. Conectividad móvil y PWA

- Mobile-first para turistas con datos en roaming o eSIM limitada y cobertura variable en Marruecos.
- Service Worker con Cache-First para iconos, CSS críticos, fuentes y la página principal de guías gastronómicas.
- Network-First para la info del local y los menús digitales.
- Fallback a los últimos datos almacenados en `IndexedDB` cuando no haya red, con un máximo de 20 páginas (info del local u otras) y política LRU.
- Cachés del Service Worker versionadas, con actualización y limpieza de versiones antiguas.
- Fotografías en WebP/AVIF con `lazy-loading`.

La especificación completa está en `10-politica-pwa-conectividad.md`.

---

## 16. Mapas y «Cómo llegar» (sin coste por uso)

Sin API de Google Maps ni de ningún mapa de pago.

| Pieza | Regla |
|---|---|
| Mapa estático | Imagen generada una sola vez al publicar el lugar, guardada en R2 y servida desde nuestro dominio en Cloudflare (§18 ter); reserva su espacio (sin CLS). |
| Mapa interactivo | Solo si el usuario pulsa «Ver mapa». MapLibre con mapas de OpenStreetMap alojados en R2 (nuestro dominio en Cloudflare) o en un servicio gratuito. Crédito «© OpenStreetMap» visible. |
| Botón «Cómo llegar» | Enlace gratuito que abre la aplicación de mapas del usuario (Google Maps o Apple Maps) con las coordenadas del lugar; sin API. |
| Indicaciones en texto y foto de la entrada | Siempre visibles bajo el mapa. |
| Sin conexión | Dirección e indicaciones en texto disponibles; indicador de conectividad. |

Coordenadas `lat`/`lng` obligatorias en la info de cada local. Este apartado prevalece sobre `11-protocolo-fallback-mapas.md`
en lo que se contradigan (proveedor del mapa); el resto del protocolo de fallback sigue vigente.

---

## 17. Precios (solo MAD)

- Tablemaroc utiliza exclusivamente MAD para los precios.
- `menu_items` guarda el importe en `price_mad`; no existe campo genérico de moneda.
- No hay conversiones a otras monedas, tipos de cambio, selectores de moneda ni precios aproximados.
- Un precio ausente o no verificado se muestra como pendiente; nunca se inventa.

La especificación completa está en `12-especificacion-precios-mad.md`.

---

## 18. Cuentas y login (sin contraseñas)

Decisiones del titular (01-11-2026): **se elimina el login con email y contraseña** y **no se usa SMS** (no es necesario para las reseñas:
las protegen la moderación previa y los límites). Todas las cuentas entran sin contraseña y sin coste:

| Opción | Cómo funciona |
|---|---|
| Continuar con Google | Cuenta de Google. |
| Continuar con email | Se envía un código de 6 cifras al email. |
| Continuar con huella o cara | Passkey del dispositivo (huella o reconocimiento facial). En la interfaz se llama siempre «huella o cara». |

| Tipo de cuenta | Notas |
|---|---|
| Usuarios (reseñas) | Google, email con código y **huella o cara**. Pantalla «Entrar» con botón **«Crear cuenta»**, que lleva a su propia pantalla (nombre visible, opción de alta y aceptación de condiciones). |
| Propietarios (MVP) | Google, email con código y **«Continuar con huella o cara»**, en la misma pantalla de acceso del panel. Sin segundo factor obligatorio. La titularidad del local se verifica por vías sin coste. |
| Administración | **«Continuar con Google»** (cuentas autorizadas) seguido del código de la app de autenticación, **o «Continuar con huella o cara»** (la passkey ya es un factor fuerte). Decisión del titular, 01-11-2026. |
| Empleados de restaurante (MVP) | Google, email con código o huella o cara. **Solo pueden ver, confirmar y marcar «No disponible» las reservas de su local; nada más.** Los **añade el propietario** por email desde «Empleados» (el empleado activa su acceso con el email recibido); el propietario puede quitarles el acceso. |

Reglas comunes:

- sin contraseñas: no hay pantalla de «recuperar contraseña»;
- sin login con Apple;
- sin SMS ni login por teléfono;
- códigos de un solo uso, con caducidad corta y límite de intentos y de envíos;
- el email y el teléfono nunca se muestran públicamente; nombre visible elegido por el usuario;
- el usuario puede descargar sus datos y borrar su cuenta (§3.2).
- El botón de passkey se llama **«Continuar con huella o cara»** (decisión del titular, 01-11-2026).
---

## 18 bis. Reservas (recuperadas)

Decisión del titular (01-11-2026): **se recuperan las reservas**, que se habían retirado el 30-10-2026, con la **opción gestionada**:

1. El usuario, con su cuenta, elige fecha, hora, número de personas y una petición especial opcional, y pulsa «Solicitar reserva». Sin pago.
2. Con el panel en **automático**, la reserva **se confirma sola** si hay sitio según los ajustes del local; si no encaja, queda **pendiente de confirmar** (decisión del titular, 02-11-2026).
3. Las pendientes (o todas, con el panel en **manual**): **el propietario o un empleado la confirma o la marca como «No disponible»** desde el **panel** (la misma plantilla del panel de administración, con el rol «Propietario»: solo ve su local).
4. El usuario recibe el aviso **por email** (sin SMS) y ve el estado en «Mi cuenta → Mis reservas». **Puede cancelarla cuando quiera**, esté pendiente o confirmada (decisión del titular, 06-11-2026).

Estados: `pendiente -> confirmada | no disponible | cancelada`; `confirmada -> cancelada`. Las reservas no se borran (historial).
Ajustes del propietario: acepta reservas sí/no, franjas horarias, máximo de personas y días cerrados.

Decisiones del titular (01-11-2026):
- solo reciben reservas los locales que marquen **«Acepto reservas»** (los demás no muestran el botón «Reservar»);
- el acceso de propietarios al panel se **adelanta al MVP**;
- **todos los locales tienen propietario registrado**: el propietario confirma las reservas de su local. El propietario
  queda registrado al reclamar su local y verificar la titularidad sin coste (§12); la reclamación es la vía de alta del propietario;
- **el titular se encarga de las reservas** en la práctica: supervisión, incidencias y contacto con los restaurantes.


La tabla de reservas se recreará en la base de datos en la fase de desarrollo (se retiró con `0150_retirar_reservas.sql`).

---

## 18 ter. Stack técnico: todo en Cloudflare

Decisión del titular (02-11-2026), con los criterios **rendimiento, precio, seguridad y mantenimiento**: **opción B, todo en Cloudflare**.
Sustituye a la propuesta del VPS de Hostinger y a cualquier mención anterior a Supabase, Next.js o VPS como plataforma de producción.

| Pieza | Servicio de Cloudflare |
|---|---|
| Web pública | Astro con el adaptador de Cloudflare (Workers / Pages) |
| Lógica (login, reseñas, reservas, favoritos) | Workers |
| Panel propio (administración, propietarios, empleados) | Workers, en el mismo proyecto o en `admin.tablemaroc.com` |
| Base de datos | D1 (SQLite) |
| Fotos y copias de seguridad | R2 |
| Tareas programadas (moderación 3 veces al día, copias, auditorías) | Cron Triggers |
| Antispam | Turnstile |
| CDN, HTTPS, protección DDoS, cortafuegos, DNS | Incluidos |
| Email de contacto (`contacto@`) | Email Routing |
| Analítica sin cookies | Web Analytics |

Consecuencias aceptadas por el titular:
- El proyecto queda ligado a Cloudflare (D1, Workers y R2 son propios de la plataforma).
- El panel propio sigue siendo código nuestro y reutilizable, pero para ejecutarse en Cloudflare.
- No hay servidor que mantener; Claude Code se encarga de despliegues, configuración, copias y vigilancia.

Pendiente del titular:
- Plan: empezar en el gratuito y pasar al de pago de Workers (unos 5 $/mes) cuando los límites lo pidan.
- ~~Proveedor de email transaccional~~ → **Brevo, plan gratuito (300 emails al día)**, elegido por el titular el 05-11-2026: API transaccional, sin listas de contactos.
- Procesado de fotos (convertir a WebP/AVIF y quitar el GPS): dentro de los Workers o con el servicio de imágenes de pago.
- ~~Copia de seguridad extra fuera de Cloudflare~~ → en el PC del titular con «Crear copia» (decisión del 06-11-2026, §9).
- **Hostinger descartado** (decisión del titular, 02-11-2026).

---

### Arquitectura de islas (Astro)

Decisión del titular (04-11-2026). La web usa la **arquitectura de islas** de Astro:

**Parte estática (HTML puro, sin JavaScript, generada en el servidor):**
- diseño general: cabecera, pie y barra inferior;
- contenido: info del local (descripción, horario, datos rápidos), guías, platos típicos y páginas de texto;
- el menú con sus precios en MAD;
- la imagen estática del mapa y las indicaciones;
- pestañas y secciones plegables, hechas solo con HTML y CSS.

**Parte dinámica (islas interactivas, solo en la página que las usa y, cuando se pueda, solo al llegar a ellas o tocarlas):**
| Isla | Por qué necesita JavaScript |
|---|---|
| Reservar | Horas libres y número de personas en tiempo real |
| ♡ Favoritos | Guardar el local y tenerlo sin conexión |
| Escribir reseña | Estrellas y fotos reducidas y sin GPS en el propio móvil |
| Login | Google, código por email y huella o cara |
| «Ver mapa» | Mapa interactivo de OpenStreetMap, solo al pulsarlo |
| «Abierto ahora» | Cálculo con la hora de Marruecos |
| Buscador y filtros | Resultados al momento |

Las islas se escriben con **JavaScript ligero o Preact** (no React ni Vue completos), para que cada una pese pocos KB.
No hay pedidos a domicilio (no forman parte del producto).

---

## 19. Diseño de la interfaz

- **El diseño antiguo queda descartado** (decisión del titular, 01-11-2026): el sistema visual de la «fase 1» de Claude Design
  (paleta arena y terracota, Fraunces y Manrope, logo de estrella), las plantillas actuales, la cabecera, el pie de página y sus enlaces.
- El nuevo diseño se encarga a Claude Design y debe cumplir este documento: público europeo, es/en/fr, solo MAD, sin barrios,
  sin ingresos, login sin contraseña (Google, email con código y passkey), mapa sin coste y botón «Cómo llegar».
- El pie de página y los enlaces se rediseñan como navegación secundaria útil para el SEO (§4.4): ciudades y tipos de lugar,
  enlaces legales, sin «Política de cookies» si no se usan cookies no imprescindibles.
- **Una sola pantalla por plantilla, en móvil y en ordenador** (decisión del titular, 01-11-2026): cada plantilla muestra lo esencial sin scroll largo.
  En ordenador se aprovecha el ancho (columnas) para que quepa en una pantalla.
  Lo demás va en pestañas o secciones plegables (el contenido sigue en la página y Google lo lee). Las listas largas se cortan con
  «Ver más» o paginación.
- **Formato de los bocetos** (decisión del titular, 01-11-2026): una imagen por pantalla o por pestaña, a pantalla completa y sin marco.
  Móvil: 900 × 2000 px (vertical). Ordenador: 1280 × 760 px. Esquema en grises con datos de ejemplo ficticios; el aspecto final lo da Claude Design.
- **Paso a Cloudflare antes del diseño** (decisión del titular, 06-11-2026): se monta ya la base técnica en Cloudflare
  (Astro, Workers, D1, R2, Cron Triggers, Turnstile) y se pasan los datos y la lógica, **sin plantillas visuales**.
  Las plantillas del diseño antiguo (Next.js) no se modifican y se sustituyen cuando el nuevo diseño esté aprobado. La web no está publicada, así que retirarlo no afecta al SEO; queda en el historial de Git.

---

## 20. Inventario de plantillas y piezas de diseño

### Datos aprobados de la info del local (01-11-2026)

Vegetariano (especialidad), pago con tarjeta, terraza, idiomas del personal (es/en/fr), aviso de horario de Ramadán,
foto de la entrada del local y bloque «Cerca de aquí». Sin alcohol (§1). Cualquier otro dato necesita aprobación del titular.

Total: **29 piezas de diseño** (58 pantallas: móvil y ordenador), contando la plantilla de reserva y la sección de reservas del panel + 3 archivos técnicos sin diseño (`sitemap.xml`, `robots.txt`, manifiesto PWA).

### Web: 12 plantillas

| # | Plantilla | Uso |
|---|---|---|
| 1 | Home | Portada en es/en/fr |
| 2 | **Listado único** | Todo lo que es una lista: ciudades, ciudad + tipo de lugar, tipos de lugar, guías, platos y resultados de búsqueda. Se adapta el título, la introducción, el tipo de tarjeta y los filtros |
| 3 | Info del local | Restaurantes, cafés y teterías, comida callejera y mercados; los bloques que no aplican se ocultan |
| 4 | Menú | Carta del local, precios solo en MAD |
| 5 | Plato típico | Un plato y dónde comerlo |
| 6 | Guía | Artículos editoriales |
| 7 | Acceso | Entrar (con botón «Crear cuenta»), Continuar con email (código), Continuar con Google, Continuar con huella o cara, Crear cuenta, crear con Google (elegir cuenta + último paso) y crear con huella o cara (datos + confirmación con huella o cara) |
| 8 | Escribir reseña | Estrellas, texto, fecha de visita, tipo de viaje (pareja, familia, amigos, solo), fotos |
| 9 | Mi cuenta | Reseñas, reservas, favoritos y datos (descargar o borrar la cuenta) |
| 10 | Página de texto | Legales, sobre nosotros, cómo funcionan las reseñas, contacto |
| 11 | Error y estados | 404, 500, sin conexión, mantenimiento |
| 12 | Reserva | Formulario de reserva, solicitud enviada y reserva confirmada (§18 bis) |

### Esqueleto de la web: 3 piezas

Cabecera, pie de página (navegación secundaria) y barra inferior del móvil.

### Panel: 12 plantillas

**Modo automático y manual en cada sección** (decisión del titular, 02-11-2026): cada sección del panel tiene un
**interruptor «Automático / Manual»** y dos **pestañas**:
- **Automático:** qué hace el sistema o Claude Code por sí solo, cuándo, y el historial de las últimas ejecuciones;
- **Manual:** las acciones a mano. Con el interruptor en «Manual», no se hace nada sin una persona.

Secciones con los dos modos: Escritorio (resumen de tareas automáticas), Locales, Fotos, Redirecciones, Usuarios, Auditoría,
Copias de seguridad y Reservas. Sin modo automático: Ajustes, Empleados, el formulario de un local y la vista del empleado.
**Reservas en automático: se confirman solas si hay sitio** según los ajustes del local (horas, máximo de personas, días
cerrados); las que no encajan pasan a «Manual» para el propietario o el empleado.

1. Acceso (una sola pantalla para todos los roles, §18): administración con «Continuar con Google» + código de la app
   de autenticación o con «Continuar con huella o cara»; propietarios y empleados con Google, email con código o huella o cara.
2. **Escritorio, con la moderación de reseñas y fotos dentro** (no hay sección de moderación aparte).
3. Listado genérico (locales, ciudades, platos, guías).
4. **Formulario de nuevo local / editar local, con todo en pestañas:** Información, ES, EN, FR, Fotos, Menú, Redirecciones e Historial.
   El menú y las redirecciones del local se gestionan aquí (no hay editor de menú aparte).
5. Biblioteca de fotos.
6. Redirecciones 301 (vista general de todas, también las de ciudades, platos y guías).
7. Usuarios (RGPD).
8. Auditoría.
9. **Copias de seguridad** (solo administración; sin CSV, decisión del titular, 02-11-2026):
   - lista de copias (automáticas y manuales) con fecha, contenido, tamaño, dónde se guarda (Cloudflare y fuera de Cloudflare)
     y estado; aviso en el escritorio si una falla. Las automáticas siguen §9 (base de datos a diario; fotos y configuración
     no secreta cada semana); las manuales son completas (base de datos + fotos);
   - botones «Hacer copia ahora», «Descargar» y **«Restaurar»**;
   - botón **«Crear copia»** (copia externa en el PC del titular, §9): completa, cifrada, sustituye a la anterior; y
     **«Restaurar desde archivo»** para volver a cargarla (mismas confirmaciones que «Restaurar»);
   - restaurar pide escribir RESTAURAR y el código de la app (o huella o cara), y antes hace una copia automática del estado actual.
10. Ajustes.
11. **Reservas** (decisión del titular, 01-11-2026: el panel del propietario va dentro de la plantilla del panel):
    - rol **Administración**: reservas de todos los locales, con filtros por ciudad y local;
    - rol **Propietario**: el mismo panel, pero su barra lateral solo muestra «Mi local» (Escritorio, Reservas, Información, Menú,
      Fotos, Reseñas, Empleados) y solo ve los datos de su local. Confirma o marca «No disponible» y gestiona los ajustes de reservas. En «Reseñas» ve las
      reseñas aprobadas de su local y las contesta (§3). Los textos ES/EN/FR de la info del local los escribe y publica
      **solo administración**; el propietario no los edita (decisión del titular, 06-11-2026).
    - rol **Empleado**: el mismo panel con una sola sección, **Reservas**, de su local: ver, confirmar y «No disponible». Nada más.
12. **Empleados** (solo propietario): añadir empleados por email (quedan «pendientes de activar» hasta que activan su acceso), reenviar o anular y quitar el acceso. En la interfaz no se usa la palabra «invitar».

### Esqueleto del panel: 2 piezas

Barra lateral y cabecera del panel.

---

## Registro de cambios

### 06-11-2026 (corrección de incoherencias internas, aprobada por el titular)

- §20, acceso al panel: alineado con §18 (administración con Google + código de la app o huella o cara; propietarios y empleados con Google, email con código o huella o cara).
- §20, plantilla Acceso: «Continuar con passkey» pasa a «Continuar con huella o cara», como exige §18.
- §20, Copias de seguridad: las automáticas siguen la frecuencia de §9 (base de datos diaria; fotos y configuración semanal); las manuales son completas.
- §16: «propio servidor» sustituido por R2 / nuestro dominio en Cloudflare, de acuerdo con §18 ter.
- §18 bis: la reclamación del local (§12) es la vía por la que el propietario queda registrado.
- Cabecera con la fecha real de la última actualización; registro de cambios separado por fecha (02-11 y 04-11) y entradas superadas marcadas, sin borrarlas.
- Decisión del titular: el usuario puede cancelar su reserva cuando quiera, también si está pendiente (§18 bis).
- Decisión del titular: el propietario contesta las reseñas de su local desde su panel; las respuestas pasan al MVP y se moderan como las reseñas (§3, §6, §12, §20). *(Superado: entrada siguiente.)*
- Decisión del titular: las respuestas del propietario no pasan por moderación; se publican al enviarlas, salvo las excepciones legales de §3.2 (§3, §12).
- Decisión del titular: RGPD y Ley 09-08 de Marruecos se aplican siempre, con la regla más exigente de las dos (§1, §10).
- Decisión del titular: se pasa ya la base técnica a Cloudflare (datos y lógica), sin plantillas visuales hasta que se apruebe el diseño (§19).
- Decisión del titular: los textos ES/EN/FR de la info del local los escribe solo administración, no el propietario (§20).
- Decisión del titular: reseñas sin límite total ni por local, con un máximo de 5 cada 24 horas por usuario como freno antispam (§3).
- Decisión del titular: email transaccional con Brevo, plan gratuito (§18 ter).
- Decisión del titular (06-11-2026): la copia externa se guarda en su PC con el botón «Crear copia» del panel; completa, cifrada y sustituyendo a la anterior (§9, §20).
- Web publicada en Cloudflare en tablemaroc.com (dominio comprado en Cloudflare), **sin indexar** hasta que el titular decida abrirla. D1 y R2 con jurisdicción UE (§18 ter).

### 04-11-2026 (decisiones del titular)

- Arquitectura de islas de Astro: contenido en HTML puro y solo 7 islas interactivas (reservar, favoritos, reseña, login, ver mapa, abierto ahora, buscador) (§18 ter).

### 02-11-2026 (decisiones del titular)

- Cloudflare confirmado y Hostinger descartado por el titular. Sin CSV: el panel tiene «Copias de seguridad» con hacer, descargar y restaurar (§5, §20).
- Panel: interruptor «Automático / Manual» y pestañas en cada sección; reservas confirmadas automáticamente si hay sitio (§20).
- **Stack: todo en Cloudflare** (Astro en Workers/Pages, D1, R2, Cron Triggers, Turnstile, CDN, DNS) (§18 ter). Sustituye al VPS de Hostinger.

### 01-11-2026 (decisiones del titular)

- Responsabilidades: el titular solo contrata servicios de pago y gestiona claves; Claude Code hace el resto, incluida la publicación y la moderación.
- Nunca borrar contenido publicado: modificar, fusionar con 301 o marcar como cerrado; excepciones legales mínimas.
- Sin ningún tipo de ingreso: retirados afiliados, anuncios, destacados de pago y monetización.
- Barrios y zonas eliminados por completo.
- Login sin SMS: usuarios con email + contraseña, Google y passkeys; propietarios solo con email + contraseña (y passkeys). *(Superado: login sin contraseñas, §18.)*
- Mapas sin coste por uso: mapa estático, MapLibre/OpenStreetMap bajo demanda y botón «Cómo llegar» por enlace.
- Moderación por tarea programada varias veces al día (número pendiente). *(Fijado después en 3 veces al día, §6.)*
- Público principal: turistas europeos.
- Este documento se actualiza con cada decisión del titular.
- Diseño antiguo descartado (fase 1 de Claude Design, plantillas, cabecera, pie y enlaces); nuevo diseño con Claude Design (§19).
- Panel de administración propio y reutilizable en otros proyectos; se descarta Directus (§2).
- Vocabulario: «info del local» sustituye a «ficha» en documentación e interfaz.
- Diseño: una sola pantalla por plantilla en móvil y ordenador, con pestañas y secciones plegables (§19).
- Sin alcohol en ningún lugar del producto; no se añaden funciones no aprobadas.
- Reseñas: campo «tipo de viaje» aprobado (pareja, familia, amigos, solo).
- Datos aprobados de la info del local: vegetariano, tarjeta, terraza, idiomas del personal, aviso de Ramadán, foto de la entrada y «Cerca de aquí» (§20).
- Bocetos: una imagen por pantalla o pestaña, a pantalla completa (§19).
- Platos agotados: se archivan, no aparecen en la web y no se borran (§3).
- Login del panel: solo «Continuar con Google», siempre con segundo factor (§18). *(Superado: huella o cara también para administración; propietarios y empleados con Google, email con código o huella o cara, §18.)*
- Login sin contraseñas en toda la plataforma y SMS activado: Google, email con código, SMS con código y passkey (§18). Proveedor de SMS pendiente del titular. *(Superado: SMS retirado, entrada siguiente.)*
- SMS retirado: no es necesario para las reseñas; cuentas con Google, email con código y passkey (§18).
- Reservas: solo locales con «Acepto reservas»; acceso de propietarios al panel en el MVP (Google, email con código o passkey); todos los locales tienen propietario registrado, que confirma las reservas; el titular se encarga del tema de las reservas (§2, §18 bis).
- Passkey: botón «Continuar con huella o cara» (§18).
- Huella o cara también para propietarios y administración (§18).
- Encargo para Claude Design preparado en `docs/16-encargo-claude-design.md`, con los bocetos de `diseno/`.
- Rol Empleado en el panel: solo reservas de su local (ver, confirmar, «No disponible»); los añade el propietario (§18, §20).
- Moderación automática 3 veces al día (§6).
- Idioma: base español; al entrar, el del navegador si es es/en/fr, y si no, español (§13).
- Favoritos en el MVP, disponibles sin conexión; nueva pestaña «Favoritos» en «Mi cuenta» y botón ♡ en la info del local (§12).
- Panel único con roles: el propietario usa la misma plantilla del panel, limitada a su local; la sección Reservas está en el panel (§20).
- Reservas recuperadas con la opción gestionada: solicita el usuario, confirma el propietario, aviso por email (§18 bis).
- Web: botón «Crear cuenta» en la pantalla Entrar, con pantalla propia (§18). Panel: solo Google (§18). *(La parte del panel está superada: ver §18 y §20.)*
- Panel: moderación dentro del escritorio; nuevo local con información, fotos, menú y redirecciones en pestañas (§20). Inventario: 26 piezas, 52 pantallas. *(Inventario superado: 29 piezas, §20.)*
- Inventario de diseño: 28 piezas, con un único listado para todas las listas, incluidas ciudades y búsqueda (§20). *(Inventario superado: 29 piezas, §20.)*

### Pendiente de decisión del titular

- Stack (§18 ter): plan de Cloudflare. (Email: Brevo; fotos: WebP sin GPS; copia externa: PC del titular. Decididos.)

### 29-10-2026

- Versión inicial candidata a congelación.
