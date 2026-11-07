// POST /api/panel/moderacion/resena/:id y /api/panel/moderacion/foto/:id  { accion: 'aprobar' | 'rechazar', motivo? }
// Solo administración (incluido Claude Code, §2). El rechazo exige motivo y lo conserva (§3). Todo auditado (§7).
// Una foto aprobada debe tener origen, autoría y licencia registrados (§3).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../lib/acceso';
import { auditar } from '../../../../../lib/db';
import { motivoValido, panel, SOLO_ADMIN } from '../../../../../lib/panel';
import { recalcular } from '../../../../../lib/calidad';

const TABLA = { resena: 'reviews', foto: 'photos' } as const;
const ENTIDAD = { resena: 'review', foto: 'photo' } as const;

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  const tipo = params.tipo as keyof typeof TABLA;
  if (!(tipo in TABLA)) return json({ error: 'Tipo no válido' }, 404);
  const b = await leerJson<{ accion: string; motivo: string }>(request);
  if (b.accion !== 'aprobar' && b.accion !== 'rechazar') return json({ error: 'Acción no válida' }, 400);
  const motivo = motivoValido(b.motivo);
  if (b.accion === 'rechazar' && !motivo) return json({ error: 'El rechazo necesita un motivo' }, 400);

  const fila = await env.DB.prepare(`SELECT status${tipo === 'foto' ? ', source, author, license, place_id, city_id, dish_id, guide_id' : ''} FROM ${TABLA[tipo]} WHERE id = ?`)
    .bind(params.id).first<{ status: string; source?: string | null; author?: string | null; license?: string | null; place_id?: string | null; city_id?: string | null; dish_id?: string | null; guide_id?: string | null }>();
  if (!fila) return json({ error: 'No existe' }, 404);
  if (fila.status !== 'pendiente') return json({ error: 'Ya estaba moderada' }, 409);
  if (tipo === 'foto' && b.accion === 'aprobar' && !(fila.source && fila.author && fila.license)) {
    return json({ error: 'Faltan origen, autoría o licencia de la foto' }, 400);
  }

  const estado = b.accion === 'aprobar' ? 'aprobada' : 'rechazada';
  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE ${TABLA[tipo]} SET status = ?, rejection_reason = ?, moderated_by = ?, moderated_at = ?, updated_at = ? WHERE id = ? AND status = 'pendiente'`)
      .bind(estado, estado === 'rechazada' ? motivo : null, c.actor, ahora, ahora, params.id),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: ENTIDAD[tipo], entidadId: params.id!, accion: 'moderar',
      campo: 'status', valorAnterior: 'pendiente', valorNuevo: estado, motivo: motivo ?? undefined }),
  ]);
  // Una foto aprobada (con alt) puede hacer indexable la página de su destino (§4.2).
  if (tipo === 'foto' && estado === 'aprobada') {
    const d = fila.place_id ? ['place', fila.place_id] : fila.city_id ? ['city', fila.city_id] : fila.dish_id ? ['dish', fila.dish_id] : fila.guide_id ? ['guide', fila.guide_id] : null;
    if (d) await recalcular(env.DB, d[0] as 'place', String(d[1]));
  }
  return json({ ok: true, estado });
});
