// PUT /api/panel/contenido/:tipo/:id/relaciones  (solo administración). Enlazado interno (§4.4):
//   locales: { platos: [ids], especialidades: [ids] }   · platos: { locales: [ids] }
//   guias:   { locales: [ids], platos: [ids], ciudades: [ids] }
// Sustituye la lista completa de cada relación enviada. Todo auditado.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { recalcular } from '../../../../../../lib/calidad';
import { esTipo, TIPOS } from '../../../../../../lib/contenido';
import { auditar } from '../../../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../../../lib/panel';

type Rel = { tabla: string; propia: string; otra: string; destino: string };
const RELACIONES: Record<string, Record<string, Rel>> = {
  locales: {
    platos: { tabla: 'place_dishes', propia: 'place_id', otra: 'dish_id', destino: 'dishes' },
    especialidades: { tabla: 'place_specialties', propia: 'place_id', otra: 'specialty_id', destino: 'specialties' },
  },
  platos: { locales: { tabla: 'place_dishes', propia: 'dish_id', otra: 'place_id', destino: 'places' } },
  guias: {
    locales: { tabla: 'guide_places', propia: 'guide_id', otra: 'place_id', destino: 'places' },
    platos: { tabla: 'guide_dishes', propia: 'guide_id', otra: 'dish_id', destino: 'dishes' },
    ciudades: { tabla: 'guide_cities', propia: 'guide_id', otra: 'city_id', destino: 'cities' },
  },
};

export const PUT = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  if (!esTipo(params.tipo) || !RELACIONES[params.tipo]) return json({ error: 'Este tipo no tiene relaciones editables' }, 404);
  const { tabla, entidad, audit } = TIPOS[params.tipo];
  if (!(await env.DB.prepare(`SELECT 1 FROM ${tabla} WHERE id = ?`).bind(params.id).first())) return json({ error: 'No existe' }, 404);
  const b = await leerJson<Record<string, unknown>>(request);
  const stmts: D1PreparedStatement[] = [];
  for (const [nombre, valor] of Object.entries(b)) {
    const r = RELACIONES[params.tipo][nombre];
    if (!r) return json({ error: `Relación no válida: ${nombre}` }, 400);
    if (!Array.isArray(valor) || valor.length > 200 || !valor.every((x) => typeof x === 'string')) return json({ error: `${nombre}: lista de ids` }, 400);
    const ids = [...new Set(valor as string[])];
    if (ids.length) {
      const existen = await env.DB.prepare(`SELECT count(*) AS n FROM ${r.destino} WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).first<{ n: number }>();
      if (existen?.n !== ids.length) return json({ error: `${nombre}: algún id no existe` }, 400);
    }
    const antes = (await env.DB.prepare(`SELECT ${r.otra} AS id FROM ${r.tabla} WHERE ${r.propia} = ?`).bind(params.id).all<{ id: string }>()).results.map((x) => x.id);
    stmts.push(env.DB.prepare(`DELETE FROM ${r.tabla} WHERE ${r.propia} = ?`).bind(params.id));   // tabla de enlaces, no contenido
    for (const id of ids) stmts.push(env.DB.prepare(`INSERT INTO ${r.tabla} (${r.propia}, ${r.otra}) VALUES (?, ?)`).bind(params.id, id));
    stmts.push(auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: audit, entidadId: params.id!, accion: 'relaciones', campo: nombre,
      valorAnterior: antes, valorNuevo: ids }));
  }
  if (!stmts.length) return json({ error: 'Nada que cambiar' }, 400);
  await env.DB.batch(stmts);
  return json({ ok: true, qualityGate: await recalcular(env.DB, entidad, params.id!) });
});
