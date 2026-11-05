// GET/POST /api/panel/locales/:id/empleados  (§18, §20). Solo el propietario del local (y administración).
// Añadir: por email; queda «pendiente de activar» hasta que el empleado entra con ese email verificado.
// En la interfaz no se usa la palabra «invitar».
import { env } from 'cloudflare:workers';
import { emailValido, json, leerJson } from '../../../../../../lib/acceso';
import { auditar, nuevoId } from '../../../../../../lib/db';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../../../lib/panel';

export const GET = panel(ADMIN_Y_PROPIETARIO, async ({ params }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const r = await env.DB.prepare(
    `SELECT s.id, s.email, s.status, s.created_at, u.display_name FROM place_staff s LEFT JOIN users u ON u.id = s.user_id
     WHERE s.place_id = ? ORDER BY s.created_at`,
  ).bind(params.id).all();
  return json({ empleados: r.results });
});

export const POST = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const b = await leerJson<{ email: string }>(request);
  if (!emailValido(b.email)) return json({ error: 'Email no válido' }, 400);
  const email = b.email.trim().toLowerCase();
  const otro = await env.DB.prepare(`SELECT role FROM users WHERE email = ?`).bind(email).first<{ role: string }>();
  if (otro && otro.role !== 'usuario' && otro.role !== 'empleado') return json({ error: 'Ese email ya tiene otro tipo de cuenta' }, 409);
  const ya = await env.DB.prepare('SELECT id, status FROM place_staff WHERE place_id = ? AND email = ?').bind(params.id, email).first<{ id: string; status: string }>();
  if (ya && (ya.status === 'activo' || ya.status === 'pendiente_activar')) return json({ error: 'Ya está añadido' }, 409);
  const id = ya?.id ?? nuevoId();
  const ahora = new Date().toISOString();
  await env.DB.batch([
    ya
      ? env.DB.prepare(`UPDATE place_staff SET status = 'pendiente_activar', user_id = NULL, added_by = ?, updated_at = ? WHERE id = ?`).bind(c.u.id, ahora, id)
      : env.DB.prepare(`INSERT INTO place_staff (id, place_id, email, added_by) VALUES (?, ?, ?, ?)`).bind(id, params.id, email, c.u.id),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'account', entidadId: id, accion: 'añadir_empleado', valorNuevo: { local: params.id, email } }),
  ]);
  // Email de activación: pendiente del proveedor de email transaccional (§18 ter).
  return json({ ok: true, id, estado: 'pendiente_activar', emailEnviado: false }, 201);
});
