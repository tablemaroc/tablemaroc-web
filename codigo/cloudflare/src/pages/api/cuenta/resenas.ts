// GET /api/cuenta/resenas   «Mi cuenta → Mis reseñas» (§20): todas las mías con su estado y, si se rechazó, el motivo.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/acceso';
import { usuarioDe } from '../../../lib/sesion';

export const GET: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const r = await env.DB.prepare(
    `SELECT r.id, r.place_id, p.slug AS local, r.rating, r.comment, r.visited_on, r.trip_type, r.status, r.rejection_reason, r.created_at,
            (SELECT count(*) FROM photos f WHERE f.review_id = r.id) AS fotos, x.body AS respuesta
     FROM reviews r JOIN places p ON p.id = r.place_id LEFT JOIN review_replies x ON x.review_id = r.id AND x.status = 'publicada'
     WHERE r.user_id = ? ORDER BY r.created_at DESC`,
  ).bind(u.id).all();
  return json({ resenas: r.results });
};
