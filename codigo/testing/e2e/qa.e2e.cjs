// QA móvil (Fase 6) con datos de demostración: accesibilidad automática (axe), WebKit (motor de Safari, en simulación) y red lenta.
// WebKit en Playwright NO sustituye a un iPhone real.
const { spawn, execSync } = require('child_process');
const path = require('path');
const assert = require('assert');
const { chromium, webkit, devices } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const PORT = 3108;
const BASE = `http://localhost:${PORT}`;
const PAGES = ['/es', '/en/restaurants', '/es/restaurantes/demo-restaurante', '/fr/restaurants/demo-restaurante/menu', '/es/platos-tipicos/demo-plato', '/en/food-guides/demo-guia', '/fr/villes/demo-ciudad', '/auth/entrar?lang=es', '/privacidad?lang=fr'];

function startServer() {
  const c = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: path.join(__dirname, '../../frontend'), shell: true, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, TABLEMAROC_DEMO_DATA: '1' } });
  c.stderr.on('data', (d) => { if (!/DEP|Warning/.test(d)) process.stderr.write(d); });
  return c;
}
function stopServer(c) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: 'ignore' }); else process.kill(-c.pid); } catch { c.kill(); } }
async function waitFor(url, ms = 120_000) { for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 500))) { try { if ((await fetch(url, { redirect: 'manual' })).status < 500) return; } catch {} } throw new Error(`Sin respuesta: ${url}`); }

(async () => {
  const server = startServer();
  let cr, wk;
  try {
    await waitFor(`${BASE}/es`);
    for (const p of PAGES) await fetch(BASE + p); // Compila antes de medir.

    cr = await chromium.launch();
    const ctx = await cr.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    const found = [];
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: 'load' });
      const { violations } = await new AxeBuilder({ page }).exclude('nextjs-portal').analyze();
      for (const v of violations.filter((x) => ['serious', 'critical'].includes(x.impact))) found.push(`${p}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`);
    }
    assert.deepEqual(found, [], `Accesibilidad:\n${found.join('\n')}`);
    console.log(`accesibilidad (axe): ${PAGES.length} páginas sin problemas graves`);

    wk = await webkit.launch();
    const iphone = await (await wk.newContext({ ...devices['iPhone 14'] })).newPage();
    const errors = [];
    iphone.on('pageerror', (e) => errors.push(e.message));
    for (const p of PAGES) {
      await iphone.goto(BASE + p, { waitUntil: 'load' });
      const r = await iphone.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, h1: document.querySelector('h1')?.textContent }));
      assert.ok(r.h1, `${p}: sin título`);
      assert.ok(r.overflow <= 0, `${p}: scroll horizontal en WebKit (${r.overflow})`);
    }
    await iphone.goto(`${BASE}/es/restaurantes/demo-restaurante`, { waitUntil: 'load' });
    await iphone.click('[data-map-status] button');
    await iphone.waitForSelector('[data-map-status="fallback"]', { timeout: 30_000 });
    assert.ok(await iphone.getAttribute('a[href^="https://www.google.com/maps"]', 'href'), 'enlace https para iOS');
    assert.deepEqual(errors, [], `Errores en WebKit: ${errors.join(' | ')}`);
    console.log('WebKit (simulación de iPhone): sin scroll horizontal, sin errores de JavaScript y mapa con enlace https');

    // Red lenta: el contenido llega en el HTML, sin depender del JavaScript.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 800, downloadThroughput: 50_000, uploadThroughput: 20_000 });
    const t0 = Date.now();
    await page.goto(`${BASE}/es/restaurantes/demo-restaurante`, { waitUntil: 'commit' });
    await page.waitForSelector('h1', { timeout: 30_000 });
    const firstText = Date.now() - t0;
    assert.ok((await page.textContent('h1')).length > 0);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    console.log(`red lenta (800 ms, 400 kbit/s): el contenido aparece en ${firstText} ms, sin pantalla en blanco`);
    console.log('QA E2E OK');
  } finally {
    if (cr) await cr.close();
    if (wk) await wk.close();
    stopServer(server);
  }
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
