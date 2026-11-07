// GET /api/panel/reclamaciones?estado=pendiente: solicitudes de propietarios (solo administración).
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { panel, SOLO_ADMIN } from '../../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async ({ url }) => {
  const estado = url.searchParams.get('estado') ?? 'pendiente';
  if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) return json({ error: 'Estado no válido' }, 400);
  const r = await env.DB.prepare(
    `SELECT b.id, b.place_id, p.slug AS local, b.method, b.evidence, b.status, b.rejection_reason, b.created_at,
            u.display_name, u.email, u.email_verified_at
     FROM business_claims b JOIN places p ON p.id = b.place_id JOIN users u ON u.id = b.user_id
     WHERE b.status = ? ORDER BY b.created_at LIMIT 200`,
  ).bind(estado).all();
  return json({ reclamaciones: r.results });
});
