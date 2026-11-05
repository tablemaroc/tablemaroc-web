// Edición de la carta (§3, §17). Administración o el propietario del local.
//   PUT  /api/panel/menu/categoria/:id   { nombres?, posicion?, estado? }
//   POST /api/panel/menu/categoria/:id   nuevo plato  { nombres, precio_mad?, precio_verificado?, alergenos?, posicion? }
//   PUT  /api/panel/menu/plato/:id       { nombres?, precio_mad?, precio_verificado?, alergenos?, posicion?, estado? }
//   POST /api/panel/menu/plato/:id       { archivar: true | false }   plato agotado: se archiva o se reactiva, nunca se borra
// El estado (revisado / publicado) solo lo cambia administración; lo publicado no vuelve a borrador (§3).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../lib/acceso';
import { cambioEstadoPermitido } from '../../../../../lib/contenido';
import { auditar, nuevoId } from '../../../../../lib/db';
import { localDe, sentenciasNombres, validarNombres, validarPlato } from '../../../../../lib/menu';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel, type Contexto } from '../../../../../lib/panel';

const TABLA = { categoria: 'menu_categories', plato: 'menu_items' } as const;
const TRAD = { categoria: 'category', plato: 'item' } as const;

async function cargar(tipo: string, id: string, c: Contexto) {
  if (tipo !== 'categoria' && tipo !== 'plato') return null;
  const local = await localDe(env.DB, tipo, id);
  if (!local || !(await esPropietarioDe(c, local))) return null;
  const fila = await env.DB.prepare(`SELECT * FROM ${TABLA[tipo]} WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  return fila ? { tipo: tipo as 'categoria' | 'plato', local, fila } : null;
}

export const PUT = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  const x = await cargar(params.tipo!, params.id!, c);
  if (!x) return json({ error: 'No existe' }, 404);
  const b = await leerJson<Record<string, unknown>>(request);
  const e: Record<string, string> = {};
  const n = validarNombres(b.nombres, e, x.tipo === 'plato');
  const d = x.tipo === 'plato' ? validarPlato(b, e) : ('posicion' in b ? validarPlato({ posicion: b.posicion }, e) : {});
  let estado = String(x.fila.status);
  if (b.estado !== undefined) {
    if (c.u.role !== 'admin') return json({ error: 'Publicar la carta lo decide administración' }, 403);
    if (!cambioEstadoPermitido(estado, String(b.estado))) return json({ error: `No se puede pasar de ${estado} a ${b.estado}` }, 409);
    estado = String(b.estado);
  }
  if (Object.keys(e).length) return json({ error: 'Revisa los campos', campos: e }, 400);
  const cols: Record<string, unknown> = { ...d, ...(b.estado !== undefined ? { status: estado } : {}) };
  const stmts: D1PreparedStatement[] = [];
  if (Object.keys(cols).length) {
    stmts.push(env.DB.prepare(`UPDATE ${TABLA[x.tipo]} SET ${Object.keys(cols).map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
      .bind(...Object.values(cols), new Date().toISOString(), params.id));
  }
  stmts.push(...sentenciasNombres(env.DB, TRAD[x.tipo], params.id!, n, estado, nuevoId));
  // Al cambiar el estado, los textos ya guardados siguen al elemento.
  if (b.estado !== undefined) {
    stmts.push(env.DB.prepare(`UPDATE menu_translations SET status = ? WHERE target_type = ? AND target_id = ?`)
      .bind(estado === 'publicado' ? 'publicada' : estado === 'revisado' ? 'revisada' : 'borrador', TRAD[x.tipo], params.id));
  }
  if (!stmts.length) return json({ error: 'Nada que cambiar' }, 400);
  stmts.push(auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'menu', entidadId: params.id!, accion: `editar_${x.tipo}`,
    valorAnterior: { precio: x.fila.price_mad, estado: x.fila.status }, valorNuevo: { ...cols, nombres: n } }));
  try { await env.DB.batch(stmts); } catch (err) {
    if (String(err).includes('CHECK')) return json({ error: 'Un precio verificado necesita importe' }, 400);
    throw err;
  }
  return json({ ok: true, estado });
});

export const POST = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  const x = await cargar(params.tipo!, params.id!, c);
  if (!x) return json({ error: 'No existe' }, 404);
  const b = await leerJson<Record<string, unknown>>(request);
  const ahora = new Date().toISOString();

  if (x.tipo === 'plato') {
    if (typeof b.archivar !== 'boolean') return json({ error: 'Indica archivar: true (agotado) o false (reactivar)' }, 400);
    const ya = !!x.fila.archived_at;
    if (ya === b.archivar) return json({ ok: true, sinCambios: true });
    await env.DB.batch([
      env.DB.prepare('UPDATE menu_items SET archived_at = ?, updated_at = ? WHERE id = ?').bind(b.archivar ? ahora : null, ahora, params.id),
      auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'menu', entidadId: params.id!, accion: b.archivar ? 'archivar_plato' : 'reactivar_plato' }),
    ]);
    return json({ ok: true, archivado: b.archivar });
  }

  // Nuevo plato en esta categoría.
  const e: Record<string, string> = {};
  const n = validarNombres(b.nombres, e, true);
  if (!Object.values(n).some((t) => t?.name)) e.nombres = 'El plato necesita un nombre al menos en un idioma';
  const d = validarPlato(b, e);
  if (Object.keys(e).length) return json({ error: 'Revisa los campos', campos: e }, 400);
  const id = nuevoId();
  const cols = { id, category_id: params.id, ...d };
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO menu_items (${Object.keys(cols).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`).bind(...Object.values(cols)),
      ...sentenciasNombres(env.DB, 'item', id, n, 'borrador', nuevoId),
      auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'menu', entidadId: id, accion: 'crear_plato', valorNuevo: { ...d, nombres: n } }),
    ]);
  } catch (err) {
    if (String(err).includes('CHECK')) return json({ error: 'Un precio verificado necesita importe' }, 400);
    throw err;
  }
  return json({ ok: true, id, estado: 'borrador', precio: d.price_mad === undefined || d.price_mad === null ? 'pendiente' : `${d.price_mad} MAD` }, 201);
});
