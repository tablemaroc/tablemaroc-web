// GET/PUT /api/panel/modos: interruptor «Automático / Manual» de cada sección (§20). Solo administración.
// Con «Manual», el sistema no hace nada por sí solo en esa sección (las tareas programadas quedan «omitidas»).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../lib/acceso';
import { auditar } from '../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../lib/panel';

const SECCIONES = ['escritorio', 'locales', 'fotos', 'redirecciones', 'usuarios', 'auditoria', 'copias', 'reservas'];

export const GET = panel(SOLO_ADMIN, async () => {
  const r = await env.DB.prepare('SELECT section, mode, updated_by, updated_at FROM panel_modes ORDER BY section').all();
  return json({ modos: r.results });
});

export const PUT = panel(SOLO_ADMIN, async ({ request }, c) => {
  const b = await leerJson<{ seccion: string; modo: string }>(request);
  if (!SECCIONES.includes(b.seccion ?? '')) return json({ error: 'Sección no válida' }, 400);
  if (b.modo !== 'automatico' && b.modo !== 'manual') return json({ error: 'Modo no válido' }, 400);
  const antes = await env.DB.prepare('SELECT mode FROM panel_modes WHERE section = ?').bind(b.seccion).first<{ mode: string }>();
  if (antes?.mode === b.modo) return json({ ok: true, sinCambios: true });
  await env.DB.batch([
    env.DB.prepare('UPDATE panel_modes SET mode = ?, updated_by = ?, updated_at = ? WHERE section = ?')
      .bind(b.modo, c.actor, new Date().toISOString(), b.seccion),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId: `modo:${b.seccion}`, accion: 'cambiar_modo',
      campo: 'mode', valorAnterior: antes?.mode, valorNuevo: b.modo }),
  ]);
  return json({ ok: true });
});
