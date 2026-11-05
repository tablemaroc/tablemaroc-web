// POST /api/acceso/email/verificar: comprueba el código y abre la sesión (maestro §18).
// Si el email no tiene cuenta, responde { crearCuenta: true } y la pantalla «Crear cuenta» vuelve a llamar
// con el MISMO código y { crear: { nombre, acepta: true } }. Por eso el código solo se consume al final.
// Administración no entra con código por email: solo Google + código de la app, o huella o cara.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { buscarPorEmail, crearCuenta, emailValido, idiomaValido, json, leerJson, nombreValido } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { abrirSesion, codigoCorrecto, consumirCodigo } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const b = await leerJson<{ email: string; codigo: string; idioma: string; crear: { nombre: string; acepta: boolean } }>(request);
  if (!emailValido(b.email) || typeof b.codigo !== 'string') return json({ error: 'Datos no válidos' }, 400);
  const email = b.email.trim().toLowerCase();

  const id = await codigoCorrecto(env.DB, env.SESSION_PEPPER, email, b.codigo);
  if (!id) return json({ error: 'Código incorrecto o caducado' }, 400);

  let cuenta = await buscarPorEmail(env.DB, email);
  if (cuenta?.role === 'admin') return json({ error: 'Administración entra con Google o con huella o cara' }, 403);

  if (!cuenta) {
    if (!b.crear) return json({ crearCuenta: true });
    const nombre = nombreValido(b.crear.nombre);
    if (!nombre) return json({ error: 'Nombre visible no válido (2 a 40 caracteres)' }, 400);
    if (b.crear.acepta !== true) return json({ error: 'Hay que aceptar las condiciones y la política de privacidad' }, 400);
    if (!(await consumirCodigo(env.DB, id))) return json({ error: 'Código ya usado' }, 400);
    cuenta = await crearCuenta(env, { email, nombre, idioma: idiomaValido(b.idioma), emailVerificado: true, via: 'email' });
    if (cuenta.role === 'admin') return json({ error: 'Administración entra con Google o con huella o cara' }, 403);
  } else {
    if (!(await consumirCodigo(env.DB, id))) return json({ error: 'Código ya usado' }, 400);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET email_verified_at = coalesce(email_verified_at, ?) WHERE id = ?').bind(new Date().toISOString(), cuenta.id),
      auditar(env.DB, { actor: cuenta.id, origen: 'sistema', entidadTipo: 'account', entidadId: cuenta.id, accion: 'entrar', valorNuevo: { via: 'email' } }),
    ]);
  }
  const cookie = await abrirSesion(env.DB, env.SESSION_PEPPER, cuenta.id);
  return json({ ok: true, role: cuenta.role }, 200, { 'Set-Cookie': cookie });
};
