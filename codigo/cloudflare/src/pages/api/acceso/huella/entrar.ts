// POST /api/acceso/huella/entrar: verifica la huella o cara y abre la sesión.
// La passkey ya es un factor fuerte: en administración no se pide además el código de la app (maestro §18).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { json, leerJson } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { verificarHuella } from '../../../../lib/passkeys';
import { abrirSesion } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const b = await leerJson<{ reto: string; respuesta: AuthenticationResponseJSON }>(request);
  const v = await verificarHuella(request, env.DB, b.reto, b.respuesta);
  if (!v.ok) return json({ error: v.error }, v.status);
  await auditar(env.DB, { actor: v.userId, origen: 'sistema', entidadTipo: 'account', entidadId: v.userId, accion: 'entrar', valorNuevo: { via: 'huella_o_cara' } }).run();
  const cookie = await abrirSesion(env.DB, env.SESSION_PEPPER, v.userId, true);
  return json({ ok: true, role: v.role }, 200, { 'Set-Cookie': cookie });
};
