// GET/POST /api/panel/redirecciones: vista general de las redirecciones 301 (§3.1, §20). Solo administración.
// Siempre 301. Nunca se borran. Para evitar cadenas, al crear A → B las que apuntaban a A pasan a apuntar a B.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../lib/acceso';
import { panel, SOLO_ADMIN } from '../../../lib/panel';
import { sentenciasRedireccion } from '../../../lib/redirecciones';
import { normalizarRuta } from '../../../lib/rutas';

export const GET = panel(SOLO_ADMIN, async ({ url }) => {
  const q = url.searchParams.get('buscar');
  const r = q
    ? await env.DB.prepare(`SELECT * FROM redirects WHERE from_path LIKE ? OR to_path LIKE ? ORDER BY created_at DESC LIMIT 500`).bind(`%${q}%`, `%${q}%`).all()
    : await env.DB.prepare(`SELECT * FROM redirects ORDER BY created_at DESC LIMIT 500`).all();
  return json({ redirecciones: r.results });
});

export const POST = panel(SOLO_ADMIN, async ({ request }, c) => {
  const b = await leerJson<{ desde: string; hacia: string; motivo: string }>(request);
  const desde = normalizarRuta(b.desde); const hacia = normalizarRuta(b.hacia);
  if (!desde || !hacia) return json({ error: 'Rutas no válidas: deben empezar por /es/, /en/ o /fr/' }, 400);
  if (await env.DB.prepare('SELECT 1 FROM redirects WHERE from_path = ?').bind(hacia).first()) {
    return json({ error: 'El destino ya redirige a otra ruta: usa el destino final' }, 409);
  }
  const { stmts, resultado } = await sentenciasRedireccion(env.DB, desde, hacia, c.actor, c.origen, b.motivo);
  if (!resultado.ok) return json({ error: resultado.error }, resultado.status);
  await env.DB.batch(stmts);
  return json({ ok: true, id: resultado.id, actualizadas: resultado.actualizadas }, 201);
});
