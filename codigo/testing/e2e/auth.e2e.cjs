// Acceso y panel (Fase 4a) en Chromium, contra el Supabase configurado en .env.local, SIN iniciar sesión real:
// sin sesión no se entra en /admin, una cookie falsa no sirve, el callback no abre redirecciones a otros dominios,
// el formulario no revela qué emails existen y las zonas privadas no se indexan ni se guardan en caché.
// No envía ningún email: usa una dirección de un dominio reservado (.test) que no tiene cuenta.
const { spawn, execSync } = require('child_process');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;

function startServer() {
  const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: path.join(__dirname, '../../frontend'), shell: true, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', (d) => process.stderr.write(d));
  return child;
}
function stopServer(child) {
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    else process.kill(-child.pid);
  } catch { child.kill(); }
}
async function waitFor(url, ms = 90_000) {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 500))) {
    try { if ((await fetch(url, { redirect: 'manual' })).status < 500) return; } catch {}
  }
  throw new Error(`El servidor no responde en ${url}`);
}
const get = (p, init = {}) => fetch(BASE + p, { redirect: 'manual', ...init });

(async () => {
  const server = startServer();
  let browser;
  try {
    await waitFor(`${BASE}/auth/entrar`);

    let r = await get('/admin');
    assert.equal(r.status, 307);
    assert.equal(new URL(r.headers.get('location'), BASE).pathname + new URL(r.headers.get('location'), BASE).search, '/auth/entrar?next=%2Fadmin');
    console.log('sin sesión: /admin → /auth/entrar?next=/admin');

    r = await get('/admin', { headers: { cookie: 'sb-wcfltbfraxyvduulxjxg-auth-token=base64-eyJmYWxzbyI6dHJ1ZX0' } }); // scan-secrets-ignore: cookie inventada para la prueba (base64 de {"falso":true})
    assert.equal(r.status, 307, 'una cookie inventada no abre el panel');
    console.log('cookie falsa: rechazada');

    r = await get('/auth/entrar');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.match(r.headers.get('cache-control') ?? '', /no-store/);
    r = await get('/es');
    assert.ok(!r.headers.get('x-robots-tag'), 'las páginas públicas no llevan X-Robots-Tag de zona privada');
    assert.ok(!r.headers.get('set-cookie'), 'las páginas públicas no crean cookies de sesión');
    console.log('zonas privadas: noindex + no-store; páginas públicas sin cookies');

    for (const evil of ['//evil.com', 'https://evil.com', '/\\evil.com']) {
      r = await get(`/auth/callback?code=no-valido&next=${encodeURIComponent(evil)}`);
      const loc = new URL(r.headers.get('location'), BASE);
      assert.equal(loc.host, `localhost:${PORT}`, `redirección abierta con next=${evil}`);
      assert.equal(loc.pathname, '/auth/entrar');
      assert.equal(loc.searchParams.get('error'), '1');
    }
    console.log('callback: código inválido → error, y nunca redirige fuera del dominio');

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(`${BASE}/auth/entrar?lang=fr`);
    assert.equal(await page.textContent('h1'), 'Se connecter');
    assert.equal(await page.getAttribute('main a[href^="/auth/google"]', 'href'), '/auth/google?next=%2F');
    assert.equal(await page.locator('main a[href^="/auth/apple"]').count(), 0, 'Apple oculto hasta activarlo');
    const google = await get('/auth/google?next=/admin');
    assert.equal(google.status, 307);
    assert.match(google.headers.get('location'), /\/auth\/v1\/authorize\?provider=google/);
    const apple = await get('/auth/apple?next=/admin');
    assert.match(apple.headers.get('location'), /\/auth\/v1\/authorize\?provider=apple/);
    console.log('entrar: Google visible, Apple oculto hasta activarlo');

    await page.fill('#email', 'no-es-un-email');
    await page.evaluate(() => document.querySelector('#email').setAttribute('type', 'text')); // saltar la validación del navegador
    await page.click('button[type=submit]');
    await page.waitForSelector('form p[role=alert]');
    assert.match(await page.textContent('form p[role=alert]'), /e-mail valide/);
    await page.fill('#email', 'nadie@tablemaroc-e2e.test');
    await page.click('button[type=submit]');
    await page.waitForSelector('form p[role=status]', { timeout: 20_000 });
    assert.match(await page.textContent('form p[role=status]'), /Si cet e-mail a un compte/);
    assert.ok(await page.isVisible('#token'), 'aparece el campo del código');
    console.log('formulario: valida el email y da el mismo mensaje exista o no la cuenta');

    const small = await page.evaluate(() => [...document.querySelectorAll('main a, input:not([type=hidden]), button')]
      .filter((e) => e.getBoundingClientRect().height < 48).length);
    assert.equal(small, 0, 'campos y botones ≥ 48 px');
    console.log('AUTH E2E OK');
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
})().catch((e) => { console.error(e); process.exit(1); });
