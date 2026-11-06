// Tareas programadas con Cron Triggers (maestro §6). Cada ejecución queda en job_runs (pestaña «Automático» del panel, §20).
// Moderación: el Cron prepara la cola y la deja registrada; la decisión de aprobar o rechazar la toma Claude Code
// mediante la API autenticada del panel (§2), en su tarea programada de 3 veces al día. Con la sección en «Manual», no se hace nada.

import { ahoraIso, modoSeccion, nuevoId } from './db';
import { clavesCaducadas, copiarBase } from './copias';

export type Job = 'moderacion' | 'copia_diaria' | 'copia_semanal' | 'revision_mensual';

export const CRON_A_TAREA: Record<string, Job> = {
  '0 7,13,19 * * *': 'moderacion',
  '30 2 * * *': 'copia_diaria',
  '0 3 * * 1': 'copia_semanal',
  '0 4 1 * *': 'revision_mensual',
};

type EnvTareas = { DB: D1Database; COPIAS: R2Bucket; FOTOS: R2Bucket };

async function registrar(db: D1Database, job: Job, cron: string, fn: () => Promise<{ status: 'ok' | 'omitida' | 'error'; summary: string }>) {
  const id = nuevoId();
  await db.prepare(`INSERT INTO job_runs (id, job, cron, started_at, status) VALUES (?, ?, ?, ?, 'en_curso')`)
    .bind(id, job, cron, ahoraIso()).run();
  let r: { status: 'ok' | 'omitida' | 'error'; summary: string };
  try { r = await fn(); } catch (e) { r = { status: 'error', summary: String(e).slice(0, 500) }; }
  await db.prepare(`UPDATE job_runs SET finished_at = ?, status = ?, summary = ? WHERE id = ?`)
    .bind(ahoraIso(), r.status, r.summary, id).run();
  return r;
}

export async function ejecutarTarea(cron: string, env: EnvTareas) {
  const job = CRON_A_TAREA[cron];
  if (!job) return { status: 'error' as const, summary: `Cron desconocido: ${cron}` };
  const db = env.DB;

  switch (job) {
    case 'moderacion':
      return registrar(db, job, cron, async () => {
        if ((await modoSeccion(db, 'escritorio')) === 'manual') return { status: 'omitida', summary: 'Escritorio en modo Manual' };
        const r = await db.prepare(
          `SELECT (SELECT count(*) FROM reviews WHERE status = 'pendiente') AS resenas,
                  (SELECT count(*) FROM photos WHERE status = 'pendiente') AS fotos`,
        ).first<{ resenas: number; fotos: number }>();
        return { status: 'ok', summary: `Cola de moderación: ${r?.resenas ?? 0} reseñas y ${r?.fotos ?? 0} fotos pendientes` };
      });

    case 'copia_diaria':
      return registrar(db, job, cron, async () => {
        if ((await modoSeccion(db, 'copias')) === 'manual') return { status: 'omitida', summary: 'Copias en modo Manual' };
        const c = await copiarBase(db, env.COPIAS, 'automatica_diaria', 'sistema');
        if (!c.ok) return { status: 'error', summary: `Fallo de copia: ${c.error}` };   // aviso en el escritorio (§20)
        const lista = await env.COPIAS.list({ prefix: 'base-de-datos/' });
        const caducadas = clavesCaducadas(lista.objects.map((o) => ({ key: o.key, uploaded: o.uploaded })));
        if (caducadas.length) await env.COPIAS.delete(caducadas);
        return { status: 'ok', summary: `Copia ${c.key}; ${caducadas.length} copias antiguas retiradas (retención 7)` };
      });

    case 'copia_semanal':
      return registrar(db, job, cron, async () => {
        if ((await modoSeccion(db, 'copias')) === 'manual') return { status: 'omitida', summary: 'Copias en modo Manual' };
        // Inventario de fotos (las fotos ya viven en R2; la copia externa fuera de Cloudflare está pendiente del titular).
        let n = 0; let cursor: string | undefined;
        const claves: string[] = [];
        do {
          const l = await env.FOTOS.list({ cursor });
          for (const o of l.objects) { claves.push(o.key); n++; }
          cursor = l.truncated ? l.cursor : undefined;
        } while (cursor);
        const id = nuevoId();
        const key = `semanal/${ahoraIso().slice(0, 10)}/inventario-fotos.json`;
        const cuerpo = JSON.stringify({ creado: ahoraIso(), fotos: claves });
        await env.COPIAS.put(key, cuerpo);
        await db.prepare(`INSERT INTO backups (id, kind, contents, r2_key, size_bytes, status, created_by)
                          VALUES (?, 'automatica_semanal', 'fotos_y_configuracion', ?, ?, 'ok', 'sistema')`)
          .bind(id, key, cuerpo.length).run();
        return { status: 'ok', summary: `Inventario semanal de ${n} fotos` };
      });

    case 'revision_mensual':
      return registrar(db, job, cron, async () => {
        const r = await db.prepare(
          `SELECT (SELECT count(*) FROM places WHERE status = 'publicado' AND verified_at < date('now','-12 months')) AS verificaciones_antiguas,
                  (SELECT count(*) FROM translations WHERE status = 'publicada' AND is_indexable = 0) AS no_indexables,
                  (SELECT count(*) FROM backups WHERE status = 'error' AND created_at > date('now','-1 month')) AS copias_fallidas`,
        ).first<Record<string, number>>();
        return { status: 'ok', summary: `Revisión mensual: ${JSON.stringify(r)}` };
      });
  }
}
