// Punto de entrada del Worker (maestro §18 ter): la web de Astro (fetch) y las tareas programadas (scheduled).
// Antes de Astro: redirecciones 301 desde D1 (§3.1) y defensa CSRF; después: cabeceras de seguridad.

import { handle } from '@astrojs/cloudflare/handler';
import { isSameOrigin, withSecurityHeaders } from './lib/seguridad';
import { ejecutarTarea } from './lib/tareas';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/') && !isSameOrigin(request, env.SITE_URL)) {
      return withSecurityHeaders(new Response('Origen no permitido', { status: 403 }));
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const r = await env.DB.prepare('SELECT to_path FROM redirects WHERE from_path = ?')
        .bind(url.pathname).first<{ to_path: string }>();
      if (r) return withSecurityHeaders(Response.redirect(new URL(r.to_path + url.search, url.origin).toString(), 301));
    }

    const res = await handle(request as never, env as never, ctx as never);
    return withSecurityHeaders(res as unknown as Response);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(ejecutarTarea(event.cron, env).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
