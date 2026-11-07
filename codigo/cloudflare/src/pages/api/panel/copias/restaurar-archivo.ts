// POST /api/panel/copias/restaurar-archivo  { confirmacion: 'RESTAURAR', codigo? | reto + respuesta, volcado }   (§9, §20)
// «Restaurar desde archivo»: el navegador descifra en el PC la copia externa y envía aquí la base de datos (las fotos que
// falten se suben aparte con PUT /api/panel/copias/foto). Mismas confirmaciones que «Restaurar» y copia previa automática.
// No borra nada (ver restaurarBase).
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { confirmarRestauracion, type Confirmacion } from '../../../../lib/confirmar';
import { copiarBase, restaurarBase, validarVolcado } from '../../../../lib/copias';
import { auditar } from '../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../lib/panel';

const MAX_BYTES = 50 * 1024 * 1024;

export const POST = panel(SOLO_ADMIN, async ({ request }, c) => {
  const texto = await request.text();
  if (texto.length > MAX_BYTES) return json({ error: 'La copia es demasiado grande para restaurarla de una vez' }, 413);
  let b: Confirmacion & { volcado?: unknown };
  try { b = JSON.parse(texto); } catch { return json({ error: 'Datos no válidos' }, 400); }
  const no = await confirmarRestauracion(env, request, c, b, 'copia:pc');
  if (no) return no;
  if (!validarVolcado(b.volcado)) return json({ error: 'La copia no es válida' }, 422);

  const previa = await copiarBase(env.DB, env.COPIAS, 'previa_restauracion', c.actor);
  if (!previa.ok) return json({ error: 'No se pudo hacer la copia previa: no se restaura', detalle: previa.error }, 500);
  const resumen = await restaurarBase(env.DB, b.volcado);
  await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId: 'copia:pc', accion: 'restaurar_desde_archivo',
    valorNuevo: { copiaPrevia: previa.id, creada: b.volcado.creado, filas: resumen } }).run();
  return json({ ok: true, copiaPrevia: previa.id, filas: resumen });
});
