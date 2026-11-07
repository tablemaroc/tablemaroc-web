// «Mejores restaurantes» de la Home (decisión del titular, 07-11-2026; docs 16 y 17: formulario del local, pestaña
// Información, solo Administración). Lo marca el titular desde el panel: sí/no, su orden y el «Mejor plato», elegido de
// los platos del menú de ese local.
//   GET  /api/panel/contenido/locales/:id/mejores   → { sale, orden, platoId, platos: [{ id, nombre }] }
//   POST /api/panel/contenido/locales/:id/mejores   { sale: boolean, orden?: number, platoId?: string | null }
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../lib/acceso';
import { auditar } from '../../../../../../lib/db';
import { SOLO_ADMIN, panel } from '../../../../../../lib/panel';

type Fila = { home_best_position: number | null; home_best_dish_item_id: string | null };

/** Platos del menú del local que se pueden elegir como «Mejor plato» (sin archivados), con su nombre en español. */
async function platosDelLocal(placeId: string) {
  return (await env.DB.prepare(
    `SELECT i.id, (SELECT name FROM menu_translations WHERE target_type = 'item' AND target_id = i.id AND locale = 'es') AS nombre
     FROM menu_items i JOIN menu_categories c ON c.id = i.category_id JOIN menus m ON m.id = c.menu_id
     WHERE m.place_id = ? AND i.archived_at IS NULL ORDER BY c.position, i.position`,
  ).bind(placeId).all<{ id: string; nombre: string | null }>()).results;
}

export const GET = panel(SOLO_ADMIN, async ({ params }) => {
  if (params.tipo !== 'locales') return json({ error: 'No existe' }, 404);
  const p = await env.DB.prepare('SELECT home_best_position, home_best_dish_item_id FROM places WHERE id = ?').bind(params.id).first<Fila>();
  if (!p) return json({ error: 'No existe' }, 404);
  return json({ sale: p.home_best_position !== null, orden: p.home_best_position, platoId: p.home_best_dish_item_id, platos: await platosDelLocal(params.id!) });
});

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  if (params.tipo !== 'locales') return json({ error: 'No existe' }, 404);
  const antes = await env.DB.prepare('SELECT home_best_position, home_best_dish_item_id FROM places WHERE id = ?').bind(params.id).first<Fila>();
  if (!antes) return json({ error: 'No existe' }, 404);
  const b = await leerJson<{ sale: unknown; orden?: unknown; platoId?: unknown }>(request);
  if (typeof b.sale !== 'boolean') return json({ error: 'Indica si sale en Mejores restaurantes' }, 400);

  let orden: number | null = null;
  let plato: string | null = null;
  if (b.sale) {
    orden = Number(b.orden);
    if (!Number.isInteger(orden) || orden < 1 || orden > 1000) return json({ error: 'El orden es un número a partir de 1' }, 400);
    if (b.platoId !== undefined && b.platoId !== null && b.platoId !== '') {
      if (typeof b.platoId !== 'string' || !(await platosDelLocal(params.id!)).some((x) => x.id === b.platoId)) {
        return json({ error: 'El mejor plato tiene que ser un plato del menú de este local' }, 400);
      }
      plato = b.platoId;
    }
  }
  if (antes.home_best_position === orden && antes.home_best_dish_item_id === plato) return json({ ok: true, sinCambios: true });

  await env.DB.batch([
    env.DB.prepare('UPDATE places SET home_best_position = ?, home_best_dish_item_id = ?, updated_at = ? WHERE id = ?')
      .bind(orden, plato, new Date().toISOString(), params.id),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'place', entidadId: params.id!, accion: 'mejores_restaurantes',
      campo: 'home_best', valorAnterior: antes, valorNuevo: { home_best_position: orden, home_best_dish_item_id: plato } }),
  ]);
  return json({ ok: true, sale: orden !== null, orden, platoId: plato });
});
