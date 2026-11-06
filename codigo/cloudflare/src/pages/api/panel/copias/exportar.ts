// GET /api/panel/copias/exportar   datos de la copia externa del PC («Crear copia», maestro §9 y §20). Solo una PERSONA de
// administración (no Claude Code): lleva datos personales. Devuelve la base de datos y la lista de fotos; el navegador
// descarga después cada foto, lo cifra todo en el PC y lo guarda en la carpeta elegida. Queda auditado.
import { env } from 'cloudflare:workers';
import { json } from '../../../../lib/acceso';
import { volcarBase } from '../../../../lib/copias';
import { auditar } from '../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../lib/panel';

export const GET = panel(SOLO_ADMIN, async (_ctx, c) => {
  if (c.origen === 'claude_code') return json({ error: 'La copia externa la crea una persona desde el panel' }, 403);
  const volcado = await volcarBase(env.DB);
  const fotos = (await env.DB.prepare('SELECT r2_key FROM photos ORDER BY created_at').all<{ r2_key: string }>()).results.map((f) => f.r2_key);
  await auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'config', entidadId: 'copia:pc', accion: 'crear_copia_pc',
    valorNuevo: { fotos: fotos.length } }).run();
  return json({ volcado, fotos });
});
