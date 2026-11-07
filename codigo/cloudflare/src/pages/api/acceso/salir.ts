// POST /api/acceso/salir: cierra la sesión.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cerrarSesion } from '../../../lib/sesion';

export const POST: APIRoute = async ({ request }) =>
  new Response(null, { status: 204, headers: { 'Set-Cookie': await cerrarSesion(request, env.DB, env.SESSION_PEPPER) } });
