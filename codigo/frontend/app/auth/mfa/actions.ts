'use server';
import { redirect } from 'next/navigation';
import { safeNextPath } from '../../../../backend/auth/session.ts';
import { allow, LIMITS } from '../../../../backend/auth/rate-limit.ts';
import { currentUser, supabaseForRequest } from '../../../lib/supabase-server.ts';

export interface MfaState { error?: string }
export interface EnrollData { id: string; qr: string; secret: string }

/** Inicia el alta. Un alta a medias se descarta: el QR de una visita anterior deja de servir. */
export async function startEnroll(): Promise<EnrollData | null> {
  const user = await currentUser();
  if (!user?.isAdmin) return null;
  const supabase = await supabaseForRequest();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.some((f) => f.status === 'verified')) return null;
  for (const f of factors?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Tablemaroc' });
  if (error || !data) return null;
  const { totp } = data;
  return { id: data.id, qr: totp.qr_code, secret: totp.secret };
}

/** Comprueba el código de la app y sube la sesión a aal2. Sirve para el alta del factor y para cada entrada. */
export async function verifyMfa(_prev: MfaState, form: FormData): Promise<MfaState> {
  const user = await currentUser();
  if (!user?.isAdmin) redirect('/auth/entrar?next=/admin');
  if (!allow(`mfa:${user.id}`, LIMITS.authCode)) return { error: 'Demasiados intentos. Espera 15 minutos.' };
  const code = String(form.get('code') ?? '').replace(/\s+/g, '');
  const factorId = String(form.get('factor_id') ?? '');
  if (!/^\d{6}$/.test(code)) return { error: 'Escribe los 6 dígitos de la app.' };
  const supabase = await supabaseForRequest();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: 'Código incorrecto o caducado. Prueba con el siguiente.' };
  redirect(safeNextPath(form.get('next'), '/admin'));
}
