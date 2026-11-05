// PUT    /api/resenas/:id   el autor edita su reseña → vuelve a PENDIENTE de moderación (deja de verse hasta que se aprueba)
// DELETE /api/resenas/:id   el autor borra su reseña (derecho de supresión: RGPD y Ley 09-08, excepción legal §3.2)
// Solo el autor. Las fotos de la reseña se borran con ella.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { MENSAJES, validarResena } from '../../../../lib/resenas';
import { usuarioDe } from '../../../../lib/sesion';

const mia = async (id: string | undefined, userId: string) =>
  env.DB.prepare('SELECT id, status, rating, comment FROM reviews WHERE id = ? AND user_id = ?').bind(id, userId)
    .first<{ id: string; status: string; rating: number; comment: string | null }>();

export const PUT: APIRoute = async ({ request, params }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const r = await mia(params.id, u.id);
  if (!r) return json({ error: 'No existe' }, 404);
  const v = validarResena(await leerJson<Record<string, unknown>>(request));
  if (!v.ok) return json({ error: 'Revisa la reseña', campos: Object.fromEntries(v.campos.map((c) => [c, MENSAJES[c]])) }, 400);
  const d = v.datos;
  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE reviews SET rating = ?, comment = ?, locale = ?, visited_on = ?, trip_type = ?, status = 'pendiente',
                    rejection_reason = NULL, moderated_by = NULL, moderated_at = NULL, updated_at = ? WHERE id = ?`)
      .bind(d.rating, d.comment, d.locale, d.visited_on, d.trip_type, ahora, r.id),
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'review', entidadId: r.id, accion: 'editar',
      valorAnterior: { estado: r.status, puntuacion: r.rating }, valorNuevo: { estado: 'pendiente', puntuacion: d.rating } }),
  ]);
  return json({ ok: true, estado: 'pendiente' });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const r = await mia(params.id, u.id);
  if (!r) return json({ error: 'No existe' }, 404);
  const fotos = await env.DB.prepare('SELECT r2_key FROM photos WHERE review_id = ?').bind(r.id).all<{ r2_key: string }>();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(r.id),              // en cascada: respuesta y fotos de la reseña
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'review', entidadId: r.id, accion: 'borrar', motivo: 'Solicitud del autor (RGPD / Ley 09-08)' }),
  ]);
  if (fotos.results.length) await env.FOTOS.delete(fotos.results.map((f) => f.r2_key));
  return new Response(null, { status: 204 });
};
