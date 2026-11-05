// GET /api/cuenta/reservas   «Mi cuenta → Mis reservas» (§18 bis): estado de cada solicitud. Se pueden cancelar cuando se quiera.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/acceso';
import { usuarioDe } from '../../../lib/sesion';

export const GET: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const r = await env.DB.prepare(
    `SELECT r.id, r.place_id, p.slug AS local, r.party_size, r.requested_for, r.special_request, r.status, r.created_at,
            r.status IN ('pendiente','confirmada') AS se_puede_cancelar
     FROM reservations r JOIN places p ON p.id = r.place_id WHERE r.user_id = ? ORDER BY r.requested_for DESC`,
  ).bind(u.id).all();
  return json({ reservas: r.results });
};
