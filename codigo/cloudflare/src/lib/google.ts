// «Continuar con Google» (maestro §18): OAuth 2.0 con código de autorización + PKCE y `state` de un solo uso.
// Solo se pide `openid email`: no se copia el nombre ni la foto de Google; el nombre visible lo elige el usuario.

import { b64url } from './acceso.ts';

export const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

export async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  return { verifier, challenge };
}

/** Solo rutas internas: evita redirecciones abiertas a otros sitios. */
export function rutaSegura(v: unknown, porDefecto: string): string {
  return typeof v === 'string' && /^\/(?![/\\])[\w\-./?=&%]*$/.test(v) && !v.includes('..') ? v : porDefecto;
}

export type ClaimsGoogle = { sub: string; email: string };

/** Valida el id_token recibido DIRECTAMENTE del endpoint de tokens de Google por HTTPS
 *  (en ese caso Google permite no verificar la firma; sí se comprueban emisor, audiencia, caducidad y email verificado). */
export function validarIdToken(idToken: string, clientId: string, ahora = Date.now()): ClaimsGoogle | null {
  const partes = idToken.split('.');
  if (partes.length !== 3) return null;
  let c: Record<string, unknown>;
  try {
    c = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(partes[1]!.replace(/-/g, '+').replace(/_/g, '/')), (x) => x.charCodeAt(0))));
  } catch { return null; }
  if (c.iss !== 'https://accounts.google.com' && c.iss !== 'accounts.google.com') return null;
  if (c.aud !== clientId) return null;
  if (typeof c.exp !== 'number' || c.exp * 1000 <= ahora) return null;
  if (c.email_verified !== true || typeof c.email !== 'string' || typeof c.sub !== 'string') return null;
  return { sub: c.sub, email: c.email.toLowerCase() };
}
