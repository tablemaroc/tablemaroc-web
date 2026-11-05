// POST /api/panel/contenido/:tipo/:id/estado  { estado: 'revisado' | 'publicado' | 'borrador' }   (§3). Solo administración.
// borrador → revisado → publicado; revisado puede volver a borrador; lo publicado no vuelve atrás (se mejora o se aplica §3.1).
// Para publicar hace falta al menos una traducción publicada. El Quality Gate decide después si es indexable (§4).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { recalcular } from '../../../../../../lib/calidad';
import { cambioEstadoPermitido, esTipo, TIPOS } from '../../../../../../lib/contenido';
import { auditar } from '../../../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../../../lib/panel';

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  if (!esTipo(params.tipo)) return json({ error: 'Tipo no válido' }, 404);
  const { tabla, entidad, audit } = TIPOS[params.tipo];
  const b = await leerJson<{ estado: string; motivo: string }>(request);
  const e = await env.DB.prepare(`SELECT status FROM ${tabla} WHERE id = ?`).bind(params.id).first<{ status: string }>();
  if (!e) return json({ error: 'No existe' }, 404);
  if (!cambioEstadoPermitido(e.status, String(b.estado))) {
    return json({ error: e.status === 'publicado' ? 'Lo publicado no vuelve atrás: mejóralo, márcalo como cerrado o fusiónalo con 301' : `No se puede pasar de ${e.status} a ${b.estado}` }, 409);
  }
  if (b.estado === 'publicado') {
    const t = await env.DB.prepare(`SELECT count(*) AS n FROM translations WHERE entity_type = ? AND entity_id = ? AND status = 'publicada'`).bind(entidad, params.id).first<{ n: number }>();
    if (!t?.n) return json({ error: 'Publica antes al menos una traducción (es, en o fr)' }, 409);
  }
  await env.DB.batch([
    env.DB.prepare(`UPDATE ${tabla} SET status = ?, updated_at = ? WHERE id = ?`).bind(b.estado, new Date().toISOString(), params.id),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: audit, entidadId: params.id!, accion: 'cambiar_estado', campo: 'status',
      valorAnterior: e.status, valorNuevo: b.estado, motivo: b.motivo }),
  ]);
  const informe = await recalcular(env.DB, entidad, params.id!);
  return json({ ok: true, estado: b.estado, qualityGate: informe });
});
