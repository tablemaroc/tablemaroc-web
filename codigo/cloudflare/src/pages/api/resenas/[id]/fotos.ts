// POST /api/resenas/:id/fotos  (multipart: archivo WebP + alt opcional)   fotos de la reseña, máximo 3 (§3, §18 ter)
// El navegador ya las reduce y convierte; el servidor solo acepta WebP y quita cualquier EXIF/XMP (ubicación GPS).
// Entran PENDIENTES de moderación. Autoría: el nombre visible del autor; licencia: la de las condiciones aceptadas.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CONDICIONES_VERSION, json } from '../../../../lib/acceso';
import { auditar, nuevoId } from '../../../../lib/db';
import { limpiarWebp } from '../../../../lib/fotos';
import { MAX_REVIEW_PHOTOS } from '../../../../lib/resenas';
import { permitir, usuarioDe } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request, params }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  const r = await env.DB.prepare('SELECT r.id, r.place_id, u.display_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = ? AND r.user_id = ?')
    .bind(params.id, u.id).first<{ id: string; place_id: string; display_name: string | null }>();
  if (!r) return json({ error: 'No existe' }, 404);
  if (!(await permitir(env.DB, `fotos-resena:${u.id}`, 20, 86_400))) return json({ error: 'Demasiadas fotos hoy' }, 429);
  const n = await env.DB.prepare('SELECT count(*) AS n FROM photos WHERE review_id = ?').bind(r.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_REVIEW_PHOTOS) return json({ error: `Máximo ${MAX_REVIEW_PHOTOS} fotos por reseña` }, 409);

  const f = await request.formData().catch(() => null);
  const archivo = f?.get('archivo');
  if (!archivo || typeof archivo === 'string') return json({ error: 'Falta el archivo' }, 400);
  const limpio = limpiarWebp(new Uint8Array(await archivo.arrayBuffer()));
  if (!limpio.ok) return json({ error: limpio.error }, 400);
  const alt = f?.get('alt');
  const altOk = typeof alt === 'string' && alt.trim() ? alt.trim().slice(0, 200) : null;
  const idioma = (await env.DB.prepare('SELECT locale FROM reviews WHERE id = ?').bind(r.id).first<{ locale: string | null }>())?.locale ?? 'es';

  const id = nuevoId();
  const key = `fotos/locales/${crypto.randomUUID()}.webp`;   // se muestra en la info del local, con la reseña
  await env.FOTOS.put(key, limpio.datos, { httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } });
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO photos (id, place_id, review_id, user_id, r2_key, source, author, license) VALUES (?, ?, ?, ?, ?, 'usuario', ?, ?)`)
      .bind(id, r.place_id, r.id, u.id, key, r.display_name ?? 'Usuario', `condiciones:${CONDICIONES_VERSION}`),
    ...(altOk ? [env.DB.prepare('INSERT INTO photo_translations (photo_id, locale, alt) VALUES (?, ?, ?)').bind(id, idioma, altOk)] : []),
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'photo', entidadId: id, accion: 'subir', valorNuevo: { resena: r.id, metadatosQuitados: limpio.quitados } }),
  ]);
  return json({ ok: true, id, estado: 'pendiente' }, 201);
};
