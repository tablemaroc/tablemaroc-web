// GET  /api/panel/fotos?estado=pendiente   biblioteca de fotos (§20). Solo administración.
// POST /api/panel/fotos   (multipart)  archivo (WebP) + destino (locales|ciudades|platos|guias) + id + origen, autoria, licencia,
//                                      entrada (sí/no, solo locales) y alt_es / alt_en / alt_fr.
// Administración: si trae origen, autoría y licencia, queda aprobada (decisión del 29-10-2026); si no, pendiente.
// Propietario: solo fotos de SU local, y siempre pendientes de moderación (§3).
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { recalcular } from '../../../../lib/calidad';
import { esTipo, TIPOS } from '../../../../lib/contenido';
import { auditar, nuevoId } from '../../../../lib/db';
import { claveFoto, limpiarWebp } from '../../../../lib/fotos';
import { ADMIN_Y_PROPIETARIO, esPropietarioDe, panel, SOLO_ADMIN } from '../../../../lib/panel';

const COL = { place: 'place_id', city: 'city_id', dish: 'dish_id', guide: 'guide_id' } as const;
const texto = (v: FormDataEntryValue | null, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export const GET = panel(SOLO_ADMIN, async ({ url }) => {
  const estado = url.searchParams.get('estado');
  const r = await env.DB.prepare(
    `SELECT f.*, (SELECT group_concat(locale || '=' || alt, ' | ') FROM photo_translations a WHERE a.photo_id = f.id) AS alts
     FROM photos f ${estado ? 'WHERE f.status = ?' : ''} ORDER BY f.created_at DESC LIMIT 200`,
  ).bind(...(estado ? [estado] : [])).all();
  return json({ fotos: r.results });
});

export const POST = panel(ADMIN_Y_PROPIETARIO, async ({ request }, c) => {
  const f = await request.formData().catch(() => null);
  if (!f) return json({ error: 'Envía la foto como formulario (multipart)' }, 400);
  const destino = f.get('destino'); const id = f.get('id');
  if (!esTipo(destino) || typeof id !== 'string') return json({ error: 'Indica el destino y su id' }, 400);
  if (c.u.role !== 'admin' && !(destino === 'locales' && (await esPropietarioDe(c, id)))) return json({ error: 'Solo fotos de tu local' }, 403);
  const { tabla, entidad } = TIPOS[destino];
  if (!(await env.DB.prepare(`SELECT 1 FROM ${tabla} WHERE id = ?`).bind(id).first())) return json({ error: 'El destino no existe' }, 404);

  const archivo = f.get('archivo');
  if (!archivo || typeof archivo === 'string') return json({ error: 'Falta el archivo' }, 400);
  const limpio = limpiarWebp(new Uint8Array(await archivo.arrayBuffer()));
  if (!limpio.ok) return json({ error: limpio.error }, 400);

  const origen = texto(f.get('origen'), 200), autoria = texto(f.get('autoria'), 200), licencia = texto(f.get('licencia'), 200);
  const entrada = destino === 'locales' && f.get('entrada') === 'si' ? 1 : 0;
  const aprobada = c.u.role === 'admin' && !!(origen && autoria && licencia);
  const fotoId = nuevoId();
  const key = claveFoto(destino);
  await env.FOTOS.put(key, limpio.datos, { httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } });

  const ahora = new Date().toISOString();
  const alts = (['es', 'en', 'fr'] as const).map((l) => [l, texto(f.get(`alt_${l}`), 200)] as const).filter(([, a]) => a);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO photos (id, ${COL[entidad]}, user_id, r2_key, is_entrance, source, author, license, status, moderated_by, moderated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(fotoId, id, c.u.id, key, entrada, origen, autoria, licencia, aprobada ? 'aprobada' : 'pendiente', aprobada ? c.actor : null, aprobada ? ahora : null),
    ...alts.map(([l, a]) => env.DB.prepare('INSERT INTO photo_translations (photo_id, locale, alt) VALUES (?, ?, ?)').bind(fotoId, l, a)),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'photo', entidadId: fotoId, accion: 'subir',
      valorNuevo: { destino, id, estado: aprobada ? 'aprobada' : 'pendiente', metadatosQuitados: limpio.quitados } }),
  ]);
  if (aprobada) await recalcular(env.DB, entidad, id);
  return json({ ok: true, id: fotoId, estado: aprobada ? 'aprobada' : 'pendiente', metadatosQuitados: limpio.quitados }, 201);
});
