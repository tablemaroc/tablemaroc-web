// POST /api/panel/reclamaciones/:id  { accion: 'aprobar' | 'rechazar', motivo? }  (solo administración)
// Aprobar registra al propietario del local (§18 bis) y le da el rol «Propietario». Exige email verificado.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { motivoValido, panel, SOLO_ADMIN } from '../../../../lib/panel';

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  const b = await leerJson<{ accion: string; motivo: string }>(request);
  const cl = await env.DB.prepare(
    `SELECT b.place_id, b.user_id, b.method, b.status, u.role, u.email_verified_at FROM business_claims b JOIN users u ON u.id = b.user_id WHERE b.id = ?`,
  ).bind(params.id).first<{ place_id: string; user_id: string; method: string; status: string; role: string; email_verified_at: string | null }>();
  if (!cl) return json({ error: 'No existe' }, 404);
  if (cl.status !== 'pendiente') return json({ error: 'Ya estaba resuelta' }, 409);
  const ahora = new Date().toISOString();

  if (b.accion === 'rechazar') {
    const motivo = motivoValido(b.motivo);
    if (!motivo) return json({ error: 'El rechazo necesita un motivo' }, 400);
    await env.DB.batch([
      env.DB.prepare(`UPDATE business_claims SET status = 'rechazada', rejection_reason = ? WHERE id = ?`).bind(motivo, params.id),
      auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'place', entidadId: cl.place_id, accion: 'rechazar_reclamacion', motivo }),
    ]);
    return json({ ok: true, estado: 'rechazada' });
  }
  if (b.accion !== 'aprobar') return json({ error: 'Acción no válida' }, 400);
  if (!cl.email_verified_at) return json({ error: 'La cuenta debe tener el email verificado (código por email o Google)' }, 409);
  if (cl.role === 'admin') return json({ error: 'Una cuenta de administración no puede ser propietaria' }, 409);
  if (await env.DB.prepare('SELECT 1 FROM place_owners WHERE place_id = ?').bind(cl.place_id).first()) return json({ error: 'El local ya tiene propietario' }, 409);

  await env.DB.batch([
    env.DB.prepare(`UPDATE business_claims SET status = 'aprobada' WHERE id = ?`).bind(params.id),
    env.DB.prepare(`INSERT INTO place_owners (place_id, user_id, verified_at, verification_method) VALUES (?, ?, ?, ?)`).bind(cl.place_id, cl.user_id, ahora, cl.method),
    env.DB.prepare(`UPDATE users SET role = 'propietario', updated_at = ? WHERE id = ?`).bind(ahora, cl.user_id),
    env.DB.prepare(`UPDATE business_claims SET status = 'rechazada', rejection_reason = 'Otra solicitud aprobada para este local' WHERE place_id = ? AND status = 'pendiente' AND id <> ?`)
      .bind(cl.place_id, params.id),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'place', entidadId: cl.place_id, accion: 'aprobar_reclamacion',
      valorNuevo: { propietario: cl.user_id, via: cl.method } }),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'account', entidadId: cl.user_id, accion: 'rol', campo: 'role',
      valorAnterior: cl.role, valorNuevo: 'propietario' }),
  ]);
  return json({ ok: true, estado: 'aprobada' });
});
