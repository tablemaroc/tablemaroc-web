// GET /api/publico/listado?que=locales&idioma=es&ciudad=tanger&tipo=restaurantes&vegetariano=1&tarjeta=1&terraza=1&abierto=1&q=…&pagina=1
// Datos de la plantilla «Listado único» (§20) y del buscador. Solo lo publicado; listas largas con «Ver más» (20 por página).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/acceso';
import { leerFiltros, listado } from '../../../lib/publico';

export const GET: APIRoute = async ({ url }) => {
  const f = leerFiltros(url.searchParams);
  if (!f) return json({ error: 'Listado no válido: locales, ciudades, platos o guias' }, 400);
  return json(await listado(env.DB, f), 200, { 'Cache-Control': 'public, max-age=60' });
};
