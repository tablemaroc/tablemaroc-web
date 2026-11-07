// PUT /api/panel/fotos/:id  { alt: { es?, en?, fr? }, origen?, autoria?, licencia?, entrada? }   (§3, §4: alt localizado)
// Administración: todo. Propietario: alt y «foto de la entrada» de las fotos de su local.
// Las fotos no se borran: una foto rechazada conserva su motivo (§3).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../lib/acceso';
import { recalcular } from '../../../../lib/calidad';
import { auditar } from '../../../../lib/db';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel } from '../../../../lib/panel';

const ALT_MAX = 200;

export const PUT = panel(ADMIN_Y_PROPIETARIO, async ({ params, request }, c) => {
  const f = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(params.id).first<Record<string, string | number | null>>();
  if (!f) return json({ error: 'No existe' }, 404);
  if (c.u.role !== 'admin' && !(f.place_id && (await esPropietarioDe(c, String(f.place_id))))) return json({ error: 'No existe' }, 404);
  const b = await leerJson<{ alt: Record<string, unknown>; origen: string; autoria: string; licencia: string; entrada: boolean }>(request);
  if (c.u.role !== 'admin' && (b.origen !== undefined || b.autoria !== undefined || b.licencia !== undefined)) {
    return json({ error: 'Origen, autoría y licencia los registra administración' }, 403);
  }
  const stmts: D1PreparedStatement[] = [];
  for (const [l, a] of Object.entries(b.alt ?? {})) {
    if (!['es', 'en', 'fr'].includes(l)) return json({ error: 'Idioma no válido: solo es, en o fr' }, 400);
    const alt = typeof a === 'string' ? a.trim() : '';
    if (!alt || alt.length > ALT_MAX) return json({ error: `Texto alternativo (${l}) de 1 a ${ALT_MAX} caracteres` }, 400);
    stmts.push(env.DB.prepare('INSERT INTO photo_translations (photo_id, locale, alt) VALUES (?, ?, ?) ON CONFLICT(photo_id, locale) DO UPDATE SET alt = excluded.alt')
      .bind(params.id, l, alt));
  }
  const campos: Record<string, unknown> = {};
  for (const [k, col] of [['origen', 'source'], ['autoria', 'author'], ['licencia', 'license']] as const) {
    if (b[k] !== undefined) campos[col] = typeof b[k] === 'string' && b[k].trim() ? b[k].trim().slice(0, 200) : null;
  }
  if (b.entrada !== undefined) { if (!f.place_id) return json({ error: 'Solo las fotos de un local pueden ser de la entrada' }, 400); campos.is_entrance = b.entrada ? 1 : 0; }
  if (Object.keys(campos).length) {
    stmts.push(env.DB.prepare(`UPDATE photos SET ${Object.keys(campos).map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
      .bind(...Object.values(campos), new Date().toISOString(), params.id));
  }
  if (!stmts.length) return json({ error: 'Nada que cambiar' }, 400);
  stmts.push(auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'photo', entidadId: params.id!, accion: 'editar', valorNuevo: { ...campos, alt: b.alt } }));
  await env.DB.batch(stmts);
  const destino = f.place_id ? ['place', f.place_id] : f.city_id ? ['city', f.city_id] : f.dish_id ? ['dish', f.dish_id] : f.guide_id ? ['guide', f.guide_id] : null;
  if (destino) await recalcular(env.DB, destino[0] as 'place', String(destino[1]));
  return json({ ok: true });
});
