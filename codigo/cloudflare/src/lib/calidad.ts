// Quality Gate interno por entidad e idioma (maestro §4). Criterio INTERNO, no requisito oficial de Google.
// Si falla, la entidad sigue guardada (y publicada si procede), pero no es indexable. Nunca se borra por fallarlo.
// Sin barrios (retirados, §12). La duplicidad usa la comparación de textos propios ya probada (base-indexing/similarity).

import { findDuplicates } from '../../../base-indexing/similarity.ts';

export type Idioma = 'es' | 'en' | 'fr';
export const IDIOMAS: Idioma[] = ['es', 'en', 'fr'];
export type TipoGate = 'place' | 'dish' | 'guide' | 'city';

/** Mínimos internos de caracteres de la descripción (§4.3). No se rellena texto para alcanzarlos. */
export const MINIMOS: Record<TipoGate, number> = { place: 300, dish: 300, guide: 500, city: 500 };

export type DatosGate = {
  tipo: TipoGate;
  idioma: Idioma;
  estado: string;                    // estado de la entidad
  traduccionPublicada: boolean;
  caracteres: number;                // descripción + contenido de la traducción
  duplicada: boolean;
  lat?: number | null; lng?: number | null;
  ciudad?: boolean;
  fotosConAlt: number;               // fotos aprobadas con alt en este idioma
  entrantes: number; salientes: number; relaciones: number;
  lugaresPublicados?: number;        // ciudades
  autoria?: boolean;                 // guías
};

export function evaluar(d: DatosGate): { indexable: boolean; fallos: string[] } {
  const f: string[] = [];
  const exige = (ok: boolean, m: string) => { if (!ok) f.push(m); };
  const coords = typeof d.lat === 'number' && typeof d.lng === 'number' && Math.abs(d.lat) <= 90 && Math.abs(d.lng) <= 180;
  exige(d.estado === 'publicado', `Estado «${d.estado}» (debe estar publicado)`);
  exige(d.traduccionPublicada, `Traducción «${d.idioma}» no publicada`);
  exige(d.caracteres >= MINIMOS[d.tipo], `Descripción de ${d.caracteres} caracteres (mínimo interno ${MINIMOS[d.tipo]})`);
  exige(!d.duplicada, 'Texto demasiado parecido a otro de la web');
  switch (d.tipo) {
    case 'place':
      exige(coords, 'Coordenadas no válidas');
      exige(!!d.ciudad, 'Sin ciudad');
      exige(d.fotosConAlt >= 1, `Falta 1 foto aprobada con alt en «${d.idioma}»`);
      exige(d.entrantes >= 1, 'Sin enlace entrante');
      exige(d.salientes >= 2, 'Menos de 2 enlaces salientes');
      break;
    case 'dish':
      exige(d.relaciones >= 1, 'Sin relación con ningún lugar');
      exige(d.fotosConAlt >= 1, `Falta 1 foto aprobada con alt en «${d.idioma}»`);
      exige(d.salientes >= 1, 'Sin enlace útil a lugares o guías');
      break;
    case 'guide':
      exige(d.relaciones >= 3, 'Menos de 3 relaciones útiles');
      exige(d.fotosConAlt >= 2, `Faltan fotos aprobadas con alt en «${d.idioma}» (mínimo 2)`);
      exige(!!d.autoria, 'Autoría no declarada');
      break;
    case 'city':
      exige(coords, 'Coordenadas no válidas');
      exige((d.lugaresPublicados ?? 0) >= 3, 'Menos de 3 lugares publicados');
      exige(d.fotosConAlt >= 1, `Falta 1 foto aprobada con alt en «${d.idioma}»`);
      exige(d.salientes >= 1, 'Sin relación saliente útil');
      break;
  }
  return { indexable: f.length === 0, fallos: f };
}

const TABLA: Record<TipoGate, string> = { place: 'places', dish: 'dishes', guide: 'guides', city: 'cities' };
const COL_FOTO: Record<TipoGate, string> = { place: 'place_id', dish: 'dish_id', guide: 'guide_id', city: 'city_id' };

const n = async (db: D1Database, sql: string, ...args: unknown[]) =>
  (await db.prepare(sql).bind(...args).first<{ n: number }>())?.n ?? 0;

/** Calcula el Quality Gate de una entidad en los tres idiomas y guarda `is_indexable` en sus traducciones. */
export async function recalcular(db: D1Database, tipo: TipoGate, id: string) {
  const e = await db.prepare(`SELECT * FROM ${TABLA[tipo]} WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!e) return null;

  // Enlazado (§4.4): la navegación secundaria (ciudad, listado por tipo, «cerca de aquí») cuenta como vía principal.
  let entrantes = 0, salientes = 0, relaciones = 0, lugaresPublicados = 0;
  if (tipo === 'place') {
    const ciudadPublicada = await n(db, `SELECT count(*) AS n FROM cities WHERE id = ? AND status = 'publicado'`, e.city_id);
    const platos = await n(db, `SELECT count(*) AS n FROM place_dishes pd JOIN dishes d ON d.id = pd.dish_id WHERE pd.place_id = ? AND d.status = 'publicado'`, id);
    const guias = await n(db, `SELECT count(*) AS n FROM guide_places gp JOIN guides g ON g.id = gp.guide_id WHERE gp.place_id = ? AND g.status = 'publicado'`, id);
    entrantes = ciudadPublicada + platos + guias;          // listado de su ciudad, platos y guías que lo enlazan
    salientes = (e.city_id ? 1 : 0) + 1 + platos + guias;  // su ciudad, su listado por tipo, platos y guías
  } else if (tipo === 'dish') {
    relaciones = await n(db, `SELECT count(*) AS n FROM place_dishes pd JOIN places p ON p.id = pd.place_id WHERE pd.dish_id = ? AND p.status = 'publicado'`, id);
    salientes = relaciones + await n(db, `SELECT count(*) AS n FROM guide_dishes WHERE dish_id = ?`, id);
  } else if (tipo === 'guide') {
    relaciones = await n(db, `SELECT (SELECT count(*) FROM guide_places WHERE guide_id = ?1) + (SELECT count(*) FROM guide_dishes WHERE guide_id = ?1)
                              + (SELECT count(*) FROM guide_cities WHERE guide_id = ?1) AS n`, id);
  } else {
    lugaresPublicados = await n(db, `SELECT count(*) AS n FROM places WHERE city_id = ? AND status = 'publicado'`, id);
    salientes = lugaresPublicados + await n(db, `SELECT count(*) AS n FROM guide_cities WHERE city_id = ?`, id);
  }

  const informe: Record<string, { indexable: boolean; fallos: string[] }> = {};
  for (const idioma of IDIOMAS) {
    const t = await db.prepare(`SELECT id, status, description, content FROM translations WHERE entity_type = ? AND entity_id = ? AND locale = ?`)
      .bind(tipo, id, idioma).first<{ id: string; status: string; description: string | null; content: string | null }>();
    const texto = `${t?.description ?? ''} ${t?.content ?? ''}`.trim();
    // Duplicidad interna: con los textos del mismo tipo e idioma.
    const otros = await db.prepare(`SELECT entity_id AS id, coalesce(description,'') || ' ' || coalesce(content,'') AS text FROM translations
                                    WHERE entity_type = ? AND locale = ? AND entity_id <> ?`).bind(tipo, idioma, id).all<{ id: string; text: string }>();
    const duplicada = texto.length > 0 && findDuplicates([{ id, text: texto }, ...otros.results]).has(id);
    const fotosConAlt = await n(db, `SELECT count(*) AS n FROM photos f JOIN photo_translations a ON a.photo_id = f.id AND a.locale = ?
                                     WHERE f.${COL_FOTO[tipo]} = ? AND f.status = 'aprobada' AND length(trim(a.alt)) > 0`, idioma, id);
    const r = evaluar({
      tipo, idioma, estado: String(e.status), traduccionPublicada: t?.status === 'publicada', caracteres: texto.length, duplicada,
      lat: e.lat as number | null, lng: e.lng as number | null, ciudad: !!e.city_id, fotosConAlt,
      entrantes, salientes, relaciones, lugaresPublicados, autoria: !!(e.author_name && String(e.author_name).trim()),
    });
    informe[idioma] = r;
    if (t) {
      await db.prepare('UPDATE translations SET is_indexable = ?, indexable_checked_at = ? WHERE id = ?')
        .bind(r.indexable && t.status === 'publicada' ? 1 : 0, new Date().toISOString(), t.id).run();
    }
  }
  return informe;
}
