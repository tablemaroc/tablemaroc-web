// GET /api/panel/reservas?estado=pendiente&local=…&ciudad=…  (§20)
// Administración: todos los locales, con filtros por ciudad y local. Propietario y empleado: solo su local.
// No se muestra el email del cliente: solo su nombre visible (minimización, §10).
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { localesDe, panel, TODOS_LOS_ROLES_DEL_PANEL } from '../../../../lib/panel';

const ESTADOS = ['pendiente', 'confirmada', 'no_disponible', 'cancelada'];

export const GET = panel(TODOS_LOS_ROLES_DEL_PANEL, async ({ url }, c) => {
  const locales = await localesDe(c);
  const where: string[] = []; const args: unknown[] = [];
  const estado = url.searchParams.get('estado');
  if (estado) { if (!ESTADOS.includes(estado)) return json({ error: 'Estado no válido' }, 400); where.push('r.status = ?'); args.push(estado); }
  const local = url.searchParams.get('local');
  if (local) { where.push('r.place_id = ?'); args.push(local); }
  const ciudad = url.searchParams.get('ciudad');
  if (ciudad && locales === null) { where.push('c.slug = ?'); args.push(ciudad); }
  if (locales !== null) {
    if (!locales.length) return json({ reservas: [] });
    where.push(`r.place_id IN (${locales.map(() => '?').join(',')})`); args.push(...locales);
  }
  const r = await env.DB.prepare(
    `SELECT r.id, r.place_id, p.slug AS local, c.slug AS ciudad, r.party_size, r.requested_for, r.special_request, r.status,
            r.decided_mode, r.decided_at, r.created_at, u.display_name AS cliente
     FROM reservations r JOIN places p ON p.id = r.place_id JOIN cities c ON c.id = p.city_id LEFT JOIN users u ON u.id = r.user_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.requested_for LIMIT 200`,
  ).bind(...args).all();
  return json({ reservas: r.results });
});
