// POST /api/panel/locales/:id/empleados/:empleado  { accion: 'quitar_acceso' | 'anular' | 'reenviar' }
//   - quitar_acceso: el empleado activo deja de ver las reservas (no se borra: queda «sin acceso»).
//   - anular: se anula un acceso aún pendiente de activar.
//   - reenviar: vuelve a mandar el email de activación (pendiente del proveedor de email).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { auditar } from '../../../../../../lib/db';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../../../lib/panel';

export const POST = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const e = await env.DB.prepare('SELECT status, user_id FROM place_staff WHERE id = ? AND place_id = ?').bind(params.empleado, params.id)
    .first<{ status: string; user_id: string | null }>();
  if (!e) return json({ error: 'No existe' }, 404);
  const b = await leerJson<{ accion: string }>(request);
  const ahora = new Date().toISOString();
  let nuevo: string;
  if (b.accion === 'quitar_acceso' && e.status === 'activo') nuevo = 'sin_acceso';
  else if (b.accion === 'anular' && e.status === 'pendiente_activar') nuevo = 'anulado';
  else if (b.accion === 'reenviar' && e.status === 'pendiente_activar') return json({ ok: true, emailEnviado: false, motivo: 'Proveedor de email pendiente' });
  else return json({ error: 'Acción no válida para este estado' }, 409);

  const stmts = [
    env.DB.prepare('UPDATE place_staff SET status = ?, updated_at = ? WHERE id = ?').bind(nuevo, ahora, params.empleado),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'account', entidadId: params.empleado!, accion: b.accion!,
      campo: 'status', valorAnterior: e.status, valorNuevo: nuevo }),
  ];
  if (nuevo === 'sin_acceso' && e.user_id) {
    // Si ya no trabaja en ningún local, vuelve a ser una cuenta normal y se cierran sus sesiones.
    stmts.push(
      env.DB.prepare(`UPDATE users SET role = 'usuario', updated_at = ? WHERE id = ? AND role = 'empleado'
                      AND NOT EXISTS (SELECT 1 FROM place_staff WHERE user_id = ? AND status = 'activo' AND id <> ?)`)
        .bind(ahora, e.user_id, e.user_id, params.empleado),
      env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(e.user_id),
    );
  }
  await env.DB.batch(stmts);
  return json({ ok: true, estado: nuevo });
});
