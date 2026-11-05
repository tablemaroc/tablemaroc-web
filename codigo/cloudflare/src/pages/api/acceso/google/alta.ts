// POST /api/acceso/google/alta: último paso de «crear con Google» (nombre visible + aceptar condiciones).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { consumirReto, crearCuenta, idiomaValido, json, leerJson, nombreValido } from '../../../../lib/acceso';
import { abrirSesion } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const b = await leerJson<{ alta: string; nombre: string; acepta: boolean }>(request);
  const nombre = nombreValido(b.nombre);
  if (!nombre) return json({ error: 'Nombre visible no válido (2 a 40 caracteres)' }, 400);
  if (b.acepta !== true) return json({ error: 'Hay que aceptar las condiciones y la política de privacidad' }, 400);
  const reto = await consumirReto(env.DB, b.alta, 'google_alta');
  if (!reto) return json({ error: 'El alta ha caducado. Vuelve a continuar con Google' }, 400);
  const d = reto.data as { email: string; idioma: string; volver: string };
  const yaExiste = await env.DB.prepare('SELECT 1 FROM users WHERE email = ? OR google_sub = ?').bind(d.email, reto.value).first();
  if (yaExiste) return json({ error: 'Ya hay una cuenta con ese email. Entra con Google' }, 409);
  const c = await crearCuenta(env, { email: d.email, nombre, idioma: idiomaValido(d.idioma), googleSub: reto.value, emailVerificado: true, via: 'google' });
  const cookie = await abrirSesion(env.DB, env.SESSION_PEPPER, c.id, false);
  return json({ ok: true, role: c.role, volver: c.role === 'admin' ? '/panel/acceso/segundo-factor/' : d.volver }, 201, { 'Set-Cookie': cookie });
};
