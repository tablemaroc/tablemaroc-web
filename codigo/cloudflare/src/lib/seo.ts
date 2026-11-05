// sitemap.xml y robots.txt (maestro §4, §6, §13). Solo URLs INDEXABLES (Quality Gate); hreflang solo entre es, en y fr,
// y x-default hacia la versión en español cuando es indexable. robots.txt no desindexa: eso lo hace `noindex` en cada página.

import { rutaPublica, type TipoPanel } from './contenido.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export const MAX_URLS = 50_000;

const TIPOS: { panel: TipoPanel; entidad: string; tabla: string }[] = [
  { panel: 'locales', entidad: 'place', tabla: 'places' }, { panel: 'ciudades', entidad: 'city', tabla: 'cities' },
  { panel: 'platos', entidad: 'dish', tabla: 'dishes' }, { panel: 'guias', entidad: 'guide', tabla: 'guides' },
];

export type Entrada = { loc: string; lastmod: string; alternativas: Record<string, string> };

export async function entradasSitemap(db: D1Database, sitio: string): Promise<Entrada[]> {
  const out: Entrada[] = [];
  for (const t of TIPOS) {
    const filas = (await db.prepare(
      `SELECT e.slug, tr.locale, tr.updated_at ${t.panel === 'locales' ? ', pt.slug AS seccion' : ''}
       FROM ${t.tabla} e JOIN translations tr ON tr.entity_type = ? AND tr.entity_id = e.id
       ${t.panel === 'locales' ? 'JOIN place_types pt ON pt.id = e.place_type_id' : ''}
       WHERE e.status = 'publicado' AND tr.status = 'publicada' AND tr.is_indexable = 1 ORDER BY e.slug, tr.locale`,
    ).bind(t.entidad).all<{ slug: string; locale: 'es' | 'en' | 'fr'; updated_at: string; seccion?: string }>()).results;
    const porSlug = new Map<string, typeof filas>();
    for (const f of filas) porSlug.set(f.slug, [...(porSlug.get(f.slug) ?? []), f]);
    for (const [slug, versiones] of porSlug) {
      const alternativas: Record<string, string> = {};
      for (const v of versiones) {
        const r = rutaPublica(t.panel, v.locale, slug, v.seccion);
        if (r) alternativas[v.locale] = sitio + r;
      }
      if (alternativas.es) alternativas['x-default'] = alternativas.es;
      for (const v of versiones) {
        const loc = alternativas[v.locale];
        if (loc) out.push({ loc, lastmod: v.updated_at.slice(0, 10), alternativas });
      }
    }
  }
  return out.slice(0, MAX_URLS);
}

export function sitemapXml(entradas: Entrada[]): string {
  const urls = entradas.map((e) => {
    const alts = Object.keys(e.alternativas).length > 1
      ? Object.entries(e.alternativas).map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${esc(l)}" href="${esc(h)}"/>`).join('') : '';
    return `<url><loc>${esc(e.loc)}</loc><lastmod>${esc(e.lastmod)}</lastmod>${alts}</url>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>\n`;
}

/** Zonas que no se rastrean: API, panel y páginas de cuenta y acceso. */
export const NO_RASTREAR = ['/api/', '/panel/', '/es/acceso/', '/en/acceso/', '/fr/acceso/', '/es/mi-cuenta/', '/en/mi-cuenta/', '/fr/mi-cuenta/'];

export const robotsTxt = (sitio: string) =>
  ['User-agent: *', ...NO_RASTREAR.map((p) => `Disallow: ${p}`), '', `Sitemap: ${sitio}/sitemap.xml`, ''].join('\n');

/** Sirve /robots.txt y /sitemap.xml antes de Astro. null = no es ninguno de los dos. */
export async function servirSeo(url: URL, db: D1Database, sitio: string): Promise<Response | null> {
  if (url.pathname === '/robots.txt') {
    return new Response(robotsTxt(sitio), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }
  if (url.pathname === '/sitemap.xml') {
    return new Response(sitemapXml(await entradasSitemap(db, sitio)), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }
  return null;
}
