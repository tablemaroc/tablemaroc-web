// POST /api/panel/copias/:id/restaurar  { confirmacion: 'RESTAURAR', codigo?: '123456', reto?, respuesta? }  (§20)
// Pide escribir RESTAURAR y además el código de la app de autenticación o la huella o cara de la misma persona.
// Antes hace una copia automática del estado actual. No borra nada (ver restaurarBase).
// Con la sección «Copias» en Manual se puede restaurar igualmente: siempre lo hace una persona.
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../lib/acceso';
import { confirmarRestauracion, type Confirmacion } from '../../../../../lib/confirmar';
import { copiarBase, restaurarBase, validarVolcado } from '../../../../../lib/copias';
import { auditar } from '../../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../../lib/panel';

export const POST = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  const b = await leerJson<Confirmacion>(request);
  const no = await confirmarRestauracion(env, request, c, b, `copia:${params.id}`);
  if (no) return no;

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
