// Entrada sin idioma (maestro §13): idioma elegido antes (cookie) → idioma del navegador si es es/en/fr → español.
import type { APIRoute } from 'astro';

const IDIOMAS = ['es', 'en', 'fr'] as const;
type Idioma = (typeof IDIOMAS)[number];

export function elegirIdioma(cookie: string | null, acceptLanguage: string | null): Idioma {
  const elegido = cookie?.match(/(?:^|;\s*)tm_idioma=(es|en|fr)\b/)?.[1] as Idioma | undefined;
  if (elegido) return elegido;
  const prefs = (acceptLanguage ?? '')
    .split(',')
    .map((p) => { const [tag, q] = p.trim().split(';q='); return { tag: (tag ?? '').toLowerCase().slice(0, 2), q: q ? Number(q) : 1 }; })
    .filter((p) => p.tag && !Number.isNaN(p.q))
    .sort((a, b) => b.q - a.q);
  return (prefs.find((p) => (IDIOMAS as readonly string[]).includes(p.tag))?.tag as Idioma) ?? 'es';
}

export const GET: APIRoute = ({ request }) => {
  const idioma = elegirIdioma(request.headers.get('Cookie'), request.headers.get('Accept-Language'));
  return new Response(null, {
    status: 302,                      // temporal: depende del visitante (la 301 es solo para URLs que cambian)
    headers: { Location: `/${idioma}/`, Vary: 'Accept-Language, Cookie' },
  });
};
