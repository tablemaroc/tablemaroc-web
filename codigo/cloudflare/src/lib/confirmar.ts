// Confirmación de acciones delicadas del panel (restaurar copias, §20): escribir RESTAURAR y además el código de la app
// de autenticación o la huella o cara de la MISMA persona. Solo personas (nunca Claude Code). Con límite de intentos.

import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { descifrar, json, totpValido } from './acceso.ts';
import { auditar } from './db.ts';
import type { Contexto } from './panel.ts';
import { verificarHuella } from './passkeys.ts';
import { permitir } from './sesion.ts';

export type Confirmacion = { confirmacion?: string; codigo?: string; reto?: string; respuesta?: AuthenticationResponseJSON };

/** Devuelve una respuesta de error si no se confirma, o null si todo está bien. */
export async function confirmarRestauracion(env: Env, request: Request, c: Contexto, b: Confirmacion, entidadId: string): Promise<Response | null> {
  if (c.origen === 'claude_code') return json({ error: 'Restaurar lo hace una persona desde el panel' }, 403);
  if (!(await permitir(env.DB, `restaurar:${c.u.id}`, 5, 900))) return json({ error: 'Demasiados intentos. Espera 15 minutos' }, 429);
  if (b.confirmacion !== 'RESTAURAR') return json({ error: 'Escribe RESTAURAR para confirmar' }, 400);
  let confirmado = false;
  if (b.codigo) {
    const f = await env.DB.prepare('SELECT totp_secret_enc FROM users WHERE id = ?').bind(c.u.id).first<{ totp_secret_enc: string | null }>();
    confirmado = !!f?.totp_secret_enc && (await totpValido(await descifrar(env, f.totp_secret_enc), String(b.codigo)));
  } else if (b.reto) {
    const v = await verificarHuella(request, env.DB, b.reto, b.respuesta);
    confirmado = v.ok && v.userId === c.u.id;
  }
  if (!confirmado) {
    await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId, accion: 'restaurar_rechazado' }).run();
    return json({ error: 'Hace falta el código de la app o tu huella o cara' }, 401);
  }
  return null;
}
