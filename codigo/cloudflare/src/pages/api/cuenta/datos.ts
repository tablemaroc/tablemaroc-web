// Derechos del usuario (maestro §10 y §18; RGPD arts. 15, 17 y 20; derechos de acceso y supresión de la Ley 09-08):
//   GET    /api/cuenta/datos → descarga de todos sus datos (JSON);
//   DELETE /api/cuenta/datos → borrado de la cuenta y de sus datos (excepción legal §3.2).
// Las reservas no se borran (historial, §18 bis): quedan sin usuario (user_id = NULL), sin datos personales.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { auditar } from '../../../lib/db';
import { COOKIE, usuarioDe } from '../../../lib/sesion';

export const GET: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return new Response(null, { status: 401 });
  const q = (sql: string) => env.DB.prepare(sql).bind(u.id).all().then((r) => r.results);
  const datos = {
    cuenta: await env.DB.prepare('SELECT id, email, display_name, preferred_locale, role, created_at FROM users WHERE id = ?').bind(u.id).first(),
    consentimientos: await q('SELECT purpose, version, granted, granted_at FROM consents WHERE user_id = ?'),
    resenas: await q('SELECT place_id, rating, comment, visited_on, trip_type, status, created_at FROM reviews WHERE user_id = ?'),
    fotos: await q('SELECT id, place_id, review_id, status, created_at FROM photos WHERE user_id = ?'),
    reservas: await q('SELECT place_id, party_size, requested_for, special_request, status, created_at FROM reservations WHERE user_id = ?'),
    favoritos: await q('SELECT place_id, created_at FROM favorites WHERE user_id = ?'),
    passkeys: await q('SELECT created_at, last_used_at FROM passkeys WHERE user_id = ?'),
  };
  return new Response(JSON.stringify(datos, null, 2), {
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
  if (u.role !== 'usuario') return new Response('Las cuentas de local o de administración se dan de baja desde el panel', { status: 409 });
  const fotos = await env.DB.prepare('SELECT r2_key FROM photos WHERE user_id = ?').bind(u.id).all<{ r2_key: string }>();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM photos WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id),   // en cascada: reseñas, favoritos, passkeys, sesiones, consentimientos
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'account', entidadId: u.id, accion: 'borrar_cuenta', motivo: 'Solicitud del usuario (RGPD / Ley 09-08)' }),
  ]);
  if (fotos.results.length) await env.FOTOS.delete(fotos.results.map((f) => f.r2_key));
  return new Response(null, { status: 204, headers: { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
};
