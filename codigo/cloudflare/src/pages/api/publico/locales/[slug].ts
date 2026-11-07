// GET /api/publico/locales/:slug?idioma=es&menu=1   datos de la plantilla «Info del local» (y «Menú» con menu=1). Solo lo publicado.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { idiomaPedido, infoLocal, menuPublico } from '../../../../lib/publico';

export const GET: APIRoute = async ({ params, url }) => {
  const idioma = idiomaPedido(url.searchParams.get('idioma'));
  const info = await infoLocal(env.DB, String(params.slug), idioma);
  if (!info) return json({ error: 'No existe' }, 404);
  const menu = url.searchParams.get('menu') === '1' ? await menuPublico(env.DB, info.id, idioma) : undefined;
  // Caché corta: «Abierto ahora» depende de la hora. Network-First en el Service Worker (§15).
  return json({ ...info, menu }, 200, { 'Cache-Control': 'public, max-age=60' });
};
