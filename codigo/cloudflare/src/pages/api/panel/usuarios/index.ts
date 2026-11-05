// GET /api/panel/usuarios?buscar=&rol=   sección Usuarios del panel (RGPD, §20). Solo administración.
// El email solo se ve aquí, para atender peticiones de acceso o borrado; nunca es público (§18).
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { panel, SOLO_ADMIN } from '../../../../lib/panel';

const ROLES = ['usuario', 'propietario', 'empleado', 'admin'];

export const GET = panel(SOLO_ADMIN, async ({ url }) => {
  const where: string[] = []; const args: unknown[] = [];
  const buscar = url.searchParams.get('buscar');
  if (buscar) { where.push('(u.email LIKE ? OR u.display_name LIKE ?)'); args.push(`%${buscar}%`, `%${buscar}%`); }
  const rol = url.searchParams.get('rol');
  if (rol) { if (!ROLES.includes(rol)) return json({ error: 'Rol no válido' }, 400); where.push('u.role = ?'); args.push(rol); }
  const r = await env.DB.prepare(
    `SELECT u.id, u.display_name, u.email, u.role, u.email_verified_at, u.created_at,
            (SELECT count(*) FROM reviews WHERE user_id = u.id) AS resenas,
            (SELECT count(*) FROM reservations WHERE user_id = u.id) AS reservas,
            (SELECT count(*) FROM passkeys WHERE user_id = u.id) AS huella_o_cara,
            (SELECT count(*) FROM sessions WHERE user_id = u.id AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')) AS sesiones_abiertas
     FROM users u ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY u.created_at DESC LIMIT 200`,
  ).bind(...args).all();
  return json({ usuarios: r.results });
});
