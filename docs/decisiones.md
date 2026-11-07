# Decisiones de Tablemaroc

## Marca
- Nombre: Tablemaroc. Dominio: tablemaroc.com (disponible; marcas y redes revisadas por el titular).
- Enfoque nacional: Marruecos.

## Producto
- Gastronomía: restaurantes, cafés y teterías, comida callejera, mercados y zocos, platos típicos, guías gastronómicas, ciudades y barrios.
- Cuentas de usuario y reseñas con moderación previa. Reseñas al estilo Google Business: puntuación única de 1 a 5 estrellas, comentario y fotos.
- Login: email, Google y teléfono (el SMS tiene coste por mensaje; valorar si es imprescindible en el MVP).
- Panel de administración: necesario e importante. Alta y edición de lugares con fotos, moderación de reseñas y fotos, gestión de traducciones y estados. Interfaz en `codigo/frontend/admin-panel/`, lógica en `codigo/backend/admin-moderation/`.
- Responder a las reseñas: en el MVP Claude Code solo prepara borradores para revisión del titular; la publicación queda para la Fase 2 (documento maestro §3). El titular confirma que todos los locales han dado su autorización para responder en su nombre.
- Menú digital en el MVP. Sin reservas (decisión del 30-10-2026).
- Precios de menús exclusivamente en MAD, sin conversiones ni campo de moneda (`docs/12-especificacion-precios-mad.md`).
- Mapa interactivo con carga diferida (IntersectionObserver), placeholder sin CLS y fallback a los 3000 ms desde que empieza la carga.
- IndexedDB con máximo 20 páginas (LRU) y cachés del Service Worker versionadas.
- PWA/mobile-first y fallback de mapas (`docs/10-...` y `docs/11-...`).
- Documento maestro y matriz de autoridad: `docs/01-...` y `docs/09-...`.
- Mapas con Google Maps. Fase 1: mostrar el lugar y botón "Cómo llegar" (abre Google Maps o Apple Maps). Fase 2: seguimiento en tiempo real.
- Datos de lugares: carga manual; el titular aporta la información. Google Maps para el mapa. Google Places y Google Business quedan para una fase posterior.

## Idiomas
- Idiomas oficiales: español (`es`), inglés (`en`) y francés (`fr`). URLs `/es/`, `/en/`, `/fr/`; `hreflang` solo entre esas tres.
- Árabe retirado del producto actual: sin `/ar/`, sin `hreflang ar`, sin RTL.
- Más idiomas solo si el titular lo decide en una fase posterior.
- Cada idioma se indexa solo cuando su contenido está realmente traducido.

## Técnica
- Next.js (App Router), TypeScript, PostgreSQL en Supabase.
- Backend separado del frontend.
- Sin exportación estática: renderizado en servidor.
- Hosting: VPS KVM 1 de Hostinger (1 vCPU, 4 GB RAM, 50 GB NVMe), 24 meses, Ubuntu LTS limpio.
- Región del servidor en Europa y misma región en Supabase.
- Los builds se hacen en el equipo local o en CI (GitHub Actions), no en el servidor.

## Trabajo
- Todo el desarrollo lo hace Claude Code, con supervisión del titular.
- Herramientas de medición: Google Search Console (indexación y rendimiento en búsqueda), PageSpeed Insights y Lighthouse (velocidad y Core Web Vitals).
- Search Console: se empieza con informes descargados (CSV) que el titular entrega a Claude Code. No se pide indexación manual en masa; Google descubre las páginas con los sitemaps.
- Claude Code puede crear, editar, generar y subir contenido (en borrador) siguiendo `ordenes-claude-code/gestionar-contenido/orden.md`; publicar requiere aprobación del titular. Claude Code nunca elimina contenido ni URLs.
- Los pagos y las claves de servicios los gestiona el titular.
- Ordenador de trabajo: Windows. Se necesitan Git, Node.js y una cuenta de GitHub.

## Pendiente de decidir
- Proveedor de SMS para el login por teléfono.
- Hoja de cálculo para la carga inicial de lugares (Excel, CSV o Google Sheets).
- Lista completa y vigente: `docs/08-pendientes-decidir.md`.
- Recetas como contenido (además de platos típicos).
