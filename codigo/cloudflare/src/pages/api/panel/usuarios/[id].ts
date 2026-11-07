// Sección Usuarios del panel (RGPD y Ley 09-08, §20). Solo administración. Todo auditado.
//   GET  /api/panel/usuarios/:id                     descarga de sus datos, para responder a una petición de acceso
//   POST /api/panel/usuarios/:id  { accion: 'cerrar_sesiones' }
//   POST /api/panel/usuarios/:id  { accion: 'borrar', confirmacion: 'BORRAR', motivo }   petición de borrado recibida por email
// Borrar no se puede deshacer: lo hace una persona (no Claude Code) y exige escribir BORRAR y el motivo.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../lib/acceso';
import { borrarCuenta, exportarDatos } from '../../../../lib/cuenta';
import { auditar } from '../../../../lib/db';
import { motivoValido, panel, SOLO_ADMIN } from '../../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async ({ params }, c) => {
  if (!(await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(params.id).first())) return json({ error: 'No existe' }, 404);
  await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'account', entidadId: params.id!, accion: 'exportar_datos' }).run();
  return json(await exportarDatos(env.DB, params.id!));
});

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  const b = await leerJson<{ accion: string; confirmacion: string; motivo: string }>(request);
  if (params.id === c.u.id) return json({ error: 'Tu propia cuenta no se gestiona desde aquí' }, 409);
  if (b.accion === 'cerrar_sesiones') {
    const r = await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(params.id).run();
    await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'account', entidadId: params.id!, accion: 'cerrar_sesiones', motivo: b.motivo }).run();
    return json({ ok: true, cerradas: r.meta.changes ?? 0 });
  }
  if (b.accion !== 'borrar') return json({ error: 'Acción no válida' }, 400);
  if (c.origen === 'claude_code') return json({ error: 'Borrar una cuenta lo hace una persona desde el panel' }, 403);
  if (b.confirmacion !== 'BORRAR') return json({ error: 'Escribe BORRAR para confirmar' }, 400);
  const motivo = motivoValido(b.motivo);
  if (!motivo) return json({ error: 'Indica el motivo (p. ej. «petición del usuario por email del 05-11-2026»)' }, 400);
  const r = await borrarCuenta(env.DB, env.FOTOS, params.id!, c.actor, c.origen, motivo);
  return r.ok ? json({ ok: true }) : json({ error: r.error }, r.status);
});
