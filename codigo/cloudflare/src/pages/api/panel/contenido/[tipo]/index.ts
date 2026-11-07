// GET  /api/panel/contenido/:tipo?estado=&buscar=&ciudad=   listado genérico (locales, ciudades, platos, guías; §20)
// POST /api/panel/contenido/:tipo                            nuevo, siempre en BORRADOR (no visible ni indexable, §3)
// Solo administración (incluido Claude Code). El propietario edita su local por /api/panel/contenido/locales/:id.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../lib/acceso';
import { esTipo, OBLIGATORIOS, TIPOS, validarCampos } from '../../../../../lib/contenido';
import { auditar, nuevoId } from '../../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async ({ params, url }) => {
  if (!esTipo(params.tipo)) return json({ error: 'Tipo no válido' }, 404);
  const { tabla, entidad } = TIPOS[params.tipo];
  const where: string[] = []; const args: unknown[] = [];
  const estado = url.searchParams.get('estado');
  if (estado) { where.push('e.status = ?'); args.push(estado); }
  const buscar = url.searchParams.get('buscar');
  if (buscar) { where.push('(e.slug LIKE ? OR t.title LIKE ?)'); args.push(`%${buscar}%`, `%${buscar}%`); }
  const ciudad = url.searchParams.get('ciudad');
  if (ciudad && params.tipo === 'locales') { where.push('e.city_id = ?'); args.push(ciudad); }
  const r = await env.DB.prepare(
    `SELECT e.id, e.slug, e.status, e.updated_at, t.title AS titulo_es,
            (SELECT group_concat(locale || ':' || status || ':' || is_indexable) FROM translations x WHERE x.entity_type = ? AND x.entity_id = e.id) AS traducciones
            ${params.tipo === 'locales' ? ', e.open_status, e.city_id, e.place_type_id' : ''}
     FROM ${tabla} e LEFT JOIN translations t ON t.entity_type = ? AND t.entity_id = e.id AND t.locale = 'es'
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY e.updated_at DESC LIMIT 200`,
  ).bind(entidad, entidad, ...args).all();
  return json({ elementos: r.results });
});

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  if (!esTipo(params.tipo)) return json({ error: 'Tipo no válido' }, 404);
  const { tabla, audit } = TIPOS[params.tipo];
  const b = await leerJson<Record<string, unknown>>(request);
  const e: Record<string, string> = {};
  for (const k of OBLIGATORIOS[params.tipo]) if (b[k] === undefined || b[k] === null || b[k] === '') e[k] = 'Obligatorio';
  const v = validarCampos(params.tipo, b, e);
  if (Object.keys(e).length) return json({ error: 'Revisa los campos', campos: e }, 400);
  if (await env.DB.prepare(`SELECT 1 FROM ${tabla} WHERE slug = ?`).bind(v.slug).first()) return json({ error: 'Ese slug ya existe', campos: { slug: 'Ya existe' } }, 409);
  const id = nuevoId();
  const cols = ['id', ...Object.keys(v)];
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO ${tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(id, ...Object.values(v)),
      auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: audit, entidadId: id, accion: 'crear', valorNuevo: v }),
    ]);
  } catch (err) {
    if (String(err).includes('FOREIGN KEY')) return json({ error: 'La ciudad, la región o el tipo elegidos no existen' }, 400);
    throw err;
  }
  return json({ ok: true, id, estado: 'borrador' }, 201);
});
