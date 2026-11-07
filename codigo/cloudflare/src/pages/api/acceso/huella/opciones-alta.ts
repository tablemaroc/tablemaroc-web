// POST /api/acceso/huella/opciones-alta: prepara la confirmación con huella o cara (maestro §18).
//   - Sin sesión: «crear con huella o cara» (datos: nombre visible, email, aceptar condiciones; con Turnstile).
//   - Con sesión: añade huella o cara a la cuenta actual (desde «Mi cuenta» o el panel).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { buscarPorEmail, emailValido, guardarReto, idiomaValido, json, leerJson, nombreValido, turnstileOk } from '../../../../lib/acceso';
import { nuevoId } from '../../../../lib/db';
import { usuarioDe } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const rpID = new URL(request.url).hostname;
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  let userId: string; let email: string; let nombre: string; let data: Record<string, unknown> = {};

  if (u) {
    const f = await env.DB.prepare('SELECT email, display_name FROM users WHERE id = ?').bind(u.id).first<{ email: string; display_name: string | null }>();
    userId = u.id; email = f!.email; nombre = f!.display_name ?? f!.email;
  } else {
    const b = await leerJson<{ email: string; nombre: string; acepta: boolean; idioma: string; turnstile: string }>(request);
    if (!emailValido(b.email)) return json({ error: 'Email no válido' }, 400);
    const n = nombreValido(b.nombre);
    if (!n) return json({ error: 'Nombre visible no válido (2 a 40 caracteres)' }, 400);
    if (b.acepta !== true) return json({ error: 'Hay que aceptar las condiciones y la política de privacidad' }, 400);
    if (!(await turnstileOk(env, b.turnstile, request.headers.get('CF-Connecting-IP')))) return json({ error: 'Comprobación antispam no superada' }, 400);
    email = b.email.trim().toLowerCase();
    if (await buscarPorEmail(env.DB, email)) {
      return json({ error: 'Ya hay una cuenta con ese email. Entra con email o Google y añade huella o cara desde Mi cuenta' }, 409);
    }
    userId = nuevoId(); nombre = n;
    data = { alta: { email, nombre: n, idioma: idiomaValido(b.idioma) } };
  }

  const existentes = await env.DB.prepare('SELECT id, transports FROM passkeys WHERE user_id = ?').bind(userId).all<{ id: string; transports: string | null }>();
  const opciones = await generateRegistrationOptions({
    rpName: 'Tablemaroc', rpID, userName: email, userDisplayName: nombre,
    userID: new TextEncoder().encode(userId),
    attestationType: 'none',
    excludeCredentials: existentes.results.map((p) => ({ id: p.id, transports: p.transports ? JSON.parse(p.transports) : undefined })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  const reto = await guardarReto(env.DB, { kind: 'passkey_registro', value: opciones.challenge, userId: u ? userId : null, data: { ...data, userId }, minutos: 5 });
  return json({ reto, opciones });
};
