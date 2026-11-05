// Datos públicos para las plantillas (maestro §13, §16, §17, §20). Solo lo PUBLICADO y lo APROBADO.
// Idioma: el pedido; si esa traducción no está publicada, se muestra la española (idioma base y de reserva, §13) y esa
// versión no es indexable. Un dato no verificado se devuelve como null para mostrarlo como «pendiente» (§1).

import { abiertoAhora, esRamadan, masCercanos } from './horario.ts';
import { ahoraEnMarruecos } from './reservas.ts';
import { rutaPublica } from './contenido.ts';

export type Idioma = 'es' | 'en' | 'fr';
export const idiomaPedido = (v: unknown): Idioma => (v === 'en' || v === 'fr' ? v : 'es');
const ORDEN_RESERVA: Record<Idioma, Idioma[]> = { es: ['es', 'en', 'fr'], en: ['en', 'es', 'fr'], fr: ['fr', 'es', 'en'] };

type Trad = { locale: Idioma; title: string; description: string | null; content: string | null; seo_title: string | null;
  seo_description: string | null; directions: string | null; ramadan_notice: string | null; is_indexable: number };

async function traducciones(db: D1Database, tipo: string, id: string): Promise<Trad[]> {
  return (await db.prepare(`SELECT locale, title, description, content, seo_title, seo_description, directions, ramadan_notice, is_indexable
                            FROM translations WHERE entity_type = ? AND entity_id = ? AND status = 'publicada'`).bind(tipo, id).all<Trad>()).results;
}
const elegir = (ts: Trad[], idioma: Idioma) => ORDEN_RESERVA[idioma].map((l) => ts.find((t) => t.locale === l)).find(Boolean) ?? null;

/** Enlaces «Cómo llegar» sin API ni coste: abren la app de mapas del usuario con las coordenadas (§16). */
export const comoLlegar = (lat: number, lng: number) => ({
  google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  apple: `https://maps.apple.com/?daddr=${lat},${lng}`,
  geo: `geo:${lat},${lng}`,
});

const siNo = (v: number | null) => (v === null ? null : v === 1);

export async function infoLocal(db: D1Database, slug: string, idioma: Idioma, ahora = new Date()) {
  const p = await db.prepare(
    `SELECT p.*, pt.slug AS tipo, c.slug AS ciudad, c.id AS ciudad_id FROM places p JOIN place_types pt ON pt.id = p.place_type_id
     JOIN cities c ON c.id = p.city_id WHERE p.slug = ? AND p.status = 'publicado'`,
  ).bind(slug).first<Record<string, unknown> & { id: string; lat: number; lng: number; tipo: string; ciudad: string; ciudad_id: string }>();
  if (!p) return null;
  const ts = await traducciones(db, 'place', p.id);
  const t = elegir(ts, idioma);
  if (!t) return null;                                         // publicado sin ninguna traducción publicada: no se muestra

  const fotos = (await db.prepare(
    `SELECT f.r2_key, f.is_entrance, f.author, f.review_id IS NOT NULL AS de_resena,
            coalesce((SELECT alt FROM photo_translations WHERE photo_id = f.id AND locale = ?),
                     (SELECT alt FROM photo_translations WHERE photo_id = f.id AND locale = 'es')) AS alt
     FROM photos f WHERE f.place_id = ? AND f.status = 'aprobada' ORDER BY f.is_entrance DESC, f.review_id IS NOT NULL, f.created_at LIMIT 30`,
  ).bind(idioma, p.id).all<{ r2_key: string; is_entrance: number; author: string | null; de_resena: number; alt: string | null }>()).results;

  const vegetariano = !!(await db.prepare(`SELECT 1 FROM place_specialties ps JOIN specialties s ON s.id = ps.specialty_id WHERE ps.place_id = ? AND s.slug = 'vegetariano'`).bind(p.id).first());
  const resumen = await db.prepare(`SELECT count(*) AS total, round(avg(rating), 1) AS media FROM reviews WHERE place_id = ? AND status = 'aprobada'`)
    .bind(p.id).first<{ total: number; media: number | null }>();

  const cerca = await db.prepare(
    `SELECT p.id, p.slug, p.lat, p.lng, pt.slug AS tipo,
            coalesce((SELECT title FROM translations WHERE entity_type = 'place' AND entity_id = p.id AND locale = ? AND status = 'publicada'),
                     (SELECT title FROM translations WHERE entity_type = 'place' AND entity_id = p.id AND locale = 'es' AND status = 'publicada')) AS nombre
     FROM places p JOIN place_types pt ON pt.id = p.place_type_id
     WHERE p.status = 'publicado' AND p.open_status <> 'cerrado_definitivamente' AND p.id <> ?
       AND p.lat BETWEEN ? AND ? AND p.lng BETWEEN ? AND ?`,
  ).bind(idioma, p.id, p.lat - 0.03, p.lat + 0.03, p.lng - 0.04, p.lng + 0.04).all<{ id: string; slug: string; lat: number; lng: number; tipo: string; nombre: string | null }>();

  const marruecos = ahoraEnMarruecos(ahora);
  const disponibles = ts.map((x) => x.locale);
  return {
    id: p.id, slug: p.slug, tipo: p.tipo, ciudad: p.ciudad,
    idioma: t.locale, idiomaPedido: idioma, indexable: t.locale === idioma && t.is_indexable === 1,
    // hreflang solo entre las versiones es/en/fr indexables; x-default → español (§13).
    alternativas: Object.fromEntries(ts.filter((x) => x.is_indexable === 1).map((x) => [x.locale, rutaPublica('locales', x.locale, String(p.slug), p.tipo)])),
    nombre: t.title, descripcion: t.description, contenido: t.content, seoTitulo: t.seo_title, seoDescripcion: t.seo_description,
    apertura: p.open_status,
    abiertoAhora: abiertoAhora(p.opening_hours, marruecos, { aperturaLocal: String(p.open_status), avisoRamadan: !!t.ramadan_notice, ramadan: esRamadan(marruecos) }),
    horario: p.opening_hours ? JSON.parse(String(p.opening_hours)) : null,
    avisoRamadan: t.ramadan_notice,
    datos: {                                                   // datos aprobados de la info del local (§20); null = pendiente
      vegetariano, pagoConTarjeta: siNo(p.accepts_card as number | null), terraza: siNo(p.has_terrace as number | null),
      idiomasDelPersonal: p.staff_languages ? JSON.parse(String(p.staff_languages)) : null,
      telefono: p.phone ?? null, web: p.website ?? null, rangoDePrecios: p.price_range ?? null,
    },
    ubicacion: {
      lat: p.lat, lng: p.lng, direccion: p.address ?? null, indicaciones: t.directions,
      mapaEstatico: p.static_map_path ? `/${p.static_map_path}` : null, comoLlegar: comoLlegar(p.lat, p.lng),
    },
    fotos: fotos.map((f) => ({ url: `/${f.r2_key}`, alt: f.alt, entrada: f.is_entrance === 1, deResena: f.de_resena === 1, autor: f.author })),
    fotoEntrada: fotos.find((f) => f.is_entrance === 1) ? `/${fotos.find((f) => f.is_entrance === 1)!.r2_key}` : null,
    resenas: { total: resumen?.total ?? 0, media: resumen?.total ? resumen.media : null },
    aceptaReservas: p.accepts_reservations === 1 && p.open_status === 'abierto',
    cercaDeAqui: masCercanos(p, cerca.results).map((c) => ({ slug: c.slug, tipo: c.tipo, nombre: c.nombre, metros: c.metros, ruta: rutaPublica('locales', idioma, c.slug, c.tipo) })),
    traduccionesDisponibles: disponibles,
  };
}

/** Carta pública: menú, categorías y platos publicados; los archivados (agotados) no aparecen y nunca hay etiqueta «Agotado» (§3). */
export async function menuPublico(db: D1Database, placeId: string, idioma: Idioma) {
  const m = await db.prepare(`SELECT id FROM menus WHERE place_id = ? AND status = 'publicado'`).bind(placeId).first<{ id: string }>();
  if (!m) return null;
  const nombre = (tipo: string) => `coalesce((SELECT name FROM menu_translations WHERE target_type = '${tipo}' AND target_id = x.id AND locale = ?1 AND status = 'publicada'),
                                            (SELECT name FROM menu_translations WHERE target_type = '${tipo}' AND target_id = x.id AND locale = 'es' AND status = 'publicada'))`;
  const desc = `coalesce((SELECT description FROM menu_translations WHERE target_type = 'item' AND target_id = x.id AND locale = ?1 AND status = 'publicada'),
                         (SELECT description FROM menu_translations WHERE target_type = 'item' AND target_id = x.id AND locale = 'es' AND status = 'publicada'))`;
  const cats = (await db.prepare(`SELECT x.id, ${nombre('category')} AS nombre FROM menu_categories x WHERE x.menu_id = ?2 AND x.status = 'publicado' ORDER BY x.position`)
    .bind(idioma, m.id).all<{ id: string; nombre: string | null }>()).results;
  const items = cats.length ? (await db.prepare(
    `SELECT x.id, x.category_id, ${nombre('item')} AS nombre, ${desc} AS descripcion, x.price_mad, x.price_status, x.allergens
     FROM menu_items x WHERE x.category_id IN (${cats.map((_, i) => `?${i + 2}`).join(',')}) AND x.status = 'publicado' AND x.archived_at IS NULL ORDER BY x.position`,
  ).bind(idioma, ...cats.map((c) => c.id)).all<{ id: string; category_id: string; nombre: string | null; descripcion: string | null; price_mad: number | null; price_status: string; allergens: string | null }>()).results : [];
  return {
    moneda: 'MAD',
    categorias: cats.map((c) => ({
      nombre: c.nombre,
      platos: items.filter((i) => i.category_id === c.id && i.nombre).map((i) => ({
        nombre: i.nombre, descripcion: i.descripcion,
        precioMad: i.price_status === 'verificado' ? i.price_mad : null,   // sin verificar → «precio pendiente», nunca inventado (§17)
        precioPendiente: i.price_status !== 'verificado' || i.price_mad === null,
        alergenos: i.allergens ? JSON.parse(i.allergens) : null,
      })),
    })).filter((c) => c.nombre && c.platos.length),
  };
}

// ───────────── Listado único y buscador (§20) ─────────────
// Un solo listado para todo: locales (con filtros), ciudades, platos y guías, y los resultados de búsqueda.
// Filtros aprobados: tipo, ciudad, vegetariano, pago con tarjeta, terraza y «abierto ahora». Sin barrios ni alcohol (§1, §12).
// La búsqueda compara sin mayúsculas ni acentos y exige todas las palabras (shared/search.ts, ya probado).

import { cleanSearchParam, matchesSearch } from '../../../shared/search.ts';

export const POR_PAGINA = 20;
export type QueListar = 'locales' | 'ciudades' | 'platos' | 'guias';
const ENTIDAD: Record<QueListar, { tabla: string; tipo: string }> = {
  locales: { tabla: 'places', tipo: 'place' }, ciudades: { tabla: 'cities', tipo: 'city' },
  platos: { tabla: 'dishes', tipo: 'dish' }, guias: { tabla: 'guides', tipo: 'guide' },
};

export type Filtros = {
  que: QueListar; idioma: Idioma; pagina: number; q: string;
  ciudad?: string; tipo?: string; vegetariano?: boolean; tarjeta?: boolean; terraza?: boolean; abierto?: boolean;
};

export function leerFiltros(u: URLSearchParams): Filtros | null {
  const que = (u.get('que') ?? 'locales') as QueListar;
  if (!(que in ENTIDAD)) return null;
  const si = (k: string) => (u.get(k) === '1' ? true : undefined);
  return {
    que, idioma: idiomaPedido(u.get('idioma')), q: cleanSearchParam(u.get('q') ?? ''),
    pagina: Math.max(1, Math.min(Number(u.get('pagina')) || 1, 500)),
    ciudad: u.get('ciudad') || undefined, tipo: u.get('tipo') || undefined,
    vegetariano: si('vegetariano'), tarjeta: si('tarjeta'), terraza: si('terraza'), abierto: si('abierto'),
  };
}

export async function listado(db: D1Database, f: Filtros, ahora = new Date()) {
  const { tabla, tipo } = ENTIDAD[f.que];
  const where = ['e.status = ?']; const args: unknown[] = ['publicado'];
  if (f.que === 'locales') {
    where.push(`e.open_status <> 'cerrado_definitivamente'`);
    if (f.ciudad) { where.push('c.slug = ?'); args.push(f.ciudad); }
    if (f.tipo) { where.push('pt.slug = ?'); args.push(f.tipo); }
    if (f.tarjeta) where.push('e.accepts_card = 1');
    if (f.terraza) where.push('e.has_terrace = 1');
    if (f.vegetariano) where.push(`EXISTS (SELECT 1 FROM place_specialties ps JOIN specialties s ON s.id = ps.specialty_id WHERE ps.place_id = e.id AND s.slug = 'vegetariano')`);
  }
  const extra = f.que === 'locales'
    ? `, pt.slug AS tipo, c.slug AS ciudad, e.opening_hours, e.open_status, e.lat, e.lng,
       (SELECT round(avg(rating), 1) FROM reviews WHERE place_id = e.id AND status = 'aprobada') AS media,
       (SELECT count(*) FROM reviews WHERE place_id = e.id AND status = 'aprobada') AS resenas,
       (SELECT r2_key FROM photos WHERE place_id = e.id AND status = 'aprobada' ORDER BY is_entrance DESC, created_at LIMIT 1) AS foto`
    : `, (SELECT r2_key FROM photos WHERE ${tipo === 'city' ? 'city_id' : tipo === 'dish' ? 'dish_id' : 'guide_id'} = e.id AND status = 'aprobada' ORDER BY created_at LIMIT 1) AS foto`;
  const joins = f.que === 'locales' ? 'JOIN place_types pt ON pt.id = e.place_type_id JOIN cities c ON c.id = e.city_id' : '';
  const filas = (await db.prepare(
    `SELECT e.id, e.slug ${extra},
            coalesce(t.title, te.title) AS nombre, coalesce(t.description, te.description) AS descripcion,
            coalesce(t.ramadan_notice, te.ramadan_notice) AS aviso_ramadan,
            CASE WHEN t.title IS NOT NULL THEN ? ELSE 'es' END AS idioma
     FROM ${tabla} e ${joins}
     LEFT JOIN translations t ON t.entity_type = '${tipo}' AND t.entity_id = e.id AND t.locale = ? AND t.status = 'publicada'
     LEFT JOIN translations te ON te.entity_type = '${tipo}' AND te.entity_id = e.id AND te.locale = 'es' AND te.status = 'publicada'
     WHERE ${where.join(' AND ')} AND coalesce(t.title, te.title) IS NOT NULL
     ORDER BY nombre LIMIT 2000`,
  ).bind(f.idioma, f.idioma, ...args).all<Record<string, unknown> & { nombre: string; descripcion: string | null; opening_hours?: string | null; open_status?: string; tipo?: string }>()).results;

  const marruecos = ahoraEnMarruecos(ahora);
  const ramadan = esRamadan(marruecos);
  let r = filas;
  if (f.q) r = r.filter((x) => matchesSearch(f.q, [x.nombre, x.descripcion]));
  const conEstado = r.map((x) => f.que === 'locales'
    ? { ...x, abiertoAhora: abiertoAhora(x.opening_hours, marruecos, { aperturaLocal: x.open_status, ramadan, avisoRamadan: !!x.aviso_ramadan }) } : x);
  const finales = f.abierto ? conEstado.filter((x) => (x as { abiertoAhora?: string }).abiertoAhora === 'abierto') : conEstado;
  const pagina = finales.slice((f.pagina - 1) * POR_PAGINA, f.pagina * POR_PAGINA).map((x) => {
    const { opening_hours: _h, aviso_ramadan: _a, ...resto } = x as Record<string, unknown>;
    return {
      ...resto, foto: x.foto ? `/${x.foto}` : null,
      ruta: rutaPublica(f.que, f.idioma, String(x.slug), x.tipo as string | undefined),
    };
  });
  return { total: finales.length, pagina: f.pagina, porPagina: POR_PAGINA, hayMas: f.pagina * POR_PAGINA < finales.length, resultados: pagina };
}
