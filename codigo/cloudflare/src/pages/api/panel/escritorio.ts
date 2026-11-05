// GET /api/panel/escritorio: resumen (§20). Administración: todo, con avisos de copias fallidas y últimas tareas automáticas.
// Propietario y empleado: solo su local.
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/acceso';
import { localesDe, panel, TODOS_LOS_ROLES_DEL_PANEL } from '../../../lib/panel';

export const GET = panel(TODOS_LOS_ROLES_DEL_PANEL, async (_ctx, c) => {
  const locales = await localesDe(c);
  if (locales === null) {
    const r = await env.DB.prepare(
      `SELECT (SELECT count(*) FROM reviews WHERE status = 'pendiente') AS resenas_pendientes,
              (SELECT count(*) FROM photos WHERE status = 'pendiente') AS fotos_pendientes,
              (SELECT count(*) FROM reservations WHERE status = 'pendiente') AS reservas_pendientes,
              (SELECT count(*) FROM business_claims WHERE status = 'pendiente') AS reclamaciones_pendientes,
              (SELECT count(*) FROM backups WHERE status = 'error' AND created_at > datetime('now','-7 days')) AS copias_fallidas_7_dias`,
    ).first();
    const tareas = await env.DB.prepare('SELECT job, status, summary, started_at FROM job_runs ORDER BY started_at DESC LIMIT 10').all();
    const modos = await env.DB.prepare('SELECT section, mode FROM panel_modes').all();
    return json({ rol: c.u.role, resumen: r, ultimasTareas: tareas.results, modos: modos.results });
  }
  if (!locales.length) return json({ rol: c.u.role, locales: [], resumen: null });
  const marcas = locales.map(() => '?').join(',');
  const r = await env.DB.prepare(
    `SELECT (SELECT count(*) FROM reservations WHERE place_id IN (${marcas}) AND status = 'pendiente') AS reservas_pendientes,
            (SELECT count(*) FROM reservations WHERE place_id IN (${marcas}) AND status = 'confirmada' AND requested_for >= strftime('%Y-%m-%dT%H:%M','now')) AS reservas_proximas,
            (SELECT count(*) FROM reviews r WHERE r.place_id IN (${marcas}) AND r.status = 'aprobada'
               AND NOT EXISTS (SELECT 1 FROM review_replies x WHERE x.review_id = r.id AND x.status = 'publicada')) AS resenas_sin_respuesta`,
  ).bind(...locales, ...locales, ...locales).first();
  return json({ rol: c.u.role, locales, resumen: r });
});
