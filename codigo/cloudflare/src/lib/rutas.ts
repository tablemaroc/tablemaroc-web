// Rutas internas de la web (§13): solo /es/, /en/ y /fr/, en minúsculas y con barra final.

const RUTA = /^\/(es|en|fr)\/[a-z0-9\-/]*$/;

export function normalizarRuta(r: unknown): string | null {
  if (typeof r !== 'string') return null;
  let v = r.trim().toLowerCase();
  if (!v.endsWith('/')) v += '/';
  return RUTA.test(v) && !v.includes('//') ? v : null;
}
