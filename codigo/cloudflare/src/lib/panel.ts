// Panel propio (maestro §2, §20): API autenticada con roles. Sin plantillas visuales hasta que se apruebe el diseño (§19);
// Claude Code opera el panel por esta misma API, con permisos propios y todo auditado.
//   - Administración: todo, siempre con el segundo factor superado (Google + código de la app, o huella o cara).
//   - Propietario: solo su local (Escritorio, Reservas, Información, Menú, Fotos, Reseñas, Empleados).
//   - Empleado: solo las reservas de su local (ver, confirmar, «No disponible»).

import { env } from 'cloudflare:workers';
import type { APIContext } from 'astro';
import { json } from './acceso.ts';
import { usuarioDe, type Usuario } from './sesion.ts';

export type Rol = Usuario['role'];
export type Contexto = { u: Usuario; actor: string; origen: 'panel' | 'claude_code' };

export class Prohibido extends Error {}

/** Sesión del panel. Administración sin segundo factor no pasa. El empleado con email verificado
 *  y un acceso «pendiente de activar» lo activa al entrar (§18: «el empleado activa su acceso con el email recibido»). */
export async function sesionPanel(req: Request, roles: Rol[]): Promise<Contexto | Response> {
  const u = await usuarioDe(req, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar' }, 401);
  if (u.role === 'admin' && u.second_factor_ok !== 1) return json({ error: 'Falta el segundo factor', segundoFactor: true }, 401);
  if (u.role === 'usuario') await activarEmpleos(u);
  const rol = (await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(u.id).first<{ role: Rol }>())?.role ?? u.role;
  const uu = { ...u, role: rol };
  if (!roles.includes(uu.role)) return json({ error: 'No tienes permiso para esta sección' }, 403);
  // Claude Code se identifica con la cabecera X-Origen: claude_code (solo con una cuenta de administración).
  const origen = uu.role === 'admin' && req.headers.get('X-Origen') === 'claude_code' ? 'claude_code' : 'panel';
  return { u: uu, actor: origen === 'claude_code' ? `claude_code:${uu.id}` : uu.id, origen };
}

async function activarEmpleos(u: Usuario) {
  const f = await env.DB.prepare('SELECT email, email_verified_at FROM users WHERE id = ?').bind(u.id).first<{ email: string; email_verified_at: string | null }>();
  if (!f?.email_verified_at) return;   // con email sin verificar (alta con huella o cara) no se activa nada
  const p = await env.DB.prepare(`SELECT id FROM place_staff WHERE email = ? AND status = 'pendiente_activar'`).bind(f.email).all<{ id: string }>();
  if (!p.results.length) return;
  const ahora = new Date().toISOString();
  await env.DB.batch([
    ...p.results.map((r) => env.DB.prepare(`UPDATE place_staff SET status = 'activo', user_id = ?, updated_at = ? WHERE id = ?`).bind(u.id, ahora, r.id)),
    env.DB.prepare(`UPDATE users SET role = 'empleado', updated_at = ? WHERE id = ? AND role = 'usuario'`).bind(ahora, u.id),
  ]);
}

/** Locales que la persona puede gestionar. null = todos (administración). */
export async function localesDe(c: Contexto): Promise<string[] | null> {
  if (c.u.role === 'admin') return null;
  const q = c.u.role === 'propietario'
    ? env.DB.prepare('SELECT place_id FROM place_owners WHERE user_id = ?')
    : env.DB.prepare(`SELECT place_id FROM place_staff WHERE user_id = ? AND status = 'activo'`);
  return (await q.bind(c.u.id).all<{ place_id: string }>()).results.map((r) => r.place_id);
}

export async function puedeLocal(c: Contexto, placeId: string): Promise<boolean> {
  const l = await localesDe(c);
  return l === null || l.includes(placeId);
}

export async function esPropietarioDe(c: Contexto, placeId: string): Promise<boolean> {
  if (c.u.role === 'admin') return true;
  return !!(await env.DB.prepare('SELECT 1 FROM place_owners WHERE place_id = ? AND user_id = ?').bind(placeId, c.u.id).first());
}

type Manejador = (ctx: APIContext, c: Contexto) => Promise<Response>;

/** Envuelve un endpoint del panel: sesión, roles y errores. */
export const panel = (roles: Rol[], fn: Manejador) => async (ctx: APIContext): Promise<Response> => {
  const c = await sesionPanel(ctx.request, roles);
  if (c instanceof Response) return c;
  try { return await fn(ctx, c); } catch (e) {
    if (e instanceof Prohibido) return json({ error: e.message || 'No tienes permiso' }, 403);
    throw e;
  }
};

export const SOLO_ADMIN: Rol[] = ['admin'];
export const ADMIN_Y_PROPIETARIO: Rol[] = ['admin', 'propietario'];
export const TODOS_LOS_ROLES_DEL_PANEL: Rol[] = ['admin', 'propietario', 'empleado'];

export const MOTIVO_MAX = 500;
export function motivoValido(m: unknown): string | null {
  return typeof m === 'string' && m.trim().length >= 3 ? m.trim().slice(0, MOTIVO_MAX) : null;
}
