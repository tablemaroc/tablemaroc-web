// GET /api/panel/copias/:id/descargar: descarga la copia (JSON). Solo administración. Queda auditado.
import { env } from 'cloudflare:workers';
import { json } from '../../../../../lib/acceso';
import { auditar } from '../../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async ({ params }, c) => {
  const b = await env.DB.prepare(`SELECT r2_key, created_at FROM backups WHERE id = ? AND status = 'ok'`).bind(params.id).first<{ r2_key: string | null; created_at: string }>();
  if (!b?.r2_key) return json({ error: 'No existe' }, 404);
  const obj = await env.COPIAS.get(b.r2_key);
  if (!obj) return json({ error: 'El archivo de la copia no está en R2' }, 410);
  await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId: `copia:${params.id}`, accion: 'descargar_copia' }).run();
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="tablemaroc-copia-${b.created_at.slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
});
