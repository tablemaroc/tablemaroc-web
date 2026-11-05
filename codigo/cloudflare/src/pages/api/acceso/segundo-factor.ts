// Segundo factor de administración tras «Continuar con Google» (maestro §18): código de la app de autenticación (TOTP).
//   GET  → la primera vez, genera el secreto y devuelve el enlace otpauth:// para la app (solo una vez; se guarda cifrado).
//   POST { codigo } → si es correcto, la sesión queda con el segundo factor superado.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { base32, cifrar, descifrar, json, leerJson, totpValido } from '../../../lib/acceso';
import { auditar } from '../../../lib/db';
import { marcarSegundoFactor, permitir, usuarioDe } from '../../../lib/sesion';

export const GET: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u || u.role !== 'admin') return json({ error: 'Solo administración' }, 403);
  const fila = await env.DB.prepare('SELECT email, totp_secret_enc FROM users WHERE id = ?').bind(u.id).first<{ email: string; totp_secret_enc: string | null }>();
  if (fila?.totp_secret_enc) return json({ configurado: true });
  const secreto = crypto.getRandomValues(new Uint8Array(20));
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET totp_secret_enc = ? WHERE id = ? AND totp_secret_enc IS NULL').bind(await cifrar(env, secreto), u.id),
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'account', entidadId: u.id, accion: 'configurar_segundo_factor' }),
  ]);
  const etiqueta = encodeURIComponent(`Tablemaroc:${fila?.email ?? ''}`);
  return json({ configurado: false, otpauth: `otpauth://totp/${etiqueta}?secret=${base32(secreto)}&issuer=Tablemaroc&algorithm=SHA1&digits=6&period=30` });
};

export const POST: APIRoute = async ({ request }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u || u.role !== 'admin') return json({ error: 'Solo administración' }, 403);
  if (!(await permitir(env.DB, `totp:${u.id}`, 5, 300))) return json({ error: 'Demasiados intentos. Espera 5 minutos' }, 429);
  const b = await leerJson<{ codigo: string }>(request);
  const fila = await env.DB.prepare('SELECT totp_secret_enc FROM users WHERE id = ?').bind(u.id).first<{ totp_secret_enc: string | null }>();
  if (!fila?.totp_secret_enc) return json({ error: 'Primero configura la app de autenticación' }, 409);
  const ok = await totpValido(await descifrar(env, fila.totp_secret_enc), String(b.codigo ?? ''));
  await auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'account', entidadId: u.id, accion: ok ? 'segundo_factor_ok' : 'segundo_factor_fallido' }).run();
  if (!ok) return json({ error: 'Código incorrecto' }, 400);
  await marcarSegundoFactor(request, env.DB, env.SESSION_PEPPER);
  return json({ ok: true, volver: '/panel/' });
};
