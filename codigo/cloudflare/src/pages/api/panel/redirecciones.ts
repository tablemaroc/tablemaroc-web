// GET/POST /api/panel/redirecciones: vista general de las redirecciones 301 (§3.1, §20). Solo administración.
// Siempre 301. Nunca se borran. Para evitar cadenas, al crear A → B las que apuntaban a A pasan a apuntar a B.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../lib/acceso';
import { auditar, nuevoId } from '../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../lib/panel';
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
  if (desde === hacia) return json({ error: 'El origen y el destino son iguales' }, 400);
  if (await env.DB.prepare('SELECT 1 FROM redirects WHERE from_path = ?').bind(desde).first()) return json({ error: 'Ya hay una redirección desde esa ruta' }, 409);
  if (await env.DB.prepare('SELECT 1 FROM redirects WHERE from_path = ?').bind(hacia).first()) return json({ error: 'El destino ya redirige a otra ruta: usa el destino final' }, 409);
  const id = nuevoId();
  const encadenadas = await env.DB.prepare('SELECT id, from_path FROM redirects WHERE to_path = ?').bind(desde).all<{ id: string; from_path: string }>();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO redirects (id, from_path, to_path, status_code, created_by) VALUES (?, ?, ?, 301, ?)').bind(id, desde, hacia, c.actor),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'redirect', entidadId: id, accion: 'crear', valorNuevo: { desde, hacia }, motivo: b.motivo }),
    ...encadenadas.results.flatMap((e) => [
      env.DB.prepare('UPDATE redirects SET to_path = ? WHERE id = ?').bind(hacia, e.id),
      auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'redirect', entidadId: e.id, accion: 'evitar_cadena',
        campo: 'to_path', valorAnterior: desde, valorNuevo: hacia }),
    ]),
  ]);
  return json({ ok: true, id, actualizadas: encadenadas.results.length }, 201);
});
