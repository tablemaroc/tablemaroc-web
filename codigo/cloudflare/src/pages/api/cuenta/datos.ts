// Derechos del usuario (maestro §10 y §18; RGPD arts. 15, 17 y 20; derechos de acceso y supresión de la Ley 09-08):
//   GET    /api/cuenta/datos → descarga de todos sus datos (JSON);
//   DELETE /api/cuenta/datos → borrado de la cuenta y de sus datos (excepción legal §3.2).
// Las reservas no se borran (historial, §18 bis): quedan sin usuario y sin datos personales.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { borrarCuenta, exportarDatos } from '../../../lib/cuenta';
import { COOKIE, usuarioDe } from '../../../lib/sesion';

export const GET: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return new Response(null, { status: 401 });
  return new Response(JSON.stringify(await exportarDatos(env.DB, u.id), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tablemaroc-mis-datos.json"',
      'Cache-Control': 'no-store',
    },
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return new Response(null, { status: 401 });
  const r = await borrarCuenta(env.DB, env.FOTOS, u.id, u.id, 'sistema', 'Solicitud del usuario (RGPD / Ley 09-08)');
  if (!r.ok) return new Response(r.status === 409 ? 'Las cuentas de local o de administración se dan de baja desde el panel' : r.error, { status: r.status });
  return new Response(null, { status: 204, headers: { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
};
