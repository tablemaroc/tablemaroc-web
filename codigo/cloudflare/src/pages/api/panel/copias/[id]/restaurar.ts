// POST /api/panel/copias/:id/restaurar  { confirmacion: 'RESTAURAR', codigo?: '123456', reto?, respuesta? }  (§20)
// Pide escribir RESTAURAR y además el código de la app de autenticación o la huella o cara de la misma persona.
// Antes hace una copia automática del estado actual. No borra nada (ver restaurarBase).
// Con la sección «Copias» en Manual se puede restaurar igualmente: siempre lo hace una persona.
import { env } from 'cloudflare:workers';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { descifrar, json, leerJson, totpValido } from '../../../../../lib/acceso';
import { copiarBase, restaurarBase, validarVolcado } from '../../../../../lib/copias';
import { auditar } from '../../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../../lib/panel';
import { verificarHuella } from '../../../../../lib/passkeys';
import { permitir } from '../../../../../lib/sesion';

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  if (c.origen === 'claude_code') return json({ error: 'Restaurar lo hace una persona desde el panel' }, 403);
  if (!(await permitir(env.DB, `restaurar:${c.u.id}`, 5, 900))) return json({ error: 'Demasiados intentos. Espera 15 minutos' }, 429);
  const b = await leerJson<{ confirmacion: string; codigo: string; reto: string; respuesta: AuthenticationResponseJSON }>(request);
  if (b.confirmacion !== 'RESTAURAR') return json({ error: 'Escribe RESTAURAR para confirmar' }, 400);

  // Segundo paso: código de la app o huella o cara de esta misma cuenta.
  let confirmado = false;
  if (b.codigo) {
    const f = await env.DB.prepare('SELECT totp_secret_enc FROM users WHERE id = ?').bind(c.u.id).first<{ totp_secret_enc: string | null }>();
    confirmado = !!f?.totp_secret_enc && (await totpValido(await descifrar(env, f.totp_secret_enc), String(b.codigo)));
  } else if (b.reto) {
    const v = await verificarHuella(request, env.DB, b.reto, b.respuesta);
    confirmado = v.ok && v.userId === c.u.id;
  }
  if (!confirmado) {
    await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId: `copia:${params.id}`, accion: 'restaurar_rechazado' }).run();
    return json({ error: 'Hace falta el código de la app o tu huella o cara' }, 401);
  }

  const copia = await env.DB.prepare(`SELECT r2_key FROM backups WHERE id = ? AND status = 'ok' AND contents IN ('base_de_datos','completa')`)
    .bind(params.id).first<{ r2_key: string | null }>();
  if (!copia?.r2_key) return json({ error: 'No existe' }, 404);
  const obj = await env.COPIAS.get(copia.r2_key);
  const volcado = obj ? await obj.json().catch(() => null) : null;
  if (!validarVolcado(volcado)) return json({ error: 'La copia no es válida' }, 422);

  const previa = await copiarBase(env.DB, env.COPIAS, 'previa_restauracion', c.actor);
  if (!previa.ok) return json({ error: 'No se pudo hacer la copia previa: no se restaura', detalle: previa.error }, 500);
  const resumen = await restaurarBase(env.DB, volcado);
  await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId: `copia:${params.id}`, accion: 'restaurar',
    valorNuevo: { copiaPrevia: previa.id, filas: resumen } }).run();
  return json({ ok: true, copiaPrevia: previa.id, filas: resumen });
});
