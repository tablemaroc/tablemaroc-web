// Astro con el adaptador de Cloudflare (maestro §18 ter) y arquitectura de islas con Preact.
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://tablemaroc.com',
  output: 'server',
  adapter: cloudflare({
    // Sin servicio de imágenes de pago: las fotos se procesan en el Worker (pendiente del titular, §18 ter).
    imageService: 'passthrough',
    prerenderEnvironment: 'node',
  }),
  // Sin sesiones de Astro (y sin KV): la sesión es nuestra, en D1, con cookie propia imprescindible.
  session: false,
  integrations: [preact()],
  i18n: {
    locales: ['es', 'en', 'fr'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  trailingSlash: 'always',
});
