// POST /api/panel/reservas/:id  { accion: 'confirmar' | 'no_disponible' }  (§18 bis, §20)
// Lo hacen el propietario, un empleado del local o administración. Solo sobre reservas pendientes.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { panel, puedeLocal, TODOS_LOS_ROLES_DEL_PANEL } from '../../../../lib/panel';
import { transicionPermitida } from '../../../../lib/reservas';

export const POST = panel(TODOS_LOS_ROLES_DEL_PANEL, async ({ params, request }, c) => {
  const b = await leerJson<{ accion: string }>(request);
  const nuevo = b.accion === 'confirmar' ? 'confirmada' : b.accion === 'no_disponible' ? 'no_disponible' : null;
  if (!nuevo) return json({ error: 'Acción no válida' }, 400);
  const r = await env.DB.prepare('SELECT place_id, status FROM reservations WHERE id = ?').bind(params.id).first<{ place_id: string; status: string }>();
  if (!r || !(await puedeLocal(c, r.place_id))) return json({ error: 'No existe' }, 404);
  if (!transicionPermitida(r.status, nuevo)) return json({ error: `La reserva está ${r.status.replace('_', ' ')}` }, 409);
  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = ?, decided_by = ?, decided_at = ?, decided_mode = 'manual', updated_at = ? WHERE id = ? AND status = 'pendiente'`)
      .bind(nuevo, c.actor, ahora, ahora, params.id),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'reservation', entidadId: params.id!, accion: b.accion!,
      campo: 'status', valorAnterior: r.status, valorNuevo: nuevo }),
  ]);
  // Aviso por email al cliente: pendiente del proveedor de email transaccional (§18 ter).
  return json({ ok: true, estado: nuevo });
});
