// PWA de Cloudflare en Chromium real (IndexedDB y Service Worker reales). Maestro §12, §15; docs/10.
// Antes: node codigo/cloudflare/scripts/preparar-pwa.mjs. Uso: node codigo/testing/e2e/pwa-cloudflare.e2e.cjs
// Servidor de pruebas propio: sirve el sw.js generado y páginas de prueba (las plantillas reales llegan con el diseño).
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require('playwright');
const PUB = path.join(__dirname, '../../cloudflare/public');
let swVersion = null;   // null = la del archivo generado
let fallos = 0;
const ok = (desc, cond, info = '') => { console.log(`${cond ? '✔' : '✖'} ${desc}${info ? ' — ' + info : ''}`); if (!cond) fallos++; };

const pagina = (titulo) => `<!doctype html><meta charset=utf-8><title>${titulo}</title><h1 id=t>${titulo}</h1><script src="/registrar-sw.js"></script>`;
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const estatico = { '/sw.js': 'text/javascript', '/registrar-sw.js': 'text/javascript', '/sin-conexion': 'text/html; charset=utf-8',
    '/manifest.webmanifest': 'application/manifest+json', '/icons/icon-192.png': 'image/png', '/icons/icon-512.png': 'image/png' };
  if (estatico[u]) {
    let body = fs.readFileSync(path.join(PUB, u === '/sin-conexion' ? 'sin-conexion.html' : u));
    if (u === '/sw.js' && swVersion) body = body.toString().replace(/const VERSION = '[^']+'/, `const VERSION = '${swVersion}'`);
    res.writeHead(200, { 'content-type': estatico[u], 'cache-control': 'no-cache' }); return res.end(body);
  }
  if (u === '/_astro/a.css') { res.writeHead(200, { 'content-type': 'text/css' }); return res.end('body{}'); }
  // Como sale del Worker: con cookie siempre lleva «private, no-store» (src/lib/seguridad.ts).
  if (u === '/es/restaurantes/con-cookie/') { res.writeHead(200, { 'content-type': 'text/html', 'set-cookie': 'x=1', 'cache-control': 'private, no-store' }); return res.end(pagina(u)); }
  if (u.startsWith('/es/restaurantes/privada')) { res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'private' }); return res.end(pagina(u)); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0' }); res.end(pagina(u));
}).listen(0);

(async () => {
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Cada bloque usa un contexto de navegador NUEVO y limpio (Service Worker, cachés e IndexedDB propios):
  // mezclar en una misma pestaña páginas de error, borrados de IndexedDB y el modo sin conexión hace que Chromium se cierre.
  async function nuevo() {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const ir = async (ruta) => { try { const r = await page.goto(base + ruta); return { s: r.status(), t: await page.textContent('#t').catch(() => null), h1: await page.textContent('h1').catch(() => null) }; } catch { return { s: 'ERR' }; } };
    await ir('/es/');
    await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await sleep(300);
    return { ctx, page, ir, sinRed: (v) => ctx.setOffline(v) };
  }

  // 1. LRU de 20, página «Sin conexión» y estáticos
  let { ctx, page, ir, sinRed } = await nuevo();
  ok('el Service Worker controla la página', await page.evaluate(() => !!navigator.serviceWorker.controller));
  const rutas = Array.from({ length: 25 }, (_, i) => `/${['es', 'en', 'fr'][i % 3]}/${['restaurantes', 'restaurants', 'cafes-et-salons-de-the'][i % 3]}/r${i + 1}/`);
  for (const r of rutas) { await ir(r); await sleep(80); }
  await ir('/_astro/a.css'); await sleep(100);
  await sinRed(true);
  const res = []; for (const r of rutas) res.push(await ir(r));
  const disponibles = res.map((x, i) => (x.s === 200 && x.t === rutas[i] ? i + 1 : null)).filter(Boolean);
  ok('sin conexión: solo las 20 visitadas más recientemente (en es, en y fr)', JSON.stringify(disponibles) === JSON.stringify(Array.from({ length: 20 }, (_, i) => i + 6)), disponibles.join(','));
  ok('una página sin copia → página «Sin conexión» (503) en es/en/fr', res[0].s === 503 && res[0].h1 === 'Sin conexión');
  ok('CSS de Astro servido desde caché sin conexión', (await page.evaluate(async (b) => (await fetch(b + '/_astro/a.css')).status, base)) === 200);
  await ctx.close();

  // 2. Privacidad: zonas que nunca se guardan
  ({ ctx, page, ir, sinRed } = await nuevo());
  for (const r of ['/es/restaurantes/con-cookie/', '/es/restaurantes/privada/', '/es/mi-cuenta/favoritos/', '/es/acceso/']) { await ir(r); await sleep(100); }
  await sinRed(true);
  ok('respuestas con cookie (marcadas por el Worker) o «private» no se guardan', (await ir('/es/restaurantes/con-cookie/')).s === 503 && (await ir('/es/restaurantes/privada/')).s === 503);
  ok('«Mi cuenta» y «Acceso» nunca se guardan (sin conexión no se sirven)', (await ir('/es/mi-cuenta/favoritos/')).s === 'ERR' && (await ir('/es/acceso/')).s === 'ERR');
  await ctx.close();

  // 3. LRU: volver a leer una página la marca como reciente
  ({ ctx, page, ir, sinRed } = await nuevo());
  for (let i = 1; i <= 20; i++) { await ir(`/es/restaurantes/l${i}/`); await sleep(60); }
  await sinRed(true); await ir('/es/restaurantes/l1/'); await sinRed(false);   // leer l1 sin conexión la refresca
  await ir('/es/restaurantes/l21/'); await sleep(200);
  await sinRed(true);
  ok('LRU: leer una copia la marca como reciente (sale l2, no l1)', (await ir('/es/restaurantes/l1/')).s === 200 && (await ir('/es/restaurantes/l2/')).s === 503);
  await ctx.close();

  // 4. Favoritos sin conexión (§12): solo la ficha mínima, aparte del límite de 20 páginas
  ({ ctx, page, ir, sinRed } = await nuevo());
  for (let i = 1; i <= 22; i++) { await ir(`/es/restaurantes/f${i}/`); await sleep(60); }
  await ir('/es/');
  await page.evaluate(() => window.tablemarocPwa.guardarFavoritos([
    { place_id: 'p1', slug: 'cafe-azul', nombre: 'Café Azul', address: 'Plaza 1', indicaciones: 'Junto a la fuente', lat: 35.7, lng: -5.8, email: 'no@debe.guardarse' },
    { slug: 'sin-id' },
  ]));
  await sleep(300);
  const favs = await page.evaluate(() => window.tablemarocPwa.favoritosSinConexion());
  ok('favoritos guardados en el dispositivo para verlos sin conexión', favs.length === 1 && favs[0].nombre === 'Café Azul' && favs[0].indicaciones === 'Junto a la fuente');
  ok('no se guarda nada más que la ficha mínima (ni email)', !JSON.stringify(favs).includes('debe.guardarse'));
  ok('los favoritos no cuentan en el límite de 20 páginas', (await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('tablemaroc-offline'); r.onsuccess = () => { const g = r.result.transaction('pages').objectStore('pages').count(); g.onsuccess = () => { r.result.close(); res(g.result); }; };
  }))) === 20);

  // 5. Al salir o borrar la cuenta: se borra todo lo guardado en el dispositivo
  await page.evaluate(() => window.tablemarocPwa.borrarDatosLocales()); await sleep(600);
  ok('«borrar datos locales» vacía cachés, páginas y favoritos', (await page.evaluate(() => caches.keys())).length === 0
    && (await page.evaluate(() => window.tablemarocPwa.favoritosSinConexion())).length === 0);
  await ctx.close();

  // 6. Versionado: la versión nueva espera; al aplicarla se borran cachés y copias de la anterior
  ({ ctx, page, ir, sinRed } = await nuevo());
  await ir('/es/restaurantes/v1/'); await sleep(200); await ir('/es/');
  swVersion = 'version-nueva-de-prueba';
  const actualizacion = page.evaluate(() => new Promise((res) => window.addEventListener('tablemaroc:actualizacion', () => res(true), { once: true })));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  ok('versión nueva detectada y en espera (aviso para el usuario, sin recargar)', await Promise.race([actualizacion, sleep(5000).then(() => false)]));
  ok('mientras espera, sigue la versión anterior', await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting));
  await page.evaluate(() => window.tablemarocPwa.actualizar());
  await page.waitForEvent('load').catch(() => {}); await sleep(800);
  const cachesTras = await page.evaluate(() => caches.keys());
  ok('al aplicarla, solo queda la caché de la versión nueva', cachesTras.length === 1 && cachesTras[0].endsWith('version-nueva-de-prueba'), cachesTras.join(','));
  await sinRed(true);
  ok('y las páginas guardadas con la versión anterior ya no se sirven', (await ir('/es/restaurantes/v1/')).s === 503);
  await sinRed(false);

  // 7. Manifiesto instalable
  const m = await page.evaluate(async (b) => (await fetch(b + '/manifest.webmanifest')).json(), base);
  ok('manifiesto con start_url, display standalone e iconos 192/512 y maskable', m.start_url === '/' && m.display === 'standalone'
    && m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.purpose === 'maskable'));
  await ctx.close();

  await browser.close(); server.close();
  console.log(fallos ? `✖ ${fallos} comprobaciones fallidas` : '✔ Todas las comprobaciones de la PWA han pasado');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
