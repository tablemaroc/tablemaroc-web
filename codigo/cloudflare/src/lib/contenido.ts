// Gestión de contenido del panel (maestro §2, §3, §20): locales, ciudades, platos y guías.
// Nada se inventa: un dato vacío queda vacío (null) y se muestra como pendiente. Nada publicado se borra ni vuelve a borrador.
// Validaciones reutilizadas del código anterior (puras y ya probadas): backend/admin-moderation/validate.ts y shared/week.ts.

import {
  checkCoords, checkLines, checkPhone, checkPriceRange, checkSlug, checkUrl, checkWeekHours, emptyToNull, type Errors,
} from '../../../backend/admin-moderation/validate.ts';
import { sectionPath, SEGMENTS, type PlaceSection } from '../../../shared/routes.ts';
import type { Idioma, TipoGate } from './calidad.ts';

export type TipoPanel = 'locales' | 'ciudades' | 'platos' | 'guias';
export const TIPOS: Record<TipoPanel, { tabla: string; entidad: TipoGate; audit: 'place' | 'city' | 'dish' | 'guide' }> = {
  locales: { tabla: 'places', entidad: 'place', audit: 'place' },
  ciudades: { tabla: 'cities', entidad: 'city', audit: 'city' },
  platos: { tabla: 'dishes', entidad: 'dish', audit: 'dish' },
  guias: { tabla: 'guides', entidad: 'guide', audit: 'guide' },
};
export const esTipo = (t: unknown): t is TipoPanel => typeof t === 'string' && t in TIPOS;

/** Estados (§3): borrador → revisado → publicado. Revisado puede volver a borrador; publicado ya no cambia. */
export function cambioEstadoPermitido(de: string, a: string): boolean {
  if (de === a) return false;
  if (de === 'borrador') return a === 'revisado';
  if (de === 'revisado') return a === 'publicado' || a === 'borrador';
  return false;
}

const IDIOMAS_PERSONAL = new Set(['es', 'en', 'fr']);
const bool = (v: unknown, campo: string, e: Errors): number | null => {
  if (v === null || v === undefined || v === '') return null;            // sin verificar = pendiente
  if (v === true || v === false) return v ? 1 : 0;
  e[campo] = 'Sí, no o vacío (sin verificar)'; return null;
};

/** Campos que puede cambiar el PROPIETARIO de su local (Información, §20). El resto, solo administración. */
export const CAMPOS_PROPIETARIO = ['address', 'phone', 'website', 'opening_hours', 'accepts_card', 'has_terrace', 'staff_languages'];

/** Valida los campos enviados (solo los presentes). Devuelve los valores listos para la base de datos. */
export function validarCampos(tipo: TipoPanel, b: Record<string, unknown>, e: Errors): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const hay = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
  if (hay('slug')) v.slug = checkSlug(b.slug, e);
  if ((tipo === 'locales' || tipo === 'ciudades') && (hay('lat') || hay('lng'))) {
    const c = checkCoords(b.lat === null ? '' : String(b.lat ?? ''), b.lng === null ? '' : String(b.lng ?? ''), e);
    if (tipo === 'locales' && c.lat === null && !e.coords) e.coords = 'Las coordenadas del local son obligatorias (§16)';
    v.lat = c.lat; v.lng = c.lng;
  }
  if (tipo === 'locales') {
    if (hay('city_id')) v.city_id = typeof b.city_id === 'string' && b.city_id ? b.city_id : (e.city_id = 'Elige la ciudad', null);
    if (hay('place_type_id')) v.place_type_id = typeof b.place_type_id === 'string' && b.place_type_id ? b.place_type_id : (e.place_type_id = 'Elige el tipo de local', null);
    if (hay('price_range')) v.price_range = checkPriceRange(b.price_range === null ? '' : String(b.price_range), e);
    if (hay('address')) v.address = emptyToNull(b.address);
    if (hay('phone')) v.phone = checkPhone(b.phone, e);
    if (hay('website')) v.website = checkUrl(b.website, 'website', e);
    if (hay('opening_hours')) {
      const h = (b.opening_hours ?? {}) as Record<string, unknown>;
      const r = checkWeekHours((k) => h[k.replace('hours_', '')], e);
      v.opening_hours = r ? JSON.stringify(r) : null;
    }
    if (hay('accepts_card')) v.accepts_card = bool(b.accepts_card, 'accepts_card', e);
    if (hay('has_terrace')) v.has_terrace = bool(b.has_terrace, 'has_terrace', e);
    if (hay('staff_languages')) {
      const l = Array.isArray(b.staff_languages) ? b.staff_languages : null;
      if (l && !l.every((x) => IDIOMAS_PERSONAL.has(String(x)))) e.staff_languages = 'Solo es, en o fr';
      v.staff_languages = l && l.length ? JSON.stringify([...new Set(l.map(String))]) : null;
    }
  }
  if (tipo === 'ciudades' && hay('region_id')) v.region_id = typeof b.region_id === 'string' && b.region_id ? b.region_id : (e.region_id = 'Elige la región', null);
  if (tipo === 'platos') {
    if (hay('origin_region_id')) v.origin_region_id = emptyToNull(b.origin_region_id);
    if (hay('main_ingredients')) { const l = checkLines(Array.isArray(b.main_ingredients) ? b.main_ingredients.join('\n') : b.main_ingredients); v.main_ingredients = l.length ? JSON.stringify(l) : null; }
  }
  if (tipo === 'guias' && hay('author_name')) v.author_name = emptyToNull(b.author_name);
  return v;
}

/** Campos obligatorios para crear (en borrador). */
export const OBLIGATORIOS: Record<TipoPanel, string[]> = {
  locales: ['slug', 'city_id', 'place_type_id', 'lat', 'lng'],
  ciudades: ['slug', 'region_id'],
  platos: ['slug'],
  guias: ['slug'],
};

// ───────────── Traducciones ─────────────

export type Traduccion = {
  title: string | null; description: string | null; content: string | null; seo_title: string | null; seo_description: string | null;
  directions: string | null; ramadan_notice: string | null;
};
const LIMITES: Partial<Record<keyof Traduccion, number>> = { title: 120, description: 500, seo_title: 70, seo_description: 170, directions: 1000, ramadan_notice: 300, content: 20000 };

export function validarTraduccion(tipo: TipoPanel, b: Record<string, unknown>, e: Errors): Traduccion {
  const t: Traduccion = {
    title: emptyToNull(b.title), description: emptyToNull(b.description), content: emptyToNull(b.content),
    seo_title: emptyToNull(b.seo_title), seo_description: emptyToNull(b.seo_description),
    directions: tipo === 'locales' ? emptyToNull(b.directions) : null,
    ramadan_notice: tipo === 'locales' ? emptyToNull(b.ramadan_notice) : null,
  };
  for (const [k, max] of Object.entries(LIMITES) as [keyof Traduccion, number][]) if ((t[k]?.length ?? 0) > max) e[k] = `Máximo ${max} caracteres`;
  return t;
}
/** Una traducción solo se revisa o publica con título (§3: «solo puede publicarse cuando está realmente preparada»). */
export function traduccionLista(t: Traduccion): boolean { return !!t.title && !!(t.description || t.content); }

// ───────────── URLs públicas y 301 (§2, §3.1) ─────────────

/** Ruta pública en un idioma. Para un local hace falta el slug de su tipo (sección). */
export function rutaPublica(tipo: TipoPanel, idioma: Idioma, slug: string, seccionLocal?: string): string | null {
  if (tipo === 'locales') return seccionLocal && seccionLocal in SEGMENTS ? `${sectionPath(idioma, seccionLocal as PlaceSection, slug)}/` : null;
  const s = tipo === 'ciudades' ? 'ciudades-y-barrios' : tipo === 'platos' ? 'platos-tipicos' : 'guias-gastronomicas';
  return `${sectionPath(idioma, s, slug)}/`;
}
