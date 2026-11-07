// GET /api/panel/auditoria?entidad=place&id=…&actor=…&origen=claude_code&desde=2026-11-01  (§7, §20). Solo administración.
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/acceso';
import { panel, SOLO_ADMIN } from '../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async ({ url }) => {
  const where: string[] = []; const args: unknown[] = [];
  const filtro = (param: string, sql: string) => { const v = url.searchParams.get(param); if (v) { where.push(sql); args.push(v); } };
  filtro('entidad', 'entidad_tipo = ?');
  filtro('id', 'entidad_id = ?');
  filtro('actor', 'actor = ?');
  filtro('origen', 'origen = ?');
  filtro('desde', 'fecha >= ?');
  const limite = Math.min(Math.max(Number(url.searchParams.get('limite')) || 100, 1), 500);
  const r = await env.DB.prepare(`SELECT * FROM audit_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY fecha DESC LIMIT ${limite}`)
    .bind(...args).all();
  return json({ registros: r.results });
});
