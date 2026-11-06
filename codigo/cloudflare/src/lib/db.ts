// Utilidades de D1: IDs, fecha y auditoría (maestro §7). Toda acción relevante deja rastro y puede revertirse.

export const nuevoId = () => crypto.randomUUID();
export const ahoraIso = () => new Date().toISOString();

export type Origen = 'panel' | 'claude_code' | 'sistema';
export type EntidadAuditable =
  | 'place' | 'dish' | 'guide' | 'city' | 'translation' | 'review' | 'photo'
  | 'menu' | 'redirect' | 'account' | 'config' | 'reservation';

export type Auditoria = {
  actor: string;
  origen: Origen;
  entidadTipo: EntidadAuditable;
  entidadId: string;
  accion: string;
  campo?: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  motivo?: string;
};

/** Sentencia de auditoría para incluirla en el mismo `db.batch()` que el cambio (todo o nada). */
export function auditar(db: D1Database, a: Auditoria): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO audit_log (id, actor, origen, entidad_tipo, entidad_id, accion, campo, valor_anterior, valor_nuevo, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      nuevoId(), a.actor, a.origen, a.entidadTipo, a.entidadId, a.accion, a.campo ?? null,
      a.valorAnterior === undefined ? null : JSON.stringify(a.valorAnterior),
      a.valorNuevo === undefined ? null : JSON.stringify(a.valorNuevo),
      a.motivo ?? null,
    );
}

/** Modo del interruptor «Automático / Manual» de una sección del panel (§20). */
export async function modoSeccion(db: D1Database, seccion: string): Promise<'automatico' | 'manual'> {
  const r = await db.prepare('SELECT mode FROM panel_modes WHERE section = ?').bind(seccion).first<{ mode: string }>();
  return r?.mode === 'manual' ? 'manual' : 'automatico';
}
