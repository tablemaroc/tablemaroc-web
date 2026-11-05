// Redirecciones 301 (maestro §2, §3.1): siempre 301, nunca se borran y sin cadenas.
import { auditar, nuevoId, type Origen } from './db.ts';

export type ResultadoRedireccion = { ok: true; id: string; actualizadas: number } | { ok: false; status: number; error: string };

/** Sentencias para crear desde → hacia (todas en el mismo batch que el cambio que la provoca).
 *  Las que apuntaban a `desde` pasan a apuntar a `hacia`; si `hacia` redirigía antes a `desde`, esa se reorienta también. */
export async function sentenciasRedireccion(
  db: D1Database, desde: string, hacia: string, actor: string, origen: Origen, motivo?: string,
): Promise<{ stmts: D1PreparedStatement[]; resultado: ResultadoRedireccion }> {
  if (desde === hacia) return { stmts: [], resultado: { ok: false, status: 400, error: 'El origen y el destino son iguales' } };
  if (await db.prepare('SELECT 1 FROM redirects WHERE from_path = ?').bind(desde).first()) {
    return { stmts: [], resultado: { ok: false, status: 409, error: 'Ya hay una redirección desde esa ruta' } };
  }
  const id = nuevoId();
  const stmts: D1PreparedStatement[] = [];
  // Si el nuevo destino era el origen de otra redirección (se vuelve a una URL antigua, p. ej. un slug recuperado),
  // esa redirección haría un bucle. No se borra: se retira cambiando su origen por un marcador histórico (auditado).
  const inversa = await db.prepare('SELECT id, to_path FROM redirects WHERE from_path = ?').bind(hacia).first<{ id: string; to_path: string }>();
  if (inversa) {
    stmts.push(
      db.prepare('UPDATE redirects SET from_path = ? WHERE id = ?').bind(`#retirada:${inversa.id}:${hacia}`, inversa.id),
      auditar(db, { actor, origen, entidadTipo: 'redirect', entidadId: inversa.id, accion: 'retirar_por_reutilizacion', campo: 'from_path',
        valorAnterior: hacia, valorNuevo: null, motivo: 'La ruta vuelve a estar en uso' }),
    );
  }
  stmts.push(
    db.prepare('INSERT INTO redirects (id, from_path, to_path, status_code, created_by) VALUES (?, ?, ?, 301, ?)').bind(id, desde, hacia, actor),
    auditar(db, { actor, origen, entidadTipo: 'redirect', entidadId: id, accion: 'crear', valorNuevo: { desde, hacia }, motivo }),
  );
  const encadenadas = await db.prepare('SELECT id FROM redirects WHERE to_path = ?').bind(desde).all<{ id: string }>();
  for (const e of encadenadas.results) {
    stmts.push(
      db.prepare('UPDATE redirects SET to_path = ? WHERE id = ?').bind(hacia, e.id),
      auditar(db, { actor, origen, entidadTipo: 'redirect', entidadId: e.id, accion: 'evitar_cadena', campo: 'to_path', valorAnterior: desde, valorNuevo: hacia }),
    );
  }
  return { stmts, resultado: { ok: true, id, actualizadas: encadenadas.results.length } };
}
