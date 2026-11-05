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

// ───────────── Restaurar (§20) ─────────────
// Restaurar devuelve a su estado de la copia cada registro que está en ella. NO borra nada (maestro §1):
// lo creado después de la copia se conserva. La auditoría y las reservas son historial: solo se añaden
// las filas que falten, nunca se reescriben. Antes de restaurar, el endpoint hace una copia del estado actual.

const SOLO_ANADIR = new Set(['audit_log', 'reservations']);
const IDENT = /^[a-z_][a-z0-9_]*$/;

export function validarVolcado(v: unknown): v is Volcado {
  if (!v || typeof v !== 'object') return false;
  const x = v as Partial<Volcado>;
  if (x.version !== 1 || !x.tablas || typeof x.tablas !== 'object') return false;
  return Object.entries(x.tablas).every(([t, filas]) => (TABLAS_COPIA as readonly string[]).includes(t) && Array.isArray(filas));
}

export async function restaurarBase(db: D1Database, v: Volcado): Promise<Record<string, number>> {
  const resumen: Record<string, number> = {};
  for (const t of TABLAS_COPIA) {
    const filas = (v.tablas[t] ?? []) as Record<string, unknown>[];
    if (!filas.length) continue;
    const info = await db.prepare(`PRAGMA table_info(${t})`).all<{ name: string; pk: number }>();
    const columnas = info.results.map((c) => c.name).filter((c) => IDENT.test(c));
    const pk = info.results.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
    const resto = columnas.filter((c) => !pk.includes(c));
    const sql = SOLO_ANADIR.has(t) || !resto.length
      ? `INSERT OR IGNORE INTO ${t} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`
      : `INSERT INTO ${t} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})
         ON CONFLICT(${pk.join(', ')}) DO UPDATE SET ${resto.map((c) => `${c} = excluded.${c}`).join(', ')}`;
    const stmt = db.prepare(sql);
    for (let i = 0; i < filas.length; i += 50) {
      const lote = filas.slice(i, i + 50).map((f) => stmt.bind(...columnas.map((c) => (f[c] === undefined ? null : f[c]))));
      await db.batch([db.prepare('PRAGMA defer_foreign_keys = ON'), ...lote]);
    }
    resumen[t] = filas.length;
  }
  return resumen;
}
