#!/usr/bin/env node
// Prepara la PWA antes de dev/build (maestro §15): genera public/ desde pwa/.
//   - sw.js con la VERSION del commit (cambia en cada despliegue) y las rutas traducidas de shared/routes.ts;
//   - registrar-sw.js, sin-conexion.html y manifest.webmanifest;
//   - iconos PROVISIONALES en gris (el logo antiguo se descartó, §19; los definitivos los da el diseño aprobado).
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU_SEGMENT, PLACE_SECTIONS, segmentsAlternation } from '../../shared/routes.ts';
import { SECURITY_HEADERS } from '../src/lib/seguridad.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const pwa = join(aqui, '../pwa');
const pub = join(aqui, '../public');
mkdirSync(join(pub, 'icons'), { recursive: true });

let rev;
try {
  rev = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch { rev = 'local'; }
const fuente = readFileSync(join(pwa, 'sw.js'), 'utf8');
const otros = ['registrar-sw.js', 'sin-conexion.html'].map((f) => readFileSync(join(pwa, f), 'utf8')).join('');
// La versión incluye un resumen del contenido: cambia aunque el commit sea el mismo si se edita algo.
const resumen = createHash('sha256').update(fuente + otros).digest('hex').slice(0, 8);

const inyectar = (src, nombre, valor) => {
  const re = new RegExp(`const ${nombre} = '[^']*';`);
  if (!re.test(src)) throw new Error(`No se encuentra "const ${nombre} = '...'" en pwa/sw.js`);
  return src.replace(re, `const ${nombre} = '${valor}';`);
};
const base = fuente.match(/const VERSION = '([^']+)';/)?.[1];
if (!base) throw new Error('No se encuentra VERSION en pwa/sw.js');
let sw = inyectar(fuente, 'VERSION', `${base}-${rev}-${resumen}`);
sw = inyectar(sw, 'PLACE_SEGMENTS', segmentsAlternation(PLACE_SECTIONS));
sw = inyectar(sw, 'GUIDES_SEGMENTS', segmentsAlternation(['guias-gastronomicas']));
sw = inyectar(sw, 'MENU_SEGMENT', MENU_SEGMENT);
writeFileSync(join(pub, 'sw.js'), sw);
writeFileSync(join(pub, 'registrar-sw.js'), readFileSync(join(pwa, 'registrar-sw.js')));
writeFileSync(join(pub, 'sin-conexion.html'), readFileSync(join(pwa, 'sin-conexion.html')));

writeFileSync(join(pub, 'manifest.webmanifest'), JSON.stringify({
  name: 'Tablemaroc', short_name: 'Tablemaroc',
  description: 'Guía gastronómica de Marruecos · Food guide to Morocco · Guide gastronomique du Maroc',
  lang: 'es', dir: 'ltr', start_url: '/', scope: '/', display: 'standalone',
  background_color: '#ffffff', theme_color: '#555555',               // provisional (gris): lo fija el diseño
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');

// Cabeceras de los estáticos (Cloudflare los sirve sin pasar por el Worker): las mismas de seguridad que el Worker.
const cab = Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`).join('\n');
writeFileSync(join(pub, '_headers'), ['# Generado por scripts/preparar-pwa.mjs desde src/lib/seguridad.ts', '/*', cab, '',
  '/sw.js', '  Cache-Control: no-cache', '  Service-Worker-Allowed: /', '', '/registrar-sw.js', '  Cache-Control: no-cache', '',
  '/manifest.webmanifest', '  Content-Type: application/manifest+json', ''].join('\n'));

// Iconos provisionales: cuadrado gris con «TM». Solo se generan si faltan (no cambian en cada build).
const iconos = [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]];
if (iconos.some(([f]) => !existsSync(join(pub, 'icons', f)))) {
  const { createRequire } = await import('node:module');
  const sharp = createRequire(join(aqui, '../../../package.json'))('sharp');
  for (const [f, t, maskable] of iconos) {
    const texto = Math.round(t * (maskable ? 0.28 : 0.36));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}"><rect width="100%" height="100%" fill="#555"/>`
      + `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${texto}" fill="#fff">TM</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(join(pub, 'icons', f));
  }
}
console.log(`PWA preparada (sw.js VERSION ${base}-${rev}-${resumen})`);
