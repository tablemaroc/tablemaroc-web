// PUT /api/panel/locales/:id/resenas/:resena  { texto, publicar?: boolean }
// El propietario contesta las reseñas aprobadas de su local, una respuesta por reseña, SIN moderación (§3, 06-11-2026):
// con publicar = true (por defecto) se publica al enviarla. Solo aplican las excepciones legales de §3.2.
// Una respuesta publicada se puede corregir (queda auditado), no borrar (§1).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { auditar, nuevoId } from '../../../../../../lib/db';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../../../lib/panel';

const RESPUESTA_MAX = 1500;

export const PUT = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const resena = await env.DB.prepare(`SELECT 1 FROM reviews WHERE id = ? AND place_id = ? AND status = 'aprobada'`).bind(params.resena, params.id).first();
  if (!resena) return json({ error: 'Solo se contestan reseñas aprobadas del local' }, 404);
  const b = await leerJson<{ texto: string; publicar: boolean }>(request);
  const texto = typeof b.texto === 'string' ? b.texto.trim() : '';
  if (texto.length < 2 || texto.length > RESPUESTA_MAX) return json({ error: `La respuesta debe tener entre 2 y ${RESPUESTA_MAX} caracteres` }, 400);

  const antes = await env.DB.prepare('SELECT id, body, status FROM review_replies WHERE review_id = ?').bind(params.resena).first<{ id: string; body: string; status: string }>();
  const publicar = b.publicar !== false || antes?.status === 'publicada';   // lo publicado no vuelve a borrador
  const estado = publicar ? 'publicada' : 'borrador';
  const ahora = new Date().toISOString();
  const id = antes?.id ?? nuevoId();
  await env.DB.batch([
    antes
      ? env.DB.prepare(`UPDATE review_replies SET body = ?, status = ?, author_id = ?, published_at = coalesce(published_at, ?), updated_at = ? WHERE id = ?`)
          .bind(texto, estado, c.u.id, publicar ? ahora : null, ahora, id)
      : env.DB.prepare(`INSERT INTO review_replies (id, review_id, author_id, body, status, published_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(id, params.resena, c.u.id, texto, estado, publicar ? ahora : null),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'review', entidadId: params.resena!, accion: antes ? 'editar_respuesta' : 'responder',
      campo: 'respuesta', valorAnterior: antes ? { texto: antes.body, estado: antes.status } : undefined, valorNuevo: { texto, estado } }),
  ]);
  return json({ ok: true, estado });
});
