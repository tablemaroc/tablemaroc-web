// Menú digital (maestro §3, §17): categorías y platos de la carta de un local. Precios SOLO en MAD (price_mad);
// vacío = «precio pendiente», nunca inventado. Un plato agotado se ARCHIVA: no se ve en la web, no se borra y se reactiva.
// Las validaciones de precio son las del código anterior (backend/admin-moderation/validate.ts, ya probadas).

import { checkLines, checkPriceMad, emptyToNull, type Errors } from '../../../backend/admin-moderation/validate.ts';

export type Nombres = Partial<Record<'es' | 'en' | 'fr', { name: string | null; description: string | null }>>;

export function validarNombres(v: unknown, e: Errors, conDescripcion: boolean): Nombres {
  const out: Nombres = {};
  if (v === undefined) return out;
  if (!v || typeof v !== 'object') { e.nombres = 'Textos por idioma: { es: { nombre, descripcion }, … }'; return out; }
  for (const [l, t] of Object.entries(v as Record<string, unknown>)) {
    if (l !== 'es' && l !== 'en' && l !== 'fr') { e.nombres = 'Solo es, en o fr'; continue; }
    const o = (t ?? {}) as Record<string, unknown>;
    const name = emptyToNull(o.nombre);
    const description = conDescripcion ? emptyToNull(o.descripcion) : null;
    if ((name?.length ?? 0) > 120) e[`nombre_${l}`] = 'Máximo 120 caracteres';
    if ((description?.length ?? 0) > 500) e[`descripcion_${l}`] = 'Máximo 500 caracteres';
    out[l] = { name, description };
  }
  return out;
}

export type DatosPlato = { price_mad?: number | null; price_status?: 'verificado' | 'pendiente'; allergens?: string | null; position?: number };

/** Precio: vacío = pendiente. «Verificado» exige importe (también lo impone la base de datos). Sin moneda: es MAD. */
export function validarPlato(b: Record<string, unknown>, e: Errors): DatosPlato {
  const d: DatosPlato = {};
  if ('precio_mad' in b) {
    d.price_mad = b.precio_mad === null ? null : checkPriceMad(b.precio_mad, e);
    if (b.moneda !== undefined) e.moneda = 'No hay moneda: los precios son siempre en MAD';
  }
  if ('precio_verificado' in b) {
    if (typeof b.precio_verificado !== 'boolean') e.precio_verificado = 'Sí o no';
    d.price_status = b.precio_verificado === true ? 'verificado' : 'pendiente';
  }
  if (d.price_status === 'verificado' && 'price_mad' in d && d.price_mad === null) e.precio_mad = 'Un precio verificado necesita importe';
  if ('alergenos' in b) {
    const l = checkLines(Array.isArray(b.alergenos) ? b.alergenos.join('\n') : b.alergenos, 14);
    d.allergens = l.length ? JSON.stringify(l) : null;   // solo si están verificados (§3)
  }
  if ('posicion' in b) {
    const p = Number(b.posicion);
    if (!Number.isInteger(p) || p < 0 || p > 9999) e.posicion = 'Número de 0 a 9999'; else d.position = p;
  }
  return d;
}

/** Local al que pertenece una categoría o un plato (para comprobar permisos). */
export async function localDe(db: D1Database, tipo: 'categoria' | 'plato', id: string): Promise<string | null> {
  const sql = tipo === 'categoria'
    ? 'SELECT m.place_id FROM menu_categories c JOIN menus m ON m.id = c.menu_id WHERE c.id = ?'
    : 'SELECT m.place_id FROM menu_items i JOIN menu_categories c ON c.id = i.category_id JOIN menus m ON m.id = c.menu_id WHERE i.id = ?';
  return (await db.prepare(sql).bind(id).first<{ place_id: string }>())?.place_id ?? null;
}

/** Sentencias para guardar los textos por idioma de una categoría, un plato o el menú. */
export function sentenciasNombres(db: D1Database, tipo: 'menu' | 'category' | 'item', id: string, n: Nombres, estado: string, nuevoId: () => string) {
  const tEstado = estado === 'publicado' ? 'publicada' : estado === 'revisado' ? 'revisada' : 'borrador';
  return Object.entries(n).map(([l, t]) => db.prepare(
    `INSERT INTO menu_translations (id, target_type, target_id, locale, name, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(target_type, target_id, locale) DO UPDATE SET name = excluded.name, description = excluded.description,
       status = excluded.status, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  ).bind(nuevoId(), tipo, id, l, t!.name, t!.description, tEstado));
}
