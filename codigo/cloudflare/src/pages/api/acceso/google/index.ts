// GET /api/acceso/google?idioma=es&volver=/es/ → lleva a la pantalla de Google para elegir cuenta.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { guardarReto, idiomaValido, json } from '../../../../lib/acceso';
import { GOOGLE_AUTH, pkce, rutaSegura } from '../../../../lib/google';

export const GET: APIRoute = async ({ request, url }) => {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: '«Continuar con Google» aún no está activado' }, 503);
  const idioma = idiomaValido(url.searchParams.get('idioma'));
  const { verifier, challenge } = await pkce();
  const state = await guardarReto(env.DB, {
    kind: 'google_state', value: verifier, minutos: 10,
    data: { idioma, volver: rutaSegura(url.searchParams.get('volver'), `/${idioma}/`) },
  });
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${new URL(request.url).origin}/api/acceso/google/vuelta/`,
    response_type: 'code',
    scope: 'openid email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return new Response(null, { status: 302, headers: { Location: `${GOOGLE_AUTH}?${p}`, 'Cache-Control': 'no-store' } });
};
