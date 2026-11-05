// POST /api/acceso/huella/opciones-entrar: reto para «Continuar con huella o cara» (el dispositivo elige la cuenta).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { guardarReto, json } from '../../../../lib/acceso';
import { permitir } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  if (!(await permitir(env.DB, `huella-ip:${request.headers.get('CF-Connecting-IP') ?? 'sin-ip'}`, 30, 600))) {
    return json({ error: 'Demasiados intentos. Prueba más tarde' }, 429);
  }
  const opciones = await generateAuthenticationOptions({ rpID: new URL(request.url).hostname, userVerification: 'required' });
  const reto = await guardarReto(env.DB, { kind: 'passkey_acceso', value: opciones.challenge, minutos: 5 });
  return json({ reto, opciones });
};
