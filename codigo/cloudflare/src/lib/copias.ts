// Copias de seguridad (maestro §9, §20): la base de datos se vuelca a R2 (bucket COPIAS) en JSON.
// Sin secretos: no se copian sesiones, códigos de email ni límites (son temporales); el secreto TOTP va cifrado.
// La copia fuera de Cloudflare queda pendiente del titular (§18 ter).

import { ahoraIso, nuevoId } from './db.ts';

/** Tablas que se copian, en orden de dependencias (para restaurar sin romper claves foráneas). */
export const TABLAS_COPIA = [
  'regions', 'cities', 'place_types', 'specialties', 'places', 'dishes', 'guides',
  'place_specialties', 'place_dishes', 'guide_places', 'guide_dishes', 'guide_cities', 'translations',
  'users', 'passkeys', 'consents', 'place_owners', 'business_claims', 'place_staff',
  'reviews', 'review_replies', 'photos', 'photo_translations',
  'menus', 'menu_categories', 'menu_items', 'menu_translations',
  'reservation_settings', 'reservations', 'favorites',
  'redirects', 'audit_log', 'panel_modes',
] as const;

const NO_SE_COPIAN = new Set(['sessions', 'email_codes', 'rate_limits', 'job_runs', 'backups']);

export type Volcado = { version: 1; creado: string; tablas: Record<string, unknown[]> };

export async function volcarBase(db: D1Database): Promise<Volcado> {
  const tablas: Record<string, unknown[]> = {};
  for (const t of TABLAS_COPIA) {
    if (NO_SE_COPIAN.has(t)) continue;
    const { results } = await db.prepare(`SELECT * FROM ${t}`).all();   // nombres de una lista fija, no de la petición
    tablas[t] = results;
  }
  return { version: 1, creado: ahoraIso(), tablas };
}

/** Hace la copia de la base de datos en R2 y la registra. */
export async function copiarBase(
  db: D1Database, r2: R2Bucket,
  kind: 'automatica_diaria' | 'manual' | 'previa_restauracion', actor: string,
) {
  const id = nuevoId();
  const key = `base-de-datos/${ahoraIso().slice(0, 10)}/${id}.json`;
  await db.prepare(`INSERT INTO backups (id, kind, contents, r2_key, status, created_by) VALUES (?, ?, 'base_de_datos', ?, 'en_curso', ?)`)
    .bind(id, kind, key, actor).run();
  try {
    const cuerpo = JSON.stringify(await volcarBase(db));
    await r2.put(key, cuerpo, { httpMetadata: { contentType: 'application/json' } });
    await db.prepare(`UPDATE backups SET status = 'ok', size_bytes = ? WHERE id = ?`).bind(cuerpo.length, id).run();
    return { id, key, ok: true as const };
  } catch (e) {
    await db.prepare(`UPDATE backups SET status = 'error', error = ? WHERE id = ?`).bind(String(e).slice(0, 500), id).run();
    return { id, key, ok: false as const, error: String(e) };
  }
}

/** Retención propuesta (§9): 7 diarias. Las semanales y mensuales se conservan aparte. Devuelve las claves a borrar. */
export function clavesCaducadas(claves: { key: string; uploaded: Date }[], conservar = 7): string[] {
  return [...claves].sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime()).slice(conservar).map((c) => c.key);
}
