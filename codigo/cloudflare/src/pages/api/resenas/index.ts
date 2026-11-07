// POST /api/resenas  { placeId, puntuacion, comentario?, fechaVisita?, tipoViaje?, idioma?, turnstile }   («Escribir reseña», §20)
// Con cuenta y Turnstile (antispam). Entra PENDIENTE: solo se ve y cuenta para la media cuando se aprueba (§3).
// Sin límite total ni por local (se puede reseñar cada visita); solo un máximo de 5 cada 24 horas (decisión del titular, 06-11-2026).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, leerJson, turnstileOk } from '../../../lib/acceso';
import { auditar, nuevoId } from '../../../lib/db';
import { MENSAJES, RESENAS_POR_DIA, validarResena } from '../../../lib/resenas';
import { usuarioDe } from '../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const b = await leerJson<Record<string, unknown>>(request);
  const v = validarResena(b);
  if (!v.ok) return json({ error: 'Revisa la reseña', campos: Object.fromEntries(v.campos.map((c) => [c, MENSAJES[c]])) }, 400);
  if (!(await turnstileOk(env, b.turnstile, request.headers.get('CF-Connecting-IP')))) return json({ error: 'Comprobación antispam no superada' }, 400);

  const local = await env.DB.prepare(`SELECT 1 FROM places WHERE id = ? AND status = 'publicado'`).bind(b.placeId).first();
  if (!local) return json({ error: 'Local no encontrado' }, 404);
  // Quien tiene o trabaja en el local no lo reseña (conflicto de intereses).
  const propio = await env.DB.prepare(
    `SELECT 1 FROM place_owners WHERE place_id = ?1 AND user_id = ?2 UNION SELECT 1 FROM place_staff WHERE place_id = ?1 AND user_id = ?2 AND status = 'activo'`,
  ).bind(b.placeId, u.id).first();
  if (propio) return json({ error: 'No puedes reseñar un local que es tuyo o en el que trabajas' }, 403);
  const hoy = await env.DB.prepare(`SELECT count(*) AS n FROM reviews WHERE user_id = ? AND created_at > ?`)
    .bind(u.id, new Date(Date.now() - 86_400_000).toISOString()).first<{ n: number }>();
  if ((hoy?.n ?? 0) >= RESENAS_POR_DIA) return json({ error: `Máximo ${RESENAS_POR_DIA} reseñas cada 24 horas` }, 429);

  const id = nuevoId();
  const d = v.datos;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO reviews (id, user_id, place_id, rating, comment, locale, visited_on, trip_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, u.id, b.placeId, d.rating, d.comment, d.locale, d.visited_on, d.trip_type),
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'review', entidadId: id, accion: 'escribir', valorNuevo: { local: b.placeId, puntuacion: d.rating } }),
  ]);
  return json({ ok: true, id, estado: 'pendiente' }, 201);
};
