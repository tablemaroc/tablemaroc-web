// POST /api/acceso/huella/entrar: verifica la huella o cara y abre la sesión.
// La passkey ya es un factor fuerte: en administración no se pide además el código de la app (maestro §18).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from '@simplewebauthn/server';
import { consumirReto, deB64url, json, leerJson } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { abrirSesion } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const b = await leerJson<{ reto: string; respuesta: AuthenticationResponseJSON }>(request);
  const reto = await consumirReto(env.DB, b.reto, 'passkey_acceso');
  if (!reto || !b.respuesta?.id) return json({ error: 'La confirmación ha caducado. Vuelve a intentarlo' }, 400);

  const pk = await env.DB.prepare(
    `SELECT p.id, p.user_id, p.public_key, p.sign_count, p.transports, u.role FROM passkeys p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
  ).bind(b.respuesta.id).first<{ id: string; user_id: string; public_key: string; sign_count: number; transports: string | null; role: string }>();
  if (!pk) return json({ error: 'Esta huella o cara no está asociada a ninguna cuenta' }, 404);

  const url = new URL(request.url);
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response: b.respuesta, expectedChallenge: reto.value, expectedOrigin: url.origin, expectedRPID: url.hostname,
      credential: { id: pk.id, publicKey: deB64url(pk.public_key), counter: pk.sign_count, transports: pk.transports ? JSON.parse(pk.transports) : undefined },
      requireUserVerification: true,
    });
  } catch { return json({ error: 'No se pudo verificar la huella o cara' }, 400); }
  if (!v.verified) return json({ error: 'No se pudo verificar la huella o cara' }, 400);

  await env.DB.batch([
    env.DB.prepare('UPDATE passkeys SET sign_count = ?, last_used_at = ? WHERE id = ?').bind(v.authenticationInfo.newCounter, new Date().toISOString(), pk.id),
    auditar(env.DB, { actor: pk.user_id, origen: 'sistema', entidadTipo: 'account', entidadId: pk.user_id, accion: 'entrar', valorNuevo: { via: 'huella_o_cara' } }),
  ]);
  const cookie = await abrirSesion(env.DB, env.SESSION_PEPPER, pk.user_id, true);
  return json({ ok: true, role: pk.role }, 200, { 'Set-Cookie': cookie });
};
