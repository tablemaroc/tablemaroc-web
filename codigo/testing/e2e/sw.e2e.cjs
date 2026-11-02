// E2E del Service Worker en Chromium real (IndexedDB real): límite 20 + LRU, offline y versionado.
// Requiere playwright. Uso: node codigo/testing/e2e/sw.e2e.cjs
const http = require('http'), fs = require('fs'), assert = require('assert');
const { chromium } = require('playwright');
const SW = require('path').join(__dirname, '../../../public/sw.js');
let swVersion = null; // null = tal cual está en el repo
const html = (slug) => `<!doctype html><meta charset=utf-8><h1 id=t>${slug}</h1><script>navigator.serviceWorker.register('/sw.js',{scope:'/'})</script>`;
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/sw.js') {
    let js = fs.readFileSync(SW, 'utf8'); if (swVersion) js = js.replace(/const VERSION = '[^']+'/, `const VERSION = '${swVersion}'`);
    res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-cache' }); return res.end(js);
  }
  if (u === '/_next/static/a.css') { res.writeHead(200, { 'content-type': 'text/css' }); return res.end('body{}'); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0' }); res.end(html(u));
}).listen(0);
(async () => {
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch(); const ctx = await browser.newContext(); const page = await ctx.newPage();
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  await page.goto(base + '/es/restaurantes/r1');
  await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await sleep(300);
  assert(await page.evaluate(() => !!navigator.serviceWorker.controller), 'SW controla la página');
  const visit = async (slug) => { await page.goto(`${base}/es/restaurantes/${slug}`); await sleep(120); };
  for (let i = 1; i <= 25; i++) await visit('r' + i);
  await ctx.setOffline(true);
  const offline = async (slug) => { try { const r = await page.goto(`${base}/es/restaurantes/${slug}`); return r.status() === 200 ? (await page.textContent('#t')) : r.status(); } catch (e) { return 'ERR'; } };
  const got = []; for (let i = 1; i <= 25; i++) got.push(await offline('r' + i));
  const available = got.map((v, i) => typeof v === 'string' && v.endsWith('/r' + (i + 1)) ? i + 1 : null).filter(Boolean);
  console.log('offline disponibles tras 25 visitas:', available.join(','));
  assert.deepStrictEqual(available, Array.from({ length: 20 }, (_, i) => i + 6), 'solo las 20 más recientes');
  console.log('sin copia -> estado:', got[0]);
  assert.strictEqual(got[0], 503);
  // LRU: reiniciar, visitar r1..r20, releer r1 (la marca como reciente), visitar r21 => sale r2, no r1
  await ctx.setOffline(false);
  await page.evaluate(() => new Promise((res) => { const r = indexedDB.deleteDatabase('tablemaroc-offline'); r.onsuccess = r.onerror = r.onblocked = () => res(); }));
  await sleep(200);
  for (let i = 1; i <= 20; i++) await visit('r' + i);
  await visit('r1'); await visit('r21');
  await ctx.setOffline(true);
  assert.strictEqual(await offline('r1'), '/es/restaurantes/r1', 'r1 se conserva (LRU)');
  assert.strictEqual(await offline('r21'), '/es/restaurantes/r21');
  assert.strictEqual(await offline('r2'), 503, 'r2 era la menos reciente y se descartó');
  console.log('LRU OK');
  // Versionado: v3 sustituye a v2; se limpian cachés y copias antiguas
  await ctx.setOffline(false);
  await page.goto(base + '/_next/static/a.css'); // crea la caché estática v actual
  await page.goto(base + '/es/restaurantes/r1'); await sleep(200);
  const before = await page.evaluate(async () => (await caches.keys()));
  console.log('cachés antes:', before.join(','));
  swVersion = 'v3';
  const state = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration(); await reg.update();
    await new Promise(r => setTimeout(r, 800));
    const waiting = !!reg.waiting; return waiting;
  });
  assert(state, 'la versión nueva queda en espera (no hay skipWaiting automático)');
  await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 250)); if ((await caches.keys()).every(k => k.endsWith('-v3')) && (await caches.keys()).length) break; } });
  console.log('estado SW:', await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return JSON.stringify({ active: r.active && r.active.state, waiting: r.waiting && r.waiting.state, installing: r.installing && r.installing.state }); }));
  const after = await page.evaluate(async () => ({ keys: await caches.keys(),
    n: await new Promise((res) => { const q = indexedDB.open('tablemaroc-offline', 1); q.onsuccess = () => { const g = q.result.transaction('pages').objectStore('pages').getAll(); g.onsuccess = () => res(g.result.map(r => r.version)); }; }) }));
  console.log('tras activar v3: cachés =', after.keys.join(','), '| versiones en IndexedDB =', JSON.stringify(after.n));
  assert(after.keys.every(k => !k.endsWith('-v2')), 'cachés v2 borradas');
  assert.strictEqual(after.n.filter(v => v !== 'v3').length, 0, 'copias antiguas purgadas');
  console.log('SW E2E OK'); await browser.close(); server.close();
})().catch(async (e) => { console.error('FALLO', e); process.exit(1); });
