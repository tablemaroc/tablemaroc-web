// POST /api/acceso/huella/alta: verifica la confirmación con huella o cara y guarda la passkey.
// La huella o la cara nunca salen del dispositivo: solo se guarda una clave pública.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server';
import { b64url, consumirReto, crearCuenta, json, leerJson } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { abrirSesion } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const b = await leerJson<{ reto: string; respuesta: RegistrationResponseJSON }>(request);
  const reto = await consumirReto(env.DB, b.reto, 'passkey_registro');
  if (!reto || !b.respuesta) return json({ error: 'La confirmación ha caducado. Vuelve a intentarlo' }, 400);
  const url = new URL(request.url);

  let v;
  try {
    v = await verifyRegistrationResponse({
      response: b.respuesta, expectedChallenge: reto.value, expectedOrigin: url.origin, expectedRPID: url.hostname,
      requireUserVerification: true,
    });
  } catch { return json({ error: 'No se pudo verificar la huella o cara' }, 400); }
  if (!v.verified) return json({ error: 'No se pudo verificar la huella o cara' }, 400);

  const d = reto.data as { userId: string; alta?: { email: string; nombre: string; idioma: 'es' | 'en' | 'fr' } };
  const userId = d.userId;
  if (d.alta) {
    if (await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(d.alta.email).first()) {
      return json({ error: 'Ya hay una cuenta con ese email' }, 409);
    }
    // Email escrito por el usuario, sin verificar (§18): queda marcado como no verificado.
    await crearCuenta(env, { id: userId, ...d.alta, emailVerificado: false, via: 'huella_o_cara' });
  } else if (reto.userId !== userId) {
    return json({ error: 'Sesión no válida' }, 403);
  }

  const c = v.registrationInfo.credential;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO passkeys (id, user_id, public_key, sign_count, transports) VALUES (?, ?, ?, ?, ?)')
      .bind(c.id, userId, b64url(c.publicKey), c.counter, c.transports ? JSON.stringify(c.transports) : null),
    auditar(env.DB, { actor: userId, origen: 'sistema', entidadTipo: 'account', entidadId: userId, accion: 'añadir_huella_o_cara' }),
  ]);
  const headers: Record<string, string> = {};
  if (d.alta) headers['Set-Cookie'] = await abrirSesion(env.DB, env.SESSION_PEPPER, userId, true);
  return json({ ok: true }, 201, headers);
};
