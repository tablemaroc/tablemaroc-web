// POST /api/panel/contenido/locales/:id/apertura  { estado: 'abierto' | 'cerrado_temporalmente' | 'cerrado_definitivamente', motivo }
// Un local cerrado NO se despublica ni se borra: muestra el aviso (§3, §3.1). Administración o el propietario del local.
// Cerrado definitivamente deja de aceptar reservas.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { auditar } from '../../../../../../lib/db';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, motivoValido, panel } from '../../../../../../lib/panel';

const ESTADOS = ['abierto', 'cerrado_temporalmente', 'cerrado_definitivamente'];

export const POST = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  if (params.tipo !== 'locales' || !(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const b = await leerJson<{ estado: string; motivo: string }>(request);
  if (!ESTADOS.includes(String(b.estado))) return json({ error: 'Estado de apertura no válido' }, 400);
  const motivo = motivoValido(b.motivo);
  if (b.estado !== 'abierto' && !motivo) return json({ error: 'Indica el motivo o la fuente del cierre' }, 400);
  const antes = await env.DB.prepare('SELECT open_status FROM places WHERE id = ?').bind(params.id).first<{ open_status: string }>();
  if (!antes) return json({ error: 'No existe' }, 404);
  if (antes.open_status === b.estado) return json({ ok: true, sinCambios: true });
  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE places SET open_status = ?, accepts_reservations = CASE WHEN ? = 'cerrado_definitivamente' THEN 0 ELSE accepts_reservations END, updated_at = ? WHERE id = ?`)
      .bind(b.estado, b.estado, ahora, params.id),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'place', entidadId: params.id!, accion: 'apertura', campo: 'open_status',
      valorAnterior: antes.open_status, valorNuevo: b.estado, motivo: motivo ?? undefined }),
  ]);
  return json({ ok: true, estado: b.estado });
});
