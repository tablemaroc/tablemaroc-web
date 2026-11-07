// GET  /api/panel/locales/:id/menu      carta completa del local, con los platos archivados aparte (pestaña Menú, §20)
// POST /api/panel/locales/:id/menu      nueva categoría  { nombres: { es: { nombre } , … }, posicion? }
// Administración o el propietario del local. Lo nuevo entra en borrador; publicarlo lo decide administración.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { auditar, nuevoId } from '../../../../../../lib/db';
import { sentenciasNombres, validarNombres } from '../../../../../../lib/menu';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../../../lib/panel';

async function menuDe(placeId: string): Promise<string> {
  const m = await env.DB.prepare('SELECT id FROM menus WHERE place_id = ?').bind(placeId).first<{ id: string }>();
  if (m) return m.id;
  const id = nuevoId();
  await env.DB.prepare('INSERT INTO menus (id, place_id) VALUES (?, ?)').bind(id, placeId).run();
  return id;
}

export const GET = panel(ADMIN_Y_PROPIETARIO, async ({ params }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  const menu = await env.DB.prepare('SELECT * FROM menus WHERE place_id = ?').bind(params.id).first<{ id: string; status: string }>();
  if (!menu) return json({ menu: null, categorias: [] });
  const textos = async (tipo: string, ids: string[]) => ids.length
    ? (await env.DB.prepare(`SELECT target_id, locale, name, description, status FROM menu_translations WHERE target_type = ? AND target_id IN (${ids.map(() => '?').join(',')})`)
        .bind(tipo, ...ids).all<{ target_id: string; locale: string; name: string; description: string | null; status: string }>()).results
    : [];
  const cats = (await env.DB.prepare('SELECT * FROM menu_categories WHERE menu_id = ? ORDER BY position, created_at').bind(menu.id).all<Record<string, unknown> & { id: string }>()).results;
  const items = cats.length
    ? (await env.DB.prepare(`SELECT * FROM menu_items WHERE category_id IN (${cats.map(() => '?').join(',')}) ORDER BY position, created_at`).bind(...cats.map((x) => x.id)).all<Record<string, unknown> & { id: string; category_id: string; archived_at: string | null }>()).results
    : [];
  const tc = await textos('category', cats.map((x) => x.id));
  const ti = await textos('item', items.map((x) => x.id));
  const por = <T extends { target_id: string }>(l: T[], id: string) => Object.fromEntries(l.filter((t) => t.target_id === id).map((t) => [(t as unknown as { locale: string }).locale, t]));
  return json({
    menu,
    categorias: cats.map((cat) => ({
      ...cat, textos: por(tc, cat.id),
      platos: items.filter((i) => i.category_id === cat.id && !i.archived_at).map((i) => ({ ...i, textos: por(ti, i.id) })),
      archivados: items.filter((i) => i.category_id === cat.id && i.archived_at).map((i) => ({ ...i, textos: por(ti, i.id) })),
    })),
  });
});

export const POST = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  if (!(await esPropietarioDe(c, params.id!))) return json({ error: 'No existe' }, 404);
  if (!(await env.DB.prepare('SELECT 1 FROM places WHERE id = ?').bind(params.id).first())) return json({ error: 'No existe' }, 404);
  const b = await leerJson<{ nombres: unknown; posicion: number }>(request);
  const e: Record<string, string> = {};
  const n = validarNombres(b.nombres, e, false);
  if (!Object.values(n).some((t) => t?.name)) e.nombres = 'La categoría necesita un nombre al menos en un idioma';
  if (Object.keys(e).length) return json({ error: 'Revisa los campos', campos: e }, 400);
  const menuId = await menuDe(params.id!);
  const id = nuevoId();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO menu_categories (id, menu_id, position) VALUES (?, ?, ?)').bind(id, menuId, Number.isInteger(b.posicion) ? b.posicion : 0),
    ...sentenciasNombres(env.DB, 'category', id, n, 'borrador', nuevoId),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'menu', entidadId: menuId, accion: 'crear_categoria', valorNuevo: { id, nombres: n } }),
  ]);
  return json({ ok: true, id, estado: 'borrador' }, 201);
});
