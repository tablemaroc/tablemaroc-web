// GET /api/panel/locales/:id/resenas: reseñas aprobadas del local con su respuesta (sección «Reseñas» del propietario, §20).
import { env } from 'cloudflare:workers';
import { json } from '../../../../../../lib/acceso';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../../../lib/panel';

export const GET = panel(ADMIN_Y_PROPIETARIO, async ({ params }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const r = await env.DB.prepare(
    `SELECT r.id, r.rating, r.comment, r.locale, r.visited_on, r.trip_type, r.created_at, u.display_name AS autor,
            x.body AS respuesta, x.status AS respuesta_estado, x.published_at AS respuesta_publicada
     FROM reviews r JOIN users u ON u.id = r.user_id LEFT JOIN review_replies x ON x.review_id = r.id
     WHERE r.place_id = ? AND r.status = 'aprobada' ORDER BY r.created_at DESC LIMIT 200`,
  ).bind(params.id).all();
  return json({ resenas: r.results });
});
