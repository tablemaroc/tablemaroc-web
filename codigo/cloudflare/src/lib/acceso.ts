// Piezas comunes del acceso sin contraseña (maestro §18): respuestas, antispam, email, cuentas,
// retos temporales, segundo factor (TOTP) de administración y cifrado de su secreto.

import { auditar, ahoraIso, nuevoId } from './db.ts';

export const CONDICIONES_VERSION = 'borrador-2026-11-06';   // se sube al publicar la política revisada (§10)
export const NOMBRE_MAX = 40;

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export async function leerJson<T>(req: Request): Promise<Partial<T>> {
  const t = await req.text();
  if (t.length > 20_000) return {};
  try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

export const emailValido = (e: unknown): e is string =>
  typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function nombreValido(n: unknown): string | null {
  if (typeof n !== 'string') return null;
  const v = n.normalize('NFC').replace(/\s+/g, ' ').trim();
  return v.length >= 2 && v.length <= NOMBRE_MAX && !/[<>@]/.test(v) ? v : null;
}

export const idiomaValido = (i: unknown): 'es' | 'en' | 'fr' => (i === 'en' || i === 'fr' ? i : 'es');

/** Turnstile (antispam, §18 ter). Sin secreto configurado no se deja pasar nada. */
export async function turnstileOk(env: Env, token: unknown, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET || typeof token !== 'string' || !token) return false;
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const d = (await r.json().catch(() => ({}))) as { success?: boolean };
  return d.success === true;
}

export { EmailPendiente } from './email.ts';
import { enviar, mensajeCodigo } from './email.ts';

/** Envía el código de acceso por email (Brevo, src/lib/email.ts). */
export async function enviarCodigo(env: Env, email: string, codigo: string, idioma: 'es' | 'en' | 'fr') {
  await enviar(env, email, mensajeCodigo(codigo, idioma), 'codigo-acceso');
}

/** Correos autorizados para administración (variable ADMIN_EMAILS, separados por comas). */
export function esAdminAutorizado(env: Env, email: string): boolean {
  return (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export type Cuenta = { id: string; role: 'usuario' | 'propietario' | 'empleado' | 'admin'; email: string };

export const buscarPorEmail = (db: D1Database, email: string) =>
  db.prepare('SELECT id, role, email FROM users WHERE email = ?').bind(email.trim().toLowerCase()).first<Cuenta>();

/** Alta de usuario con su consentimiento (versión y fecha, §10), auditada. */
export async function crearCuenta(
  env: Env,
  d: { id?: string; email: string; nombre: string; idioma: 'es' | 'en' | 'fr'; googleSub?: string; emailVerificado: boolean; via: string },
): Promise<Cuenta> {
  const id = d.id ?? nuevoId();
  const email = d.email.trim().toLowerCase();
  const role = esAdminAutorizado(env, email) ? 'admin' : 'usuario';
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, email, google_sub, display_name, preferred_locale, role, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, email, d.googleSub ?? null, d.nombre, d.idioma, role, d.emailVerificado ? ahoraIso() : null),
    env.DB.prepare(`INSERT INTO consents (id, user_id, purpose, version, granted) VALUES (?, ?, 'condiciones_y_privacidad', ?, 1)`)
      .bind(nuevoId(), id, CONDICIONES_VERSION),
    auditar(env.DB, { actor: id, origen: 'sistema', entidadTipo: 'account', entidadId: id, accion: 'crear_cuenta', valorNuevo: { via: d.via, role } }),
  ]);
  return { id, role, email };
}

// ───────────── Retos temporales ─────────────

export async function guardarReto(
  db: D1Database, r: { id?: string; kind: string; value: string; userId?: string | null; data?: unknown; minutos?: number },
) {
  const id = r.id ?? nuevoId();
  await db.prepare('DELETE FROM auth_challenges WHERE expires_at < ?').bind(ahoraIso()).run();
  await db.prepare(`INSERT INTO auth_challenges (id, kind, value, user_id, data, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, r.kind, r.value, r.userId ?? null, r.data === undefined ? null : JSON.stringify(r.data),
      new Date(Date.now() + (r.minutos ?? 5) * 60_000).toISOString()).run();
  return id;
}

/** Lee y BORRA el reto (un solo uso). null si no existe, es de otro tipo o caducó. */
export async function consumirReto(db: D1Database, id: unknown, kind: string) {
  if (typeof id !== 'string' || !id) return null;
  const r = await db.prepare(`DELETE FROM auth_challenges WHERE id = ? AND kind = ? RETURNING value, user_id, data, expires_at`)
    .bind(id, kind).first<{ value: string; user_id: string | null; data: string | null; expires_at: string }>();
  if (!r || Date.parse(r.expires_at) <= Date.now()) return null;
  return { value: r.value, userId: r.user_id, data: r.data ? JSON.parse(r.data) : null };
}

// ───────────── Base64url ─────────────

export const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function deB64url(s: string): Uint8Array<ArrayBuffer> {
  const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}

// ───────────── Segundo factor de administración (TOTP, RFC 6238) ─────────────

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(b: Uint8Array): string {
  let bits = 0, val = 0, out = '';
  for (const x of b) { val = (val << 8) | x; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
export function deBase32(s: string): Uint8Array<ArrayBuffer> {
  const out: number[] = []; let bits = 0, val = 0;
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const i = B32.indexOf(c); if (i < 0) throw new Error('base32 no válido');
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Uint8Array.from(out);
}

export async function totp(secreto: Uint8Array<ArrayBuffer>, tiempoMs = Date.now(), paso = 30): Promise<string> {
  const contador = Math.floor(tiempoMs / 1000 / paso);
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setBigUint64(0, BigInt(contador));
  const key = await crypto.subtle.importKey('raw', secreto, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[h.length - 1]! & 15;
  const n = ((h[o]! & 127) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, '0');
}

/** Acepta el código actual y el de ±1 paso (desfase de reloj). */
export async function totpValido(secreto: Uint8Array<ArrayBuffer>, codigo: string, ahora = Date.now()): Promise<boolean> {
  if (!/^\d{6}$/.test(codigo)) return false;
  for (const d of [-1, 0, 1]) if ((await totp(secreto, ahora + d * 30_000)) === codigo) return true;
  return false;
}

// AES-GCM con TOTP_KEY (32 bytes en base64url): el secreto del segundo factor nunca se guarda en claro.
async function claveAes(env: Env) {
  if (!env.TOTP_KEY) throw new Error('Falta el secreto TOTP_KEY (lo crea el titular)');
  return crypto.subtle.importKey('raw', deB64url(env.TOTP_KEY), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function cifrar(env: Env, datos: Uint8Array<ArrayBuffer>): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await claveAes(env), datos));
  return `${b64url(iv)}.${b64url(c)}`;
}
export async function descifrar(env: Env, texto: string): Promise<Uint8Array<ArrayBuffer>> {
  const [iv, c] = texto.split('.');
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64url(iv!) }, await claveAes(env), deB64url(c!)));
}
