// GET /api/acceso/google/vuelta: Google devuelve aquí al usuario (maestro §18).
//   - Cuenta ya enlazada a Google o con ese email → entra.
//   - Sin cuenta → pantalla «último paso» de crear con Google (nombre visible y aceptar condiciones).
//   - Correo autorizado de administración → entra SIN segundo factor y va a la pantalla del código de la app.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { consumirReto, esAdminAutorizado, guardarReto, json } from '../../../../lib/acceso';
import { auditar } from '../../../../lib/db';
import { GOOGLE_TOKEN, validarIdToken } from '../../../../lib/google';
import { abrirSesion } from '../../../../lib/sesion';

const ir = (to: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', ...headers } });

export const GET: APIRoute = async ({ request, url }) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return json({ error: '«Continuar con Google» aún no está activado' }, 503);
  const reto = await consumirReto(env.DB, url.searchParams.get('state'), 'google_state');
  if (!reto) return ir('/es/acceso/?error=caducado');
  const { idioma, volver } = reto.data as { idioma: string; volver: string };
  const code = url.searchParams.get('code');
  if (!code) return ir(`/${idioma}/acceso/?error=cancelado`);

  const r = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${new URL(request.url).origin}/api/acceso/google/vuelta/`,
      grant_type: 'authorization_code', code_verifier: reto.value,
    }),
  });
  const tok = (await r.json().catch(() => ({}))) as { id_token?: string };
  const g = r.ok && tok.id_token ? validarIdToken(tok.id_token, env.GOOGLE_CLIENT_ID) : null;
  if (!g) return ir(`/${idioma}/acceso/?error=google`);

  let u = await env.DB.prepare('SELECT id, role, google_sub FROM users WHERE google_sub = ? OR email = ? ORDER BY google_sub = ? DESC LIMIT 1')
    .bind(g.sub, g.email, g.sub).first<{ id: string; role: string; google_sub: string | null }>();

  if (!u) {
    const alta = await guardarReto(env.DB, { kind: 'google_alta', value: g.sub, minutos: 15, data: { email: g.email, idioma, volver } });
    return ir(`/${idioma}/acceso/crear-con-google/?alta=${alta}`);
  }
  if (u.google_sub && u.google_sub !== g.sub) return ir(`/${idioma}/acceso/?error=otra-cuenta-google`);

  const admin = esAdminAutorizado(env, g.email);
  const cambios: D1PreparedStatement[] = [
    env.DB.prepare('UPDATE users SET google_sub = ?, email_verified_at = coalesce(email_verified_at, ?) WHERE id = ?')
      .bind(g.sub, new Date().toISOString(), u.id),
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'account', entidadId: u.id, accion: 'entrar', valorNuevo: { via: 'google' } }),
  ];
  if (admin && u.role !== 'admin') {
    cambios.push(env.DB.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).bind(u.id),
      auditar(env.DB, { actor: 'sistema', origen: 'sistema', entidadTipo: 'account', entidadId: u.id, accion: 'rol', campo: 'role',
        valorAnterior: u.role, valorNuevo: 'admin', motivo: 'Correo autorizado en ADMIN_EMAILS' }));
    u = { ...u, role: 'admin' };
  }
  await env.DB.batch(cambios);
  const cookie = await abrirSesion(env.DB, env.SESSION_PEPPER, u.id, false);
  return ir(u.role === 'admin' ? '/panel/acceso/segundo-factor/' : volver, { 'Set-Cookie': cookie });
};
