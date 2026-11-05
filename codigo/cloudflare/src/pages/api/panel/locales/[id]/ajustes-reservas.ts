// GET/PUT /api/panel/locales/:id/ajustes-reservas  (§18 bis): acepta reservas sí/no, franjas, máximo de personas,
// aforo por franja y días cerrados. Propietario del local o administración (el empleado no cambia ajustes).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../lib/acceso';
import { auditar } from '../../../../../lib/db';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../../lib/panel';
import { validarAjustes } from '../../../../../lib/reservas';

export const GET = panel(ADMIN_Y_PROPIETARIO, async ({ params }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const r = await env.DB.prepare(
    `SELECT p.accepts_reservations, s.slots, s.max_party, s.capacity_per_slot, s.closed_days
     FROM places p LEFT JOIN reservation_settings s ON s.place_id = p.id WHERE p.id = ?`,
  ).bind(params.id).first<{ accepts_reservations: number; slots: string | null; max_party: number | null; capacity_per_slot: number | null; closed_days: string | null }>();
  if (!r) return json({ error: 'No existe' }, 404);
  return json({ acepta: r.accepts_reservations === 1, franjas: JSON.parse(r.slots ?? '[]'), maxPersonas: r.max_party ?? 8,
    aforo: r.capacity_per_slot, diasCerrados: JSON.parse(r.closed_days ?? '[]') });
});

export const PUT = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const v = validarAjustes(await leerJson<Record<string, unknown>>(request));
  if ('error' in v) return json(v, 400);
  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE places SET accepts_reservations = ?, updated_at = ? WHERE id = ?').bind(v.acepta ? 1 : 0, ahora, params.id),
    env.DB.prepare(
      `INSERT INTO reservation_settings (place_id, slots, max_party, capacity_per_slot, closed_days, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(place_id) DO UPDATE SET slots = excluded.slots, max_party = excluded.max_party,
         capacity_per_slot = excluded.capacity_per_slot, closed_days = excluded.closed_days, updated_at = excluded.updated_at`,
    ).bind(params.id, JSON.stringify(v.franjas), v.maxPersonas, v.aforo, JSON.stringify(v.diasCerrados), ahora),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'place', entidadId: params.id!, accion: 'ajustes_reservas', valorNuevo: v }),
  ]);
  return json({ ok: true });
});
