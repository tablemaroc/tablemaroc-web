// Verificación de «huella o cara» (passkeys) reutilizable: entrar y confirmar acciones delicadas (restaurar copias).
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from '@simplewebauthn/server';
import { consumirReto, deB64url } from './acceso.ts';

export type ResultadoHuella = { ok: true; userId: string; role: string; passkeyId: string } | { ok: false; status: number; error: string };

export async function verificarHuella(req: Request, db: D1Database, retoId: unknown, respuesta: AuthenticationResponseJSON | undefined): Promise<ResultadoHuella> {
  const reto = await consumirReto(db, retoId, 'passkey_acceso');
  if (!reto || !respuesta?.id) return { ok: false, status: 400, error: 'La confirmación ha caducado. Vuelve a intentarlo' };
  const pk = await db.prepare(
    `SELECT p.id, p.user_id, p.public_key, p.sign_count, p.transports, u.role FROM passkeys p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
  ).bind(respuesta.id).first<{ id: string; user_id: string; public_key: string; sign_count: number; transports: string | null; role: string }>();
  if (!pk) return { ok: false, status: 404, error: 'Esta huella o cara no está asociada a ninguna cuenta' };
  const url = new URL(req.url);
  try {
    const v = await verifyAuthenticationResponse({
      response: respuesta, expectedChallenge: reto.value, expectedOrigin: url.origin, expectedRPID: url.hostname,
      credential: { id: pk.id, publicKey: deB64url(pk.public_key), counter: pk.sign_count, transports: pk.transports ? JSON.parse(pk.transports) : undefined },
      requireUserVerification: true,
    });
    if (!v.verified) return { ok: false, status: 400, error: 'No se pudo verificar la huella o cara' };
    await db.prepare('UPDATE passkeys SET sign_count = ?, last_used_at = ? WHERE id = ?').bind(v.authenticationInfo.newCounter, new Date().toISOString(), pk.id).run();
    return { ok: true, userId: pk.user_id, role: pk.role, passkeyId: pk.id };
  } catch {
    return { ok: false, status: 400, error: 'No se pudo verificar la huella o cara' };
  }
}
