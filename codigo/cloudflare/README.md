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
| Acceso sin contraseña: código por email, sesiones, límites | `src/lib/sesion.ts` |
| Reservas (confirmación automática) | `src/lib/reservas.ts`, `src/pages/api/reservas/` |
| Copias de seguridad a R2 | `src/lib/copias.ts` |
| Tareas programadas (moderación 3/día, copias, revisión mensual) | `src/lib/tareas.ts` |
| Descargar y borrar mis datos (RGPD + Ley 09-08) | `src/pages/api/cuenta/datos.ts` |
| Pruebas | `codigo/testing/cloudflare.test.ts` |

## Requisitos en Windows

- Node.js 26 y `npm install` en la raíz.
- **Microsoft Visual C++ Redistributable (x64)**: sin él no arrancan `workerd` (servidor local de Cloudflare) ni el build de Astro.

## Lo que hace el titular (maestro §2)

1. Crear la cuenta de Cloudflare y añadir el dominio `tablemaroc.com`.
2. `npx wrangler login`, después `npx wrangler d1 create tablemaroc` y copiar el `database_id` en `wrangler.jsonc`.
3. Crear los buckets R2 `tablemaroc-fotos` y `tablemaroc-copias`.
4. Crear los secretos con `npx wrangler secret put <NOMBRE>`: `SESSION_PEPPER`, `TURNSTILE_SECRET` y, cuando toquen,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOTP_KEY` y `EMAIL_API_KEY`.
5. Elegir el proveedor de email transaccional y dónde va la copia fuera de Cloudflare.

## Comandos (desde `codigo/cloudflare`)

| Comando | Qué hace |
|---|---|
| `npm run db:migrate:local` | Aplica el esquema a la base D1 local |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build para Cloudflare |
| `npm run db:migrate:remote` | Aplica el esquema en Cloudflare (lo lanza Claude Code tras crear el titular la base) |
