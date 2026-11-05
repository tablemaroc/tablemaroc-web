# Tablemaroc en Cloudflare

Base técnica del maestro §18 ter (decisión del titular, 06-11-2026): **Astro en Workers, D1, R2, Cron Triggers y Turnstile**.
Sin plantillas visuales hasta que se apruebe el diseño de Claude Design (§19). El código antiguo (Next.js + Supabase)
sigue en `codigo/frontend` y `codigo/backend` hasta que se sustituya.

| Pieza | Dónde |
|---|---|
| Configuración de Cloudflare (D1, R2, Cron, variables) | `wrangler.jsonc` |
| Esquema de la base de datos (D1) | `migrations/` |
| Entrada del Worker: redirecciones 301, CSRF, cabeceras y tareas | `src/worker.ts` |
| Cabeceras de seguridad (CSP, HSTS…) | `src/lib/seguridad.ts` |
| Acceso sin contraseña: código por email, sesiones, límites | `src/lib/sesion.ts`, `src/lib/acceso.ts` |
| Continuar con email (código) y Crear cuenta | `src/pages/api/acceso/email/` |
| Continuar con Google (OAuth + PKCE) y último paso del alta | `src/lib/google.ts`, `src/pages/api/acceso/google/` |
| Segundo factor de administración (código de la app, TOTP) | `src/pages/api/acceso/segundo-factor.ts` |
| Continuar con huella o cara (passkeys) | `src/pages/api/acceso/huella/` |
| Reservas (confirmación automática) | `src/lib/reservas.ts`, `src/pages/api/reservas/` |
| Copias de seguridad a R2 | `src/lib/copias.ts` |
| Tareas programadas (moderación 3/día, copias, revisión mensual) | `src/lib/tareas.ts` |
| Descargar y borrar mis datos (RGPD + Ley 09-08) | `src/pages/api/cuenta/datos.ts` |
| Panel: permisos por rol (admin con segundo factor, propietario, empleado) | `src/lib/panel.ts` |
| Panel: escritorio, moderación, modos Automático / Manual | `src/pages/api/panel/escritorio.ts`, `moderacion/`, `modos.ts` |
| Panel: reservas, ajustes de reservas, empleados, respuestas a reseñas | `src/pages/api/panel/reservas/`, `locales/[id]/` |
| Panel: reclamaciones de local, redirecciones 301, auditoría | `src/pages/api/panel/reclamaciones/`, `redirecciones.ts`, `auditoria.ts`; `src/pages/api/locales/[id]/reclamar.ts` |
| Panel: copias (hacer, descargar, restaurar sin borrar) | `src/pages/api/panel/copias/`, `src/lib/copias.ts` |
| Panel: contenido (locales, ciudades, platos, guías), estados, apertura, traducciones es/en/fr, relaciones | `src/lib/contenido.ts`, `src/pages/api/panel/contenido/` |
| Quality Gate por entidad e idioma (`is_indexable`) | `src/lib/calidad.ts` |
| Fotos: solo WebP, sin EXIF/XMP (GPS), alt por idioma; se sirven desde `/fotos/` | `src/lib/fotos.ts`, `src/pages/api/panel/fotos/` |
| Menú: categorías, platos, precios solo en MAD, archivar agotados | `src/lib/menu.ts`, `src/pages/api/panel/locales/[id]/menu/`, `src/pages/api/panel/menu/` |
| Reseñas: escribir, editar, borrar, fotos (máx. 3) y listado público con media | `src/lib/resenas.ts`, `src/pages/api/resenas/`, `src/pages/api/locales/[id]/resenas.ts`, `src/pages/api/cuenta/resenas.ts` |
| Panel: Usuarios (buscar, exportar datos, cerrar sesiones, borrar por petición) | `src/lib/cuenta.ts`, `src/pages/api/panel/usuarios/` |
| Mi cuenta: favoritos (sin conexión) y mis reservas | `src/pages/api/cuenta/favoritos.ts`, `src/pages/api/cuenta/reservas.ts` |
| Parte pública: info del local, carta, listado único, buscador | `src/lib/publico.ts`, `src/pages/api/publico/` |
| Abierto ahora (hora de Marruecos y Ramadán) y Cerca de aquí | `src/lib/horario.ts` |
| sitemap.xml (solo indexables, hreflang es/en/fr + x-default) y robots.txt | `src/lib/seo.ts` |
| PWA: Service Worker (Cache-First, Network-First + IndexedDB 20 LRU, favoritos sin conexión), manifiesto, «Sin conexión» | `pwa/` (fuente), `scripts/preparar-pwa.mjs` (genera `public/`) |
| Pruebas | `codigo/testing/cloudflare.test.ts`; PWA en Chromium: `npm run test:e2e:pwa` |

El panel es, por ahora, **solo API** (sin pantallas, maestro §19). Claude Code lo usa con una cuenta de administración
y la cabecera `X-Origen: claude_code`, que queda en la auditoría. Restaurar copias solo lo hace una persona.

## Requisitos en Windows

- Node.js 26 y `npm install` en la raíz.
- **Microsoft Visual C++ Redistributable (x64)**: sin él no arrancan `workerd` (servidor local de Cloudflare) ni el build de Astro.
  Instalado en este PC el 06-11-2026.

## Publicada (versión de prueba)

https://tablemaroc.tablemaroc-cloudflare.workers.dev — sin indexar (`ENTORNO=prueba`). D1 y R2 con jurisdicción UE.
Desplegar: `npm run build` y `npx wrangler deploy` desde `codigo/cloudflare` (en PowerShell, `npx.cmd`).
Claves: el titular ejecuta `node scripts/crear-secretos.mjs` (genera, muestra una vez y envía a Cloudflare).

## Lo que hace el titular (maestro §2)

1. Crear la cuenta de Cloudflare y añadir el dominio `tablemaroc.com`.
2. `npx wrangler login`, después `npx wrangler d1 create tablemaroc` y copiar el `database_id` en `wrangler.jsonc`.
3. Crear los buckets R2 `tablemaroc-fotos` y `tablemaroc-copias`.
4. Crear los secretos con `npx wrangler secret put <NOMBRE>`: `SESSION_PEPPER`, `TURNSTILE_SECRET`, `TOTP_KEY`
   (32 bytes aleatorios en base64url) y, cuando toquen, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `EMAIL_API_KEY`.
   En Google Cloud, la URI de redirección autorizada es `https://tablemaroc.com/api/acceso/google/vuelta/`.
   Los correos de administración van en la variable `ADMIN_EMAILS` (no es secreta).
5. Elegir el proveedor de email transaccional y dónde va la copia fuera de Cloudflare.

## Comandos (desde `codigo/cloudflare`)

| Comando | Qué hace |
|---|---|
| `npm run db:migrate:local` | Aplica el esquema a la base D1 local |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build para Cloudflare |
| `npx wrangler dev -c dist/server/wrangler.json --local --test-scheduled` | Prueba el build en local (`http://127.0.0.1:8787`); las tareas se lanzan con `/cdn-cgi/handler/scheduled?cron=30+2+*+*+*` |
| `npm run db:migrate:remote` | Aplica el esquema en Cloudflare (lo lanza Claude Code tras crear el titular la base) |
