// Acceso sin contraseña (maestro §18): código de 6 cifras por email, sesiones y límites de intentos y envíos.
// Google y «Continuar con huella o cara» (passkeys) se conectan a estas mismas sesiones.
// Nunca se guarda el código ni el token en claro: solo su hash SHA-256 con una sal secreta (SESSION_PEPPER).

import { ahoraIso, nuevoId } from './db';

export const CODIGO_MINUTOS = 10;         // caducidad corta
export const CODIGO_INTENTOS = 5;         // intentos por código
export const ENVIOS_POR_HORA = 5;         // envíos por email y hora
export const SESION_DIAS = 30;
export const COOKIE = '__Host-tm_sesion'; // __Host-: solo HTTPS, sin Domain, Path=/

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const hashCon = (pepper: string, valor: string) => sha256(`${pepper}:${valor}`);

/** Código de 6 cifras con aleatoriedad criptográfica y sin sesgo de módulo. */
export function generarCodigo(): string {
  const max = 4_294_967_296 - (4_294_967_296 % 1_000_000);
  const a = new Uint32Array(1);
  do crypto.getRandomValues(a); while (a[0]! >= max);
  return String(a[0]! % 1_000_000).padStart(6, '0');
}

/** Límite deslizante simple en D1. Devuelve true si se permite la acción. */
export async function permitir(db: D1Database, clave: string, maximo: number, ventanaSeg: number): Promise<boolean> {
  const ahora = Date.now();
  const fila = await db.prepare('SELECT count, window_ends_at FROM rate_limits WHERE key = ?').bind(clave)
    .first<{ count: number; window_ends_at: string }>();
  if (!fila || Date.parse(fila.window_ends_at) <= ahora) {
    await db.prepare('INSERT OR REPLACE INTO rate_limits (key, count, window_ends_at) VALUES (?, 1, ?)')
      .bind(clave, new Date(ahora + ventanaSeg * 1000).toISOString()).run();
    return true;
  }
  if (fila.count >= maximo) return false;
  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(clave).run();
  return true;
}

/** Crea un código para el email y lo devuelve (para enviarlo). null si se superó el límite de envíos. */
export async function crearCodigo(db: D1Database, pepper: string, email: string, proposito: 'entrar' | 'activar_empleado') {
  const e = email.trim().toLowerCase();
  if (!(await permitir(db, `envio:${e}`, ENVIOS_POR_HORA, 3600))) return null;
  const codigo = generarCodigo();
  await db.prepare(`UPDATE email_codes SET used_at = ? WHERE email = ? AND used_at IS NULL`).bind(ahoraIso(), e).run();
  await db.prepare(
    `INSERT INTO email_codes (id, email, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)`,
  ).bind(nuevoId(), e, await hashCon(pepper, `${e}:${codigo}`), proposito,
    new Date(Date.now() + CODIGO_MINUTOS * 60_000).toISOString()).run();
  return codigo;
}

/** Comprueba el código: un solo uso, caducidad y límite de intentos. */
export async function verificarCodigo(db: D1Database, pepper: string, email: string, codigo: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const fila = await db.prepare(
    `SELECT id, code_hash, attempts, expires_at FROM email_codes
     WHERE email = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
  ).bind(e).first<{ id: string; code_hash: string; attempts: number; expires_at: string }>();
  if (!fila || Date.parse(fila.expires_at) <= Date.now() || fila.attempts >= CODIGO_INTENTOS) return false;
  if (!/^\d{6}$/.test(codigo)) return false;
  const ok = fila.code_hash === (await hashCon(pepper, `${e}:${codigo}`));
  if (ok) await db.prepare('UPDATE email_codes SET used_at = ? WHERE id = ?').bind(ahoraIso(), fila.id).run();
  else await db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?').bind(fila.id).run();
  return ok;
}

/** Abre una sesión y devuelve la cabecera Set-Cookie. */
export async function abrirSesion(db: D1Database, pepper: string, userId: string, segundoFactor = false) {
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const expira = new Date(Date.now() + SESION_DIAS * 86_400_000);
  await db.prepare('INSERT INTO sessions (id_hash, user_id, second_factor_ok, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await hashCon(pepper, token), userId, segundoFactor ? 1 : 0, expira.toISOString()).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expira.toUTCString()}`;
}

export type Usuario = { id: string; role: 'usuario' | 'propietario' | 'empleado' | 'admin'; second_factor_ok: number };

/** Usuario de la cookie de sesión, o null. */
export async function usuarioDe(req: Request, db: D1Database, pepper: string): Promise<Usuario | null> {
  const m = (req.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`));
  if (!m) return null;
  return db.prepare(
    `SELECT u.id, u.role, s.second_factor_ok FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id_hash = ? AND s.expires_at > ?`,
  ).bind(await hashCon(pepper, m[1]!), ahoraIso()).first<Usuario>();
}
