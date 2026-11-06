// POST /api/reservas: «Solicitar reserva» (maestro §18 bis). Requiere cuenta. Sin pago.
// En Automático se confirma sola si encaja; si no, queda pendiente para el propietario o un empleado.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { auditar, modoSeccion, nuevoId } from '../../../lib/db';
import { ahoraEnMarruecos, decidir, validarSolicitud, type AjustesReserva } from '../../../lib/reservas';
import { usuarioDe } from '../../../lib/sesion';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const POST: APIRoute = async ({ request }) => {
  const usuario = await usuarioDe(request, env.DB, env.SESSION_PEPPER);
  if (!usuario) return json({ error: 'Necesitas entrar en tu cuenta' }, 401);

  const b = (await request.json().catch(() => null)) as
    | { placeId?: string; fecha?: string; hora?: string; personas?: number; peticion?: string } | null;
  if (!b?.placeId) return json({ error: 'Falta el local' }, 400);

  const local = await env.DB.prepare(
    `SELECT p.accepts_reservations, s.slots, s.max_party, s.capacity_per_slot, s.closed_days
     FROM places p LEFT JOIN reservation_settings s ON s.place_id = p.id
     WHERE p.id = ? AND p.status = 'publicado' AND p.open_status = 'abierto'`,
  ).bind(b.placeId).first<{ accepts_reservations: number; slots: string | null; max_party: number | null; capacity_per_slot: number | null; closed_days: string | null }>();
  if (!local) return json({ error: 'Local no disponible' }, 404);

  const ajustes: AjustesReserva = {
    accepts: local.accepts_reservations === 1 && local.slots !== null,
    slots: JSON.parse(local.slots ?? '[]'),
    maxParty: local.max_party ?? 0,
    capacityPerSlot: local.capacity_per_slot,
    closedDays: JSON.parse(local.closed_days ?? '[]'),
  };
  const s = { fecha: String(b.fecha ?? ''), hora: String(b.hora ?? ''), personas: Number(b.personas) };
  const error = validarSolicitud(s, ajustes, ahoraEnMarruecos());
  if (error) return json({ error }, 400);

  const peticion = typeof b.peticion === 'string' ? b.peticion.trim().slice(0, 500) || null : null;
  const cuando = `${s.fecha}T${s.hora}`;
  const ocupadas = await env.DB.prepare(
    `SELECT coalesce(sum(party_size), 0) AS n FROM reservations WHERE place_id = ? AND requested_for = ? AND status = 'confirmada'`,
  ).bind(b.placeId, cuando).first<{ n: number }>();

  const d = decidir(s, ajustes, await modoSeccion(env.DB, 'reservas'), ocupadas?.n ?? 0);
  const id = nuevoId();
  const auto = d.estado === 'confirmada';
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO reservations (id, place_id, user_id, party_size, requested_for, special_request, status, decided_by, decided_at, decided_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, b.placeId, usuario.id, s.personas, cuando, peticion, d.estado,
      auto ? 'sistema' : null, auto ? new Date().toISOString() : null, auto ? 'automatico' : null),
    auditar(env.DB, { actor: auto ? 'sistema' : usuario.id, origen: 'sistema', entidadTipo: 'reservation', entidadId: id,
      accion: 'solicitar', valorNuevo: { estado: d.estado, motivo: d.motivo } }),
  ]);
  // Aviso por email al usuario y al local: pendiente del proveedor de email transaccional (§18 ter).
  return json({ id, estado: d.estado }, 201);
};
