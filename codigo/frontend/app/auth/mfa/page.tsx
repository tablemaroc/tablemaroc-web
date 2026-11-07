import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { safeNextPath } from '../../../../backend/auth/session.ts';
import { currentUser, supabaseForRequest } from '../../../lib/supabase-server.ts';
import { MfaEnroll } from './MfaEnroll.tsx';
import { MfaForm } from './MfaForm.tsx';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Verificación en dos pasos', robots: { index: false, follow: false } };

/** Segundo paso del panel: alta del factor la primera vez; después, solo el código. En español: lo usa el titular. */
export default async function Mfa({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNextPath((await searchParams).next, '/admin');
  const user = await currentUser();
  if (!user) redirect(`/auth/entrar?next=${encodeURIComponent(next)}`);
  if (!user.isAdmin) notFound();
  const supabase = await supabaseForRequest();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') redirect(next);
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp.find((f) => f.status === 'verified');
  if (verified) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>Verificación en dos pasos</h1>
        <p>Abre tu app de códigos y escribe el número de Tablemaroc.</p>
        <MfaForm factorId={verified.id} next={next} />
      </main>
    );
  }
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Activa la verificación en dos pasos</h1>
      <p>El panel la exige. Instala en tu móvil una app de códigos (Google Authenticator, Microsoft Authenticator…), pulsa Empezar, escanea el QR y escribe el código. Si pierdes el móvil, el factor se puede quitar desde el panel de Supabase.</p>
      <MfaEnroll next={next} />
    </main>
  );
}
