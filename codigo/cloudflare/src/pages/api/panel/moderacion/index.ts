// GET /api/panel/moderacion: cola de reseñas y fotos pendientes (moderación dentro del Escritorio, §20). Solo administración.
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { panel, SOLO_ADMIN } from '../../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async () => {
  const resenas = await env.DB.prepare(
    `SELECT r.id, r.place_id, p.slug AS local, r.rating, r.comment, r.locale, r.visited_on, r.trip_type, r.created_at,
            u.display_name AS autor
     FROM reviews r JOIN places p ON p.id = r.place_id JOIN users u ON u.id = r.user_id
     WHERE r.status = 'pendiente' ORDER BY r.created_at LIMIT 100`,
  ).all();
  const fotos = await env.DB.prepare(
    `SELECT id, place_id, review_id, dish_id, guide_id, city_id, r2_key, source, author, license, created_at
     FROM photos WHERE status = 'pendiente' ORDER BY created_at LIMIT 100`,
  ).all();
  return json({ resenas: resenas.results, fotos: fotos.results });
});
