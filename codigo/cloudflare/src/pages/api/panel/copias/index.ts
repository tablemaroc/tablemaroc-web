// GET  /api/panel/copias: lista de copias (automáticas y manuales) con fecha, contenido, tamaño, dónde y estado (§20).
// POST /api/panel/copias: «Hacer copia ahora». Solo administración (sin CSV, decisión del 02-11-2026).
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { copiarBase } from '../../../../lib/copias';
import { auditar } from '../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async () => {
  const r = await env.DB.prepare(
    `SELECT id, kind, contents, size_bytes, status, error, created_by, created_at,
            CASE WHEN external_copy = 1 THEN 'Cloudflare y fuera de Cloudflare' ELSE 'Cloudflare' END AS donde
     FROM backups ORDER BY created_at DESC LIMIT 100`,
  ).all();
  const fallo = await env.DB.prepare(`SELECT created_at, error FROM backups WHERE status = 'error' ORDER BY created_at DESC LIMIT 1`).first();
  return json({ copias: r.results, ultimoFallo: fallo ?? null, copiaExterna: 'Pendiente del titular (maestro §18 ter)' });
});

export const POST = panel(SOLO_ADMIN, async (_ctx, c) => {
  const r = await copiarBase(env.DB, env.COPIAS, 'manual', c.actor);
  await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId: `copia:${r.id}`, accion: 'hacer_copia',
    valorNuevo: { ok: r.ok } }).run();
  return r.ok ? json({ ok: true, id: r.id }, 201) : json({ error: 'La copia ha fallado', detalle: r.error }, 500);
});
