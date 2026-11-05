// POST /api/locales/:id/reclamar  { metodo, datos? }: el dueño de un local pide su acceso (maestro §12, §18 bis).
// Verificación de titularidad SIN coste: la decide administración tras comprobarla por la vía elegida.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../lib/acceso';
import { auditar, nuevoId } from '../../../../lib/db';
import { permitir, usuarioDe } from '../../../../lib/sesion';

const METODOS = ['email_del_dominio_del_local', 'telefono_publico_del_local', 'visita_al_local', 'documento_del_negocio'] as const;

export const POST: APIRoute = async ({ request, params }) => {
  const u = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!u) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);
  if (!(await permitir(env.DB, `reclamar:${u.id}`, 5, 86_400))) return json({ error: 'Demasiadas solicitudes hoy' }, 429);
  const b = await leerJson<{ metodo: string; datos: string }>(request);
  if (!METODOS.includes(b.metodo as (typeof METODOS)[number])) return json({ error: 'Vía de verificación no válida', vias: METODOS }, 400);
  const local = await env.DB.prepare(`SELECT 1 FROM places WHERE id = ? AND status = 'publicado'`).bind(params.id).first();
  if (!local) return json({ error: 'Local no encontrado' }, 404);
  if (await env.DB.prepare('SELECT 1 FROM place_owners WHERE place_id = ?').bind(params.id).first()) {
    return json({ error: 'Este local ya tiene propietario. Escríbenos si crees que es un error' }, 409);
  }
  if (await env.DB.prepare(`SELECT 1 FROM business_claims WHERE place_id = ? AND user_id = ? AND status = 'pendiente'`).bind(params.id, u.id).first()) {
    return json({ error: 'Ya tienes una solicitud pendiente para este local' }, 409);
  }
  const id = nuevoId();
  const datos = typeof b.datos === 'string' ? b.datos.trim().slice(0, 1000) : null;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO business_claims (id, place_id, user_id, method, evidence) VALUES (?, ?, ?, ?, ?)`)
      .bind(id, params.id, u.id, b.metodo, datos ? JSON.stringify({ nota: datos }) : null),
    auditar(env.DB, { actor: u.id, origen: 'sistema', entidadTipo: 'place', entidadId: params.id!, accion: 'reclamar_local', valorNuevo: { solicitud: id, metodo: b.metodo } }),
  ]);
  return json({ ok: true, id, estado: 'pendiente' }, 201);
};
