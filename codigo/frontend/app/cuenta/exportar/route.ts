import { NextResponse } from 'next/server';
import { exportUserData } from '../../../../backend/reviews/account.ts';
import { currentUser, supabaseForRequest } from '../../../lib/supabase-server.ts';

/** Descarga de los datos propios (maestro §10). Solo los del usuario de la sesión. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL('/auth/entrar?next=/cuenta', request.url));
  const data = await exportUserData(await supabaseForRequest(), user);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="mis-datos-tablemaroc.json"', 'Cache-Control': 'private, no-store' },
  });
}
