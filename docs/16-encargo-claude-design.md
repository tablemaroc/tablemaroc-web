# Encargo de diseño para Claude Design

**Fecha:** 01-11-2026, actualizado el 06-11-2026 (apartado 5 bis) · **Fuente de autoridad:** `01-documento-maestro-operacion.md` (manda en caso de conflicto).
**Bocetos de estructura:** carpeta `diseno/` (un boceto por pantalla y pestaña, en móvil y ordenador).

Este documento es el texto que se pega en Claude Design. Los bocetos de `diseno/` se adjuntan como referencia de
estructura: Claude Design define el aspecto (colores, tipografía, logo, iconos), no cambia la estructura ni el contenido.

---

## 1. Qué es Tablemaroc

Guía **solo de restaurantes** de Marruecos para **turistas europeos** (sin cafés y teterías, comida callejera ni
mercados: decisión del titular, 06-11-2026).
Idiomas: **español (base), inglés y francés**. Sin publicidad, sin afiliados y sin ningún tipo de ingreso.

## 2. Usuario y contexto de uso

- **Antes del viaje:** planifica en casa, a menudo en el ordenador.
- **Durante el viaje:** móvil en la medina, con **datos en roaming o eSIM limitada**, poca cobertura, sol directo y una mano.
- **Mobile-first.** El ordenador es secundario, pero debe verse bien.

## 3. Diseño visual

- **El diseño antiguo queda descartado** (paleta arena y terracota, Fraunces y Manrope, logo de estrella). Diseño nuevo.
- Personalidad: auténtica pero sobria, de confianza, editorial. Evocar Marruecos sin tópicos.
- Contraste alto (mínimo WCAG AA) para leer al sol.
- Propuestas que necesito: paleta de colores, tipografía (como mucho 1 fuente web, el resto del sistema), logo, iconos SVG.

## 4. Reglas obligatorias

- **Una sola pantalla por plantilla, en móvil y en ordenador.** Lo que no cabe va en pestañas o secciones plegables.
  En ordenador se usan columnas. Las listas largas usan «Ver más» o páginas.
- Casi sin JavaScript (arquitectura de islas): todo el contenido en HTML y CSS, incluidas las pestañas y los plegables. Solo son interactivos: Reservar, ♡ Favoritos, Escribir reseña, Login, «Ver mapa», «Abierto ahora» y el buscador con filtros. Sin vídeos ni carruseles automáticos.
- Menos de 60 KB de HTML y CSS por página (sin fotos). Imágenes con tamaño reservado (sin saltos al cargar).
- Áreas táctiles de 44 × 44 px como mínimo. Los textos aguantan que el francés ocupe un 20–30 % más.
- **Precios solo en MAD.** El rango de precio se muestra con puntos (●●○○), nunca con «€».
- **Sin alcohol** en ningún dato, filtro, icono ni texto.
- **Sin barrios ni zonas.** Sin anuncios ni «patrocinado».
- Vocabulario: la página de cada local se llama **«info del local»**, nunca «ficha».
- Un plato agotado **no aparece** en la web (se archiva en el panel). No existe la etiqueta «Agotado».
- No se añaden funciones, campos ni filtros que no estén en este encargo.

## 5. Pantallas de la web (12 plantillas + esqueleto)

| # | Plantilla | Pantallas / pestañas | Bocetos |
|---|---|---|---|
| 1 | Home | Lista de ciudades con «Ver restaurantes», mejores restaurantes y guías (ver doc 01 §20) | `diseno/web-01-home` |
| 2 | Listado único | Ciudad · ciudad + tipo · guías · platos · búsqueda (Todo, Locales, Platos, Guías) | `diseno/web-02-listado` |
| 3 | Info del local | Arriba: foto, nombre, nota, ♡ guardar, «Abierto · cierra a las…», botones **Reservar · Cómo llegar · Llamar**, datos rápidos. Pestañas: **Info · Menú · Reseñas · Mapa** | `diseno/web-03-info-del-local` |
| 4 | Menú | Secciones plegables, precio en MAD, «Precio pendiente», fecha de verificación | `diseno/web-04-menu` |
| 5 | Plato típico | Pestañas «Dónde comerlo» y «Qué es» | `diseno/web-05-plato-tipico` |
| 6 | Guía | Entradilla y locales plegables | `diseno/web-06-guia` |
| 7 | Acceso | Entrar (con botón «Crear cuenta»), continuar con email / Google / huella o cara, crear cuenta, acceso al panel | `diseno/login/usuarios` |
| 8 | Escribir reseña | Estrellas, texto, fecha de visita, tipo de viaje (pareja, familia, amigos, solo), hasta 3 fotos; reseña enviada | `diseno/web-08-escribir-resena` |
| 9 | Mi cuenta | Pestañas Reseñas · Reservas · Favoritos · Datos | `diseno/web-09-mi-cuenta` |
| 10 | Página de texto | Legales, sobre nosotros, cómo funcionan las reseñas, contacto | `diseno/web-10-pagina-de-texto` |
| 11 | Error y estados | 404 · 500 · sin conexión · mantenimiento | `diseno/web-11-errores` |
| 12 | Reserva | Formulario · solicitud enviada · confirmada | `diseno/web-12-reserva` |
| — | Esqueleto | Cabecera · pie de página (navegación secundaria) · barra inferior del móvil (Inicio, Cuenta; sin Buscar ni Explorar desde el 06-11-2026: se busca desde el buscador de la Home) | `diseno/web-esqueleto` |

**Datos rápidos aprobados de un local:** vegetariano, pago con tarjeta, terraza, idiomas del personal (ES · EN · FR),
aviso de horario de Ramadán, foto de la entrada, «Cerca de aquí».

**Acceso sin contraseñas:** «Continuar con Google», «Continuar con email» (código de 6 cifras) y «Continuar con huella o cara».
Sin SMS y sin login con Apple.

**Mapa:** imagen estática con «Ver mapa» (OpenStreetMap, solo al pulsar) y botón «Cómo llegar» que abre la app de mapas del móvil.
Sin Google Maps dentro de la web.

## 5 bis. Decisiones posteriores que el diseño debe incluir (06-11-2026)

Estas decisiones son posteriores a los bocetos. Donde un boceto no las muestre, manda este apartado.

- **Reseñas sin límite:** una persona puede reseñar el mismo local en cada visita. Cada reseña muestra, si existe, la
  **respuesta del local** (del propietario, debajo de la reseña). En «Mi cuenta → Reseñas» se ve el estado de cada una
  (pendiente, publicada, no publicada con su motivo) y se puede editar (vuelve a revisión) o borrar.
- **Reservas:** el usuario puede **cancelar** su reserva cuando quiera, esté pendiente o confirmada («Mi cuenta → Reservas»).
  Estados visibles: pendiente de confirmar · confirmada · no disponible · cancelada. Sin pago.
- **«Abierto ahora»** (hora de Marruecos) tiene estos estados: Abierto · Cerrado · Sin horario · **«Horario de Ramadán:
  consultar»** (durante el Ramadán, si el local tiene aviso) · Cerrado temporalmente · Cerrado definitivamente.
- **Local cerrado:** la info del local sigue visible con un aviso claro. Si está cerrado definitivamente, muestra
  «Alternativas cercanas» y no muestra «Reservar».
- **Antispam (Turnstile de Cloudflare):** una casilla pequeña de verificación en «Continuar con email», «Crear cuenta con
  huella o cara» y «Escribir reseña». Reserva su espacio (unos 300 × 65 px) para que no haya saltos.
- **Reclamar un local:** enlace discreto «¿Es tu local?» en la info del local → formulario corto para el dueño: elegir una
  vía de verificación (email del dominio del local, teléfono público del local, visita al local o documento del negocio)
  y una nota opcional. Solicitud enviada → la revisa Tablemaroc.
- **Mi cuenta → Datos:** «Descargar mis datos» y «Borrar mi cuenta» (con confirmación). Nombre visible editable.
- **Sin conexión (PWA):** página «Sin conexión» en es/en/fr; un indicador discreto «Sin conexión» cuando falla la red; los
  **favoritos** se pueden ver sin conexión (nombre, dirección, indicaciones y «Cómo llegar»); aviso **«Hay una versión
  nueva · Actualizar»** (nunca recarga sola).
- **Fotos:** las de las reseñas muestran el nombre visible de su autor. Siempre con texto alternativo.
- **Cookies:** solo las imprescindibles (sesión e idioma): **no hay aviso de cookies**.
- **App instalable:** necesito el logo también como icono de app (192 × 192, 512 × 512 y una versión «maskable» con margen).
- **Correos:** plantilla sencilla para el código de acceso y los avisos de reserva (texto, sin imágenes obligatorias, sin
  enlaces de seguimiento), en es/en/fr.

## 6. Panel (12 plantillas + esqueleto)

Un único panel con tres roles: **Administración**, **Propietario** (solo su local) y **Empleado** (solo reservas de su local).

**En cada sección (Escritorio, Locales, Fotos, Redirecciones, Usuarios, Auditoría, Copias de seguridad, Reservas):** un interruptor
«Automático / Manual» y dos pestañas, «Automático» (qué hace solo y últimas ejecuciones) y «Manual» (acciones a mano).
Las reservas en automático se confirman solas si hay sitio.

| # | Plantilla | Notas | Bocetos |
|---|---|---|---|
| 1 | Acceso | Google, email o huella o cara. Administración: Google + código de la app, o huella o cara | `diseno/login/administrador` y `diseno/login/propietario` |
| 2 | Escritorio | Con la moderación de reseñas y fotos dentro | `diseno/panel-02-escritorio` |
| 3 | Listado genérico | Locales, ciudades, platos, guías | `diseno/panel-03-listado` |
| 4 | Nuevo / editar local | Pestañas: Información · ES · EN · FR · Fotos · Menú (archivar / reactivar platos) · Redirecciones · Historial | `diseno/panel-04-formulario-local` |
| 5 | Fotos | Biblioteca | `diseno/panel-05-fotos` |
| 6 | Redirecciones 301 | Vista general | `diseno/panel-06-redirecciones` |
| 7 | Usuarios | Incluye RGPD (exportar y borrar) | `diseno/panel-07-usuarios` |
| 8 | Auditoría | Con «Deshacer» | `diseno/panel-08-auditoria` |
| 9 | Copias de seguridad | Lista de copias, «Hacer copia ahora», «Descargar» y «Restaurar» (con confirmación escribiendo RESTAURAR y código). **«Crear copia»** (copia externa en el PC: la primera vez se elige carpeta y contraseña de copia; luego un clic, con barra de progreso) y **«Restaurar desde archivo»**. Sin CSV | `diseno/panel-09-copias-de-seguridad` |
| 10 | Ajustes | | `diseno/panel-10-ajustes` |
| 11 | Reservas | Vista de administración, del propietario y del empleado | `diseno/panel-11-reservas` |
| 12 | Empleados | El propietario añade empleados (sin la palabra «invitar») y les quita el acceso | `diseno/panel-12-empleados` |
| — | Esqueleto | Barra lateral (en móvil se abre con ☰) y cabecera con búsqueda global (Ctrl+K) | `diseno/panel-esqueleto` |

El panel debe ser moderno, profesional, usable en el móvil, con modo claro y oscuro, y **reutilizable en otros proyectos**
(marca, colores e idioma configurables).

## 7. Entregables

1. Sistema visual: paleta, tipografía, espaciado, iconos y logo.
2. Librería de componentes (botones, tarjetas, pestañas, chips, campos, estrellas, insignias, avisos).
3. Las pantallas de los apartados 5 y 6, en móvil (390 px) y ordenador (1280 px), una por pantalla y pestaña.
4. Notas de accesibilidad y de comportamiento de cada componente.

## 8. Total

29 piezas de diseño (12 de la web + 3 del esqueleto de la web + 12 del panel + 2 del esqueleto del panel), 58 pantallas
base en móvil y ordenador, más sus pestañas y estados (ver `diseno/`).
