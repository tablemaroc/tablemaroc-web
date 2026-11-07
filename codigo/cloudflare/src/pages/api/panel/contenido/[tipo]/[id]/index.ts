// GET /api/panel/contenido/:tipo/:id   todo en pestañas (§20): Información, ES/EN/FR, Fotos, Redirecciones, Historial y Quality Gate
// PUT /api/panel/contenido/:tipo/:id   cambia campos. Administración: todos. Propietario: solo la información de SU local.
// Cambiar el slug de algo publicado crea las redirecciones 301 de las URLs antiguas en los tres idiomas (§2, §3.1).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { recalcular, IDIOMAS } from '../../../../../../lib/calidad';
import { CAMPOS_PROPIETARIO, esTipo, rutaPublica, TIPOS, validarCampos } from '../../../../../../lib/contenido';
import { auditar } from '../../../../../../lib/db';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../../../lib/panel';
import { sentenciasRedireccion } from '../../../../../../lib/redirecciones';

async function permitido(tipo: string, id: string, c: Parameters<typeof esPropietarioDe>[0]) {
  if (c.u.role === 'admin') return true;
  return tipo === 'locales' && (await esPropietarioDe(c, id));
}

export const GET = panel(ADMIN_Y_PROPIETARIO, async ({ params }, c) => {
  if (!esTipo(params.tipo) || !(await permitido(params.tipo, params.id!, c))) return json({ error: 'No existe' }, 404);
  const { tabla, entidad, audit } = TIPOS[params.tipo];
  const e = await env.DB.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).bind(params.id).first();
  if (!e) return json({ error: 'No existe' }, 404);
  const traducciones = await env.DB.prepare(`SELECT * FROM translations WHERE entity_type = ? AND entity_id = ? ORDER BY locale`).bind(entidad, params.id).all();
  const col = { place: 'place_id', city: 'city_id', dish: 'dish_id', guide: 'guide_id' }[entidad];
  const fotos = await env.DB.prepare(
    `SELECT f.id, f.r2_key, f.status, f.is_entrance, f.source, f.author, f.license,
            (SELECT group_concat(locale || '=' || alt, ' | ') FROM photo_translations a WHERE a.photo_id = f.id) AS alts
     FROM photos f WHERE f.${col} = ? ORDER BY f.created_at`,
  ).bind(params.id).all();
  const historial = c.u.role === 'admin'
    ? (await env.DB.prepare(`SELECT fecha, actor, origen, accion, campo, motivo FROM audit_log WHERE entidad_tipo = ? AND entidad_id = ? ORDER BY fecha DESC LIMIT 50`).bind(audit, params.id).all()).results
    : undefined;
  const informe = await recalcular(env.DB, entidad, params.id!);
  return json({ elemento: e, traducciones: traducciones.results, fotos: fotos.results, historial, qualityGate: informe });
});

export const PUT = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  if (!esTipo(params.tipo) || !(await permitido(params.tipo, params.id!, c))) return json({ error: 'No existe' }, 404);
  const tipo = params.tipo;
  const { tabla, entidad, audit } = TIPOS[tipo];
  const b = await leerJson<Record<string, unknown>>(request);
  if (c.u.role !== 'admin') {
    const otros = Object.keys(b).filter((k) => !CAMPOS_PROPIETARIO.includes(k));
    if (otros.length) return json({ error: `Como propietario no puedes cambiar: ${otros.join(', ')}` }, 403);
  }
  const e: Record<string, string> = {};
  const v = validarCampos(tipo, b, e);
  if (Object.keys(e).length) return json({ error: 'Revisa los campos', campos: e }, 400);
  if (!Object.keys(v).length) return json({ error: 'Nada que cambiar' }, 400);

  const antes = await env.DB.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).bind(params.id).first<Record<string, unknown>>();
  if (!antes) return json({ error: 'No existe' }, 404);
  const cambios = Object.entries(v).filter(([k, val]) => antes[k] !== val);
  if (!cambios.length) return json({ ok: true, sinCambios: true });

  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(`UPDATE ${tabla} SET ${cambios.map(([k]) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
      .bind(...cambios.map(([, val]) => val), new Date().toISOString(), params.id),
    ...cambios.map(([k, val]) => auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: audit, entidadId: params.id!, accion: 'editar',
      campo: k, valorAnterior: antes[k], valorNuevo: val })),
  ];

  // Cambio de slug (o de tipo de local) de algo publicado → 301 desde las URLs antiguas.
  let redirecciones = 0;
  const cambiaRuta = 'slug' in v && v.slug !== antes.slug || (tipo === 'locales' && 'place_type_id' in v && v.place_type_id !== antes.place_type_id);
  if (cambiaRuta && antes.status === 'publicado') {
    if (v.slug && v.slug !== antes.slug && await env.DB.prepare(`SELECT 1 FROM ${tabla} WHERE slug = ? AND id <> ?`).bind(v.slug, params.id).first()) {
      return json({ error: 'Ese slug ya existe', campos: { slug: 'Ya existe' } }, 409);
    }
    const seccion = async (typeId: unknown) => (await env.DB.prepare('SELECT slug FROM place_types WHERE id = ?').bind(typeId).first<{ slug: string }>())?.slug;
    const secAntes = tipo === 'locales' ? await seccion(antes.place_type_id) : undefined;
    const secAhora = tipo === 'locales' ? await seccion(v.place_type_id ?? antes.place_type_id) : undefined;
    for (const idioma of IDIOMAS) {
      const desde = rutaPublica(tipo, idioma, String(antes.slug), secAntes);
      const hacia = rutaPublica(tipo, idioma, String(v.slug ?? antes.slug), secAhora);
      if (!desde || !hacia || desde === hacia) continue;
      const r = await sentenciasRedireccion(env.DB, desde, hacia, c.actor, c.origen, 'Cambio de URL');
      if (r.resultado.ok) { stmts.push(...r.stmts); redirecciones++; }
    }
  }
  try { await env.DB.batch(stmts); } catch (err) {
    if (String(err).includes('UNIQUE')) return json({ error: 'Ese slug ya existe', campos: { slug: 'Ya existe' } }, 409);
    if (String(err).includes('FOREIGN KEY')) return json({ error: 'La ciudad, la región o el tipo elegidos no existen' }, 400);
    throw err;
  }
  await recalcular(env.DB, entidad, params.id!);
  return json({ ok: true, cambiados: cambios.map(([k]) => k), redirecciones });
});
