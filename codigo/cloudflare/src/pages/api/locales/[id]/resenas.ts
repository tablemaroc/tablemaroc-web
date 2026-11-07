// GET /api/locales/:id/resenas?pagina=1   reseñas APROBADAS de un local publicado, con la respuesta publicada del propietario,
// sus fotos aprobadas y la valoración media (solo aprobadas, §3). Nunca se muestran email ni teléfono: solo el nombre visible.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { summarizeApproved } from '../../../../lib/resenas';

const POR_PAGINA = 10;

export const GET: APIRoute = async ({ params, url }) => {
  if (!(await env.DB.prepare(`SELECT 1 FROM places WHERE id = ? AND status = 'publicado'`).bind(params.id).first())) return json({ error: 'No existe' }, 404);
  const pagina = Math.max(1, Math.min(Number(url.searchParams.get('pagina')) || 1, 1000));
  const todas = await env.DB.prepare(`SELECT status, rating FROM reviews WHERE place_id = ? AND status = 'aprobada'`).bind(params.id).all<{ status: string; rating: number }>();
  const resumen = summarizeApproved(todas.results);
  const r = await env.DB.prepare(
    `SELECT r.id, r.rating, r.comment, r.locale, r.visited_on, r.trip_type, r.created_at, u.display_name AS autor,
            x.body AS respuesta, x.published_at AS respuesta_fecha,
            (SELECT group_concat(f.r2_key) FROM photos f WHERE f.review_id = r.id AND f.status = 'aprobada') AS fotos
     FROM reviews r JOIN users u ON u.id = r.user_id
     LEFT JOIN review_replies x ON x.review_id = r.id AND x.status = 'publicada'
     WHERE r.place_id = ? AND r.status = 'aprobada' ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
  ).bind(params.id, POR_PAGINA, (pagina - 1) * POR_PAGINA).all<Record<string, unknown> & { fotos: string | null }>();
  return json({
    media: resumen.average, total: resumen.count, pagina, porPagina: POR_PAGINA,
    resenas: r.results.map((x) => ({ ...x, fotos: x.fotos ? x.fotos.split(',').map((k) => `/${k}`) : [] })),
  }, 200, { 'Cache-Control': 'public, max-age=300' });
};
