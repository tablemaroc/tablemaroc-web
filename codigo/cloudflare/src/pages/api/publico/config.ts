// GET /api/publico/config   datos públicos que necesitan las islas (login, reseñas): la clave PÚBLICA de Turnstile.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/acceso';

export const GET: APIRoute = () =>
  json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY, idiomas: ['es', 'en', 'fr'] }, 200, { 'Cache-Control': 'public, max-age=3600' });
