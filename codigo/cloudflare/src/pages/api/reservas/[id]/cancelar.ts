// POST /api/reservas/:id/cancelar: el usuario cancela su reserva cuando quiera, pendiente o confirmada (§18 bis, 06-11-2026).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { auditar } from '../../../../lib/db';
import { transicionPermitida } from '../../../../lib/reservas';
import { usuarioDe } from '../../../../lib/sesion';

export const POST: APIRoute = async ({ request, params }) => {
  const usuario = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!usuario) return new Response(null, { status: 401 });
  const r = await env.DB.prepare('SELECT status FROM reservations WHERE id = ? AND user_id = ?')
    .bind(params.id, usuario.id).first<{ status: string }>();
  if (!r) return new Response(null, { status: 404 });
  if (!transicionPermitida(r.status, 'cancelada')) return new Response(null, { status: 409 });
  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'cancelada', cancelled_at = ?, updated_at = ? WHERE id = ?`)
      .bind(ahora, ahora, params.id),
    auditar(env.DB, { actor: usuario.id, origen: 'sistema', entidadTipo: 'reservation', entidadId: params.id!,
      accion: 'cancelar', campo: 'status', valorAnterior: r.status, valorNuevo: 'cancelada' }),
  ]);
  return new Response(null, { status: 204 });
};
