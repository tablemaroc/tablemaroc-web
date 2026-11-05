// PUT /api/panel/contenido/:tipo/:id/traducciones/:idioma  { title, description, content, seo_title, seo_description,
//      directions?, ramadan_notice?, estado: 'borrador' | 'revisada' | 'publicada' }   (pestañas ES, EN, FR; §3, §20)
// Solo es, en y fr. Revisar o publicar exige título y texto. Una traducción publicada se mejora, no vuelve a borrador.
// Solo administración (el propietario envía los textos de su local a administración por otra vía: pendiente de decidir).
import { env } from 'cloudflare:workers';
import { json, leerJson } from '../../../../../../../lib/acceso';
import { recalcular } from '../../../../../../../lib/calidad';
import { esTipo, TIPOS, traduccionLista, validarTraduccion } from '../../../../../../../lib/contenido';
import { auditar, nuevoId } from '../../../../../../../lib/db';
import { panel, SOLO_ADMIN } from '../../../../../../../lib/panel';

const ORDEN = { borrador: 0, revisada: 1, publicada: 2 } as const;

export const PUT = panel(SOLO_ADMIN, async ({ params, request }, c) => {
  if (!esTipo(params.tipo)) return json({ error: 'Tipo no válido' }, 404);
  const idioma = params.idioma;
  if (idioma !== 'es' && idioma !== 'en' && idioma !== 'fr') return json({ error: 'Idioma no válido: solo es, en o fr' }, 404);
  const { tabla, entidad } = TIPOS[params.tipo];
  if (!(await env.DB.prepare(`SELECT 1 FROM ${tabla} WHERE id = ?`).bind(params.id).first())) return json({ error: 'No existe' }, 404);

  const b = await leerJson<Record<string, unknown>>(request);
  const estado = String(b.estado ?? 'borrador') as keyof typeof ORDEN;
  if (!(estado in ORDEN)) return json({ error: 'Estado no válido' }, 400);
  const e: Record<string, string> = {};
  const t = validarTraduccion(params.tipo, b, e);
  if (Object.keys(e).length) return json({ error: 'Revisa los textos', campos: e }, 400);
  if (estado !== 'borrador' && !traduccionLista(t)) return json({ error: 'Para revisar o publicar hace falta título y texto' }, 400);

  const antes = await env.DB.prepare('SELECT * FROM translations WHERE entity_type = ? AND entity_id = ? AND locale = ?')
    .bind(entidad, params.id, idioma).first<Record<string, unknown>>();
  if (antes?.status === 'publicada' && estado !== 'publicada') return json({ error: 'Una traducción publicada se mejora, no vuelve atrás' }, 409);

  const ahora = new Date().toISOString();
  const campos = Object.keys(t) as (keyof typeof t)[];
  await env.DB.batch([
    antes
      ? env.DB.prepare(`UPDATE translations SET ${campos.map((k) => `${k} = ?`).join(', ')}, status = ?, updated_at = ? WHERE id = ?`)
          .bind(...campos.map((k) => t[k]), estado, ahora, antes.id)
      : env.DB.prepare(`INSERT INTO translations (id, entity_type, entity_id, locale, ${campos.join(', ')}, status) VALUES (?, ?, ?, ?, ${campos.map(() => '?').join(', ')}, ?)`)
          .bind(nuevoId(), entidad, params.id, idioma, ...campos.map((k) => t[k]), estado),
    auditar(env.DB, { actor: c.actor, origen: c.origen, entidadTipo: 'translation', entidadId: `${entidad}:${params.id}:${idioma}`,
      accion: antes ? 'editar' : 'crear', valorAnterior: antes ? { estado: antes.status, title: antes.title } : undefined, valorNuevo: { estado, title: t.title } }),
  ]);
  const informe = await recalcular(env.DB, entidad, params.id!);
  return json({ ok: true, estado, qualityGate: informe?.[idioma] });
});
