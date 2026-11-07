// Derechos sobre los datos personales (maestro §3.2, §10; RGPD y Ley 09-08): descarga y borrado de la cuenta.
// Lo usan «Mi cuenta» (el propio usuario) y la sección Usuarios del panel (cuando la petición llega por email).
// Las reservas no se borran (historial, §18 bis): quedan sin usuario y sin datos personales.

import { auditar, type Origen } from './db.ts';

export async function exportarDatos(db: D1Database, userId: string) {
  const q = (sql: string) => db.prepare(sql).bind(userId).all().then((r) => r.results);
  return {
    generado: new Date().toISOString(),
    cuenta: await db.prepare('SELECT id, email, display_name, preferred_locale, role, email_verified_at, created_at FROM users WHERE id = ?').bind(userId).first(),
    consentimientos: await q('SELECT purpose, version, granted, granted_at FROM consents WHERE user_id = ?'),
    resenas: await q('SELECT place_id, rating, comment, visited_on, trip_type, status, created_at FROM reviews WHERE user_id = ?'),
    fotos: await q('SELECT id, place_id, review_id, status, created_at FROM photos WHERE user_id = ?'),
    reservas: await q('SELECT place_id, party_size, requested_for, special_request, status, created_at FROM reservations WHERE user_id = ?'),
    favoritos: await q('SELECT place_id, created_at FROM favorites WHERE user_id = ?'),
    huellaOCara: await q('SELECT created_at, last_used_at FROM passkeys WHERE user_id = ?'),
    reclamaciones: await q('SELECT place_id, method, status, created_at FROM business_claims WHERE user_id = ?'),
  };
}

export type ResultadoBorrado = { ok: true } | { ok: false; status: number; error: string };

/** Borra la cuenta y sus datos (reseñas, fotos, favoritos, passkeys, sesiones, consentimientos) y las fotos en R2. */
export async function borrarCuenta(db: D1Database, r2: R2Bucket, userId: string, actor: string, origen: Origen, motivo: string): Promise<ResultadoBorrado> {
  const u = await db.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first<{ role: string }>();
  if (!u) return { ok: false, status: 404, error: 'No existe' };
  if (u.role !== 'usuario') return { ok: false, status: 409, error: 'Antes hay que retirar su rol de local o de administración' };
  const fotos = await db.prepare('SELECT r2_key FROM photos WHERE user_id = ?').bind(userId).all<{ r2_key: string }>();
  await db.batch([
    db.prepare('DELETE FROM photos WHERE user_id = ?').bind(userId),
    db.prepare('UPDATE reservations SET special_request = NULL WHERE user_id = ?').bind(userId),   // sin datos personales en el historial
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),   // en cascada: reseñas, favoritos, passkeys, sesiones, consentimientos
    auditar(db, { actor, origen, entidadTipo: 'account', entidadId: userId, accion: 'borrar_cuenta', motivo }),
  ]);
  if (fotos.results.length) await r2.delete(fotos.results.map((f) => f.r2_key));
  return { ok: true };
}
