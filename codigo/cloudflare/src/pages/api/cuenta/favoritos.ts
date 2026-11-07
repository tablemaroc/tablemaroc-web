// Favoritos (maestro §12: MVP, disponibles sin conexión en el móvil). «Mi cuenta → Favoritos» y botón ♡ de la info del local.
//   GET    /api/cuenta/favoritos             mis favoritos (con lo necesario para guardarlos sin conexión)
//   POST   /api/cuenta/favoritos { placeId }  añadir
//   DELETE /api/cuenta/favoritos { placeId }  quitar (es un dato del propio usuario, no contenido publicado)
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../lib/acceso';
import { usuarioDe } from '../../../lib/sesion';

const MAX_FAVORITOS = 500;

export const GET: APIRoute = async ({ request, url }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const idioma = ['es', 'en', 'fr'].includes(url.searchParams.get('idioma') ?? '') ? url.searchParams.get('idioma')! : 'es';
  const r = await env.DB.prepare(
    `SELECT f.place_id, f.created_at, p.slug, pt.slug AS tipo, c.slug AS ciudad, p.lat, p.lng, p.address, p.open_status,
            coalesce(t.title, te.title) AS nombre, coalesce(t.directions, te.directions) AS indicaciones
     FROM favorites f JOIN places p ON p.id = f.place_id JOIN place_types pt ON pt.id = p.place_type_id JOIN cities c ON c.id = p.city_id
     LEFT JOIN translations t ON t.entity_type = 'place' AND t.entity_id = p.id AND t.locale = ? AND t.status = 'publicada'
     LEFT JOIN translations te ON te.entity_type = 'place' AND te.entity_id = p.id AND te.locale = 'es' AND te.status = 'publicada'
     WHERE f.user_id = ? AND p.status = 'publicado' ORDER BY f.created_at DESC`,
  ).bind(idioma, u.id).all();
  return json({ favoritos: r.results });
};

export const POST: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const b = await leerJson<{ placeId: string }>(request);
  if (!(await env.DB.prepare(`SELECT 1 FROM places WHERE id = ? AND status = 'publicado'`).bind(b.placeId).first())) return json({ error: 'Local no encontrado' }, 404);
  const n = await env.DB.prepare('SELECT count(*) AS n FROM favorites WHERE user_id = ?').bind(u.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_FAVORITOS) return json({ error: `Máximo ${MAX_FAVORITOS} favoritos` }, 409);
  await env.DB.prepare('INSERT OR IGNORE INTO favorites (user_id, place_id) VALUES (?, ?)').bind(u.id, b.placeId).run();
  return json({ ok: true }, 201);
};

export const DELETE: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const b = await leerJson<{ placeId: string }>(request);
  await env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND place_id = ?').bind(u.id, b.placeId).run();
  return new Response(null, { status: 204 });
};
