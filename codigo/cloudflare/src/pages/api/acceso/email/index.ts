// POST /api/acceso/email: «Continuar con email». Envía un código de 6 cifras (maestro §18).
// Con Turnstile (antispam) y límite de envíos. La respuesta es la misma exista o no la cuenta (no revela emails).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { EmailPendiente, emailValido, enviarCodigo, idiomaValido, json, leerJson, turnstileOk } from '../../../../lib/acceso';
import { crearCodigo, permitir } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const b = await leerJson<{ email: string; turnstile: string; idioma: string }>(request);
  if (!emailValido(b.email)) return json({ error: 'Email no válido' }, 400);
  const ip = request.headers.get('CF-Connecting-IP');
  if (!(await permitir(env.DB, `envio-ip:${ip ?? 'sin-ip'}`, 20, 3600))) return json({ error: 'Demasiados intentos. Prueba más tarde' }, 429);
  if (!(await turnstileOk(env, b.turnstile, ip))) return json({ error: 'Comprobación antispam no superada' }, 400);

  const codigo = await crearCodigo(env.DB, env.SESSION_PEPPER, b.email, 'entrar');
  if (!codigo) return json({ error: 'Demasiados códigos enviados. Prueba dentro de una hora' }, 429);
  try {
    await enviarCodigo(env, b.email.trim().toLowerCase(), codigo, idiomaValido(b.idioma));
  } catch (e) {
    if (e instanceof EmailPendiente) return json({ error: 'El envío de emails aún no está activado' }, 503);
    throw e;
  }
  return json({ enviado: true });
};
