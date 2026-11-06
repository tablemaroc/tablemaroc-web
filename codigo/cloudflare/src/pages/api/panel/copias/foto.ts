// Fotos para la copia externa del PC (§9, §20). Solo una persona de administración.
//   GET /api/panel/copias/foto?key=fotos/…   descarga la foto de R2 (cualquier estado: la copia es completa)
//   PUT /api/panel/copias/foto?key=fotos/…   al restaurar desde archivo: vuelve a subir la foto SOLO si su ficha existe en la
//                                            base y el archivo falta en R2. Se comprueba que es WebP y se limpian metadatos.
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { limpiarWebp } from '../../../../lib/fotos';
import { panel, SOLO_ADMIN } from '../../../../lib/panel';

const CLAVE = /^fotos\/(locales|ciudades|platos|guias)\/[0-9a-f-]{36}\.webp$/;

export const GET = panel(SOLO_ADMIN, async ({ url }, c) => {
  if (c.origen === 'claude_code') return json({ error: 'Solo una persona' }, 403);
  const key = url.searchParams.get('key') ?? '';
  if (!CLAVE.test(key)) return json({ error: 'Clave no válida' }, 400);
  const obj = await env.FOTOS.get(key);
  if (!obj) return json({ error: 'No está en R2' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' } });
});

export const PUT = panel(SOLO_ADMIN, async ({ url, request }, c) => {
  if (c.origen === 'claude_code') return json({ error: 'Solo una persona' }, 403);
  const key = url.searchParams.get('key') ?? '';
  if (!CLAVE.test(key)) return json({ error: 'Clave no válida' }, 400);
  if (!(await env.DB.prepare('SELECT 1 FROM photos WHERE r2_key = ?').bind(key).first())) return json({ error: 'Esa foto no está en la base' }, 404);
  if (await env.FOTOS.head(key)) return json({ ok: true, yaEstaba: true });
  const limpio = limpiarWebp(new Uint8Array(await request.arrayBuffer()));
  if (!limpio.ok) return json({ error: limpio.error }, 400);
  await env.FOTOS.put(key, limpio.datos, { httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } });
  return json({ ok: true, restaurada: true }, 201);
});
