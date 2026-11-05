// Punto de entrada del Worker (maestro §18 ter): la web de Astro (fetch) y las tareas programadas (scheduled).
// Antes de Astro: redirecciones 301 desde D1 (§3.1) y defensa CSRF; después: cabeceras de seguridad.
// Fuera de producción (ENTORNO distinto de "produccion", p. ej. la versión de prueba en workers.dev) nada se indexa.

import { handle } from '@astrojs/cloudflare/handler';
import { isSameOrigin, withSecurityHeaders } from './lib/seguridad';
import { ejecutarTarea } from './lib/tareas';
import { servirFoto } from './lib/fotos';
import { servirSeo } from './lib/seo';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const produccion = env.ENTORNO === 'produccion';
    const fin = (res: Response) => {
      const r = withSecurityHeaders(res);
      if (!produccion) r.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return r;
    };

    if (url.pathname.startsWith('/api/') && !isSameOrigin(request, env.SITE_URL)) {
      return fin(new Response('Origen no permitido', { status: 403 }));
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const foto = await servirFoto(url, env.DB, env.FOTOS);
      if (foto) return fin(foto);
      const seo = await servirSeo(url, env.DB, env.SITE_URL, produccion);
      if (seo) return fin(seo);
      const r = await env.DB.prepare('SELECT to_path FROM redirects WHERE from_path = ?')
        .bind(url.pathname).first<{ to_path: string }>();
      if (r) return fin(Response.redirect(new URL(r.to_path + url.search, url.origin).toString(), 301));
    }

    const res = await handle(request as never, env as never, ctx as never);
    return fin(res as unknown as Response);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(ejecutarTarea(event.cron, env).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
