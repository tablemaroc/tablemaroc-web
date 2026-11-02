import 'server-only';
import { headers } from 'next/headers';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Dirección a la que se vuelve tras identificarse. En local, la del propio servidor; fuera, SIEMPRE la URL configurada
 * (no la cabecera Host, que la puede falsear quien hace la petición). Supabase además solo acepta URLs de su lista.
 */
export async function authBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? '';
  if (LOCAL_HOSTS.has(host.replace(/:\d+$/, ''))) return `http://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tablemaroc.com').replace(/\/$/, '');
}
