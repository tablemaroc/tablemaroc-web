// Plantillas reales en Chromium (Fase 3): arranca `next dev` con datos de DEMOSTRACIÓN en el puerto 3100 y comprueba rutas,
// idioma, móvil (375 px, targets de 48 px, sin scroll horizontal), selector de idioma, mapa diferido, CLS y aviso offline.
// En modo desarrollo los tiempos no son los de producción: aquí se comprueba el comportamiento, no el rendimiento.
const { spawn, execSync } = require('child_process');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const FRONTEND = path.join(__dirname, '../../frontend');

function startServer() {
  const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: FRONTEND, shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, TABLEMAROC_DEMO_DATA: '1' },
  });
  child.stdout.on('data', () => {});
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
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`El servidor no responde en ${url}`);
}

const STATUS = {
  '/es': 200, '/en/restaurants': 200, '/fr/restaurants': 200, '/en/restaurantes': 404, '/es/lugares': 200,
  '/es/restaurantes/demo-restaurante': 200, '/es/restaurantes/demo-restaurante/menu': 200, '/es/cafes-y-teterias/demo-cafe/menu': 404,
  '/fr/cuisine-de-rue/demo-puesto': 404, '/es/platos-tipicos/demo-plato': 200, '/en/food-guides/demo-guia': 200,
  '/fr/villes/demo-ciudad': 200, '/es/ciudades/demo-ciudad/demo-barrio': 200, '/es/ciudades/demo-ciudad/no-existe': 404, '/ar': 404,
};

const PAGES = [
  ['/es', 'es'], ['/en/restaurants', 'en'], ['/es/restaurantes/demo-restaurante', 'es'], ['/fr/restaurants/demo-restaurante/menu', 'fr'],
  ['/es/platos-tipicos/demo-plato', 'es'], ['/en/food-guides/demo-guia', 'en'], ['/fr/villes/demo-ciudad', 'fr'], ['/es/ciudades/demo-ciudad/demo-barrio', 'es'],
];

(async () => {
  const server = startServer();
  let browser;
  try {
    await waitFor(`${BASE}/es`);

    for (const [p, code] of Object.entries(STATUS)) {
      const res = await fetch(BASE + p);
      assert.equal(res.status, code, `${p}: esperado ${code}, recibido ${res.status}`);
    }
    console.log(`rutas OK (${Object.keys(STATUS).length})`);

    // Interruptor de indexación apagado (lo normal fuera de producción).
    assert.match(await (await fetch(`${BASE}/robots.txt`)).text(), /Disallow: \/\n/);
    assert.ok(!(await (await fetch(`${BASE}/sitemap.xml`)).text()).includes('<url>'), 'sitemap vacío');
    assert.match(await (await fetch(`${BASE}/es`)).text(), /<meta name="robots" content="noindex/);
    console.log('interruptor apagado: robots bloquea, sitemap vacío y noindex');

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();

    for (const [p, lang] of PAGES) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      const r = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        scrollW: document.documentElement.scrollWidth,
        // Enlaces y botones visibles por debajo de 48x48 px (el "saltar al contenido" está fuera de pantalla hasta recibir el foco).
        small: [...document.querySelectorAll('a,button')].filter((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && b.left >= 0 && !e.closest('nextjs-portal') && (b.width < 48 || b.height < 48);
        }).map((e) => e.textContent.trim().slice(0, 40)),
        imgsWithoutAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
        demoBanner: !!document.querySelector('[role=note]'),
        mapsSdk: !!document.querySelector('script[src*="maps.googleapis"]'),
      }));
      assert.equal(r.lang, lang, `${p}: lang`);
      assert.ok(r.scrollW <= 375, `${p}: scroll horizontal (${r.scrollW} px)`);
      assert.deepEqual(r.small, [], `${p}: targets < 48 px: ${JSON.stringify(r.small)}`);
      assert.equal(r.imgsWithoutAlt, 0, `${p}: imágenes sin alt`);
      assert.ok(r.demoBanner, `${p}: falta el aviso de datos demo`);
      assert.ok(!r.mapsSdk, `${p}: el SDK del mapa no debe cargarse en el render inicial`);
    }
    console.log(`plantillas OK (${PAGES.length}): lang, sin scroll horizontal a 375 px, targets ≥ 48 px, alt, aviso demo, sin SDK inicial`);

    // Selector de idioma: el puesto demo solo está en es/en → el enlace FR lleva a la portada francesa, no a un 404.
    await page.goto(`${BASE}/es/comida-callejera/demo-puesto`);
    const langs = await page.$$eval('header nav[data-nav=idiomas] a', (as) => as.map((a) => a.getAttribute('href')));
    assert.deepEqual(langs, ['/en/street-food/demo-puesto', '/fr']);
    console.log('selector de idioma OK:', langs.join(' , '));

    // Mapa diferido + CLS en la ficha.
    await page.goto(`${BASE}/es/restaurantes/demo-restaurante`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    assert.equal(await page.getAttribute('[data-map-status]', 'data-map-status'), 'idle', 'el mapa empieza en idle');
    await page.locator('[data-map-status]').scrollIntoViewIfNeeded();
    assert.equal(await page.getAttribute('[data-map-status]', 'data-map-status'), 'idle', 'sin pulsar, el mapa no se carga');
    assert.equal(await page.locator('script[src*="maps.googleapis"]').count(), 0, 'sin pulsar, no se contacta con Google');
    await page.click('[data-map-status] button');
    // Sin clave de Google Maps el interactivo falla al instante → fallback (en dev, más el tiempo de compilar el trozo del mapa).
    await page.waitForSelector('[data-map-status="fallback"]', { timeout: 30_000 });
    const after = await page.evaluate(() => ({
      cls: window.__cls, mapsSdk: !!document.querySelector('script[src*="maps.googleapis"]'),
      text: document.querySelector('[data-map-status]').innerText,
    }));
    assert.ok(after.cls < 0.1, `CLS ${after.cls}`);
    assert.ok(!after.mapsSdk, 'sin clave no se descarga el SDK');
    assert.ok(after.text.includes('Dirección') && after.text.includes('Cómo llegar'), 'dirección e indicaciones visibles');
    console.log(`mapa OK: idle → fallback sin SDK; dirección e indicaciones visibles; CLS = ${after.cls.toFixed(3)}`);

    // Sin coordenadas: fallback directo con "Ubicación no disponible".
    await page.goto(`${BASE}/es/cafes-y-teterias/demo-cafe`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-map-status="fallback"]', { timeout: 30_000 });
    assert.ok((await page.innerText('[data-map-status]')).includes('Ubicación no disponible'));
    console.log('mapa sin coordenadas OK');

    // Buscador: desde la portada, sin acentos, con filtro por ciudad y nunca indexable.
    await page.goto(`${BASE}/es`, { waitUntil: 'networkidle' });
    await page.fill('form[role=search] input[name=q]', 'cafe');
    await page.click('form[role=search] button');
    await page.waitForURL(/\/es\/lugares\?q=cafe/);
    assert.ok((await page.innerText('main')).includes('Demo · Café'), 'encuentra el café sin acento');
    assert.equal(await page.getAttribute('meta[name=robots]', 'content').then((c) => /noindex/.test(c)), true, 'una búsqueda no se indexa');
    await page.goto(`${BASE}/es/lugares?q=zzzz`, { waitUntil: 'networkidle' });
    assert.ok((await page.innerText('[role=status]')).includes('No hay resultados'));
    await page.goto(`${BASE}/es/lugares?ciudad=demo-ciudad`, { waitUntil: 'networkidle' });
    assert.equal(await page.inputValue('select[name=ciudad]'), 'demo-ciudad');
    assert.ok((await page.locator('a[href*="demo-restaurante"]').count()) > 0, 'filtro por ciudad');
    await page.goto(`${BASE}/es/lugares?ciudad=no-existe`, { waitUntil: 'networkidle' });
    assert.equal(await page.inputValue('select[name=ciudad]'), '', 'una ciudad desconocida se ignora');
    // Búsqueda avanzada: los filtros se combinan, se conservan y nunca se indexan.
    await page.goto(`${BASE}/es/lugares?ciudad=demo-ciudad&precio=2&valoracion=4&orden=valoracion`, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('form[role=search] details[open]').count(), 'con filtros, la sección queda abierta');
    assert.equal(await page.inputValue('select[name=precio]'), '2');
    assert.equal(await page.locator('main a[href*="/demo-"]').count(), 1, 'solo el restaurante cumple precio y valoración');
    assert.match(await page.getAttribute('meta[name=robots]', 'content'), /noindex/);
    await page.goto(`${BASE}/es/lugares?tipo=cafes-y-teterias`, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('a[href*="demo-cafe"]').count(), 'filtro por tipo');
    assert.equal(await page.locator('a[href*="demo-restaurante"]').count(), 0);
    await page.goto(`${BASE}/es/lugares?ciudad=demo-ciudad&barrio=demo-barrio`, { waitUntil: 'networkidle' });
    assert.equal(await page.inputValue('select[name=barrio]'), 'demo-barrio');
    assert.equal(await page.locator('a[href*="demo-cafe"]').count(), 0, 'el café no está en ese barrio');
    await page.goto(`${BASE}/es/restaurantes`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('select[name=tipo]').count(), 0, 'dentro de un tipo no se elige tipo');
    console.log('búsqueda avanzada OK');

    await page.goto(`${BASE}/en/places`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('footer a[href^="/en/info/"]').count(), 7, 'las 7 páginas en el pie');
    for (const slug of ['sobre-nosotros', 'contacto', 'como-funcionan-las-resenas', 'privacidad', 'cookies', 'aviso-legal', 'condiciones']) {
      assert.equal((await page.goto(`${BASE}/fr/info/${slug}`)).status(), 200, slug);
      assert.ok((await page.textContent('h1')).length > 0);
      assert.match(await page.getAttribute('meta[name=robots]', 'content'), /noindex/);
    }
    assert.equal(await page.locator('main [role=note]').count(), 1, 'una página legal avisa de que es borrador');
    await page.goto(`${BASE}/es/info/contacto`);
    assert.equal(await page.locator('main [role=note]').count(), 0);
    assert.ok(await page.locator('main a[href^="mailto:"]').count());
    assert.equal((await page.goto(`${BASE}/es/info/no-existe`)).status(), 404);
    await page.goto(`${BASE}/privacidad?lang=fr`);
    assert.match(page.url(), /\/fr\/info\/privacidad$/, 'la dirección antigua lleva a la nueva');
    await page.goto(`${BASE}/en/places`, { waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('footer a[href^="/cuenta"]', 'href'), '/cuenta?lang=en');
    console.log('pie: privacidad y acceso en el idioma de la página');

    // Páginas de ciudad por tipo, con el segmento traducido.
    await page.goto(`${BASE}/es/ciudades/demo-ciudad`, { waitUntil: 'networkidle' });
    await page.click('main a[href="/es/ciudades/demo-ciudad/restaurantes"]');
    await page.waitForSelector('h1:has-text("Restaurantes en")');
    assert.equal(await page.locator('a[href*="demo-restaurante"]').count(), 1);
    assert.equal(await page.locator('a[href*="demo-cafe"]').count(), 0, 'solo ese tipo');
    assert.match(await page.getAttribute('meta[name=robots]', 'content'), /noindex/, 'sin fichas indexables no se indexa');
    assert.equal((await page.goto(`${BASE}/en/cities/demo-ciudad/restaurants`)).status(), 200);
    assert.equal((await page.goto(`${BASE}/es/ciudades/demo-ciudad/restaurants`)).status(), 404, 'el segmento de otro idioma no vale');
    assert.equal((await page.goto(`${BASE}/es/ciudades/no-existe/restaurantes`)).status(), 404);
    console.log('ciudad por tipo OK');

    // Plantillas: el restaurante da menú y datos antes que el texto; el resto usa la general.
    await page.goto(`${BASE}/es/restaurantes/demo-restaurante`, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('[data-template=restaurante] a:has-text("menú")').count(), 'restaurante: menú en el bloque destacado');
    await page.goto(`${BASE}/es/cafes-y-teterias/demo-cafe`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-template]').count(), 0, 'café: plantilla general');
    console.log('plantillas OK');

    // Escritorio: menú arriba y sin barra inferior; en móvil, al revés.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/es`, { waitUntil: 'networkidle' });
    assert.ok(await page.isVisible('header a[href="/es/lugares"]'), 'menú superior en escritorio');
    assert.equal(await page.isVisible('body > div nav[aria-label] ul li a[aria-current]'), false, 'sin barra inferior en escritorio');
    assert.ok(await page.locator('main ul a[href^="/es/ciudades/"]').count(), 'ciudades en la portada');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/es`, { waitUntil: 'networkidle' });
    assert.equal(await page.isVisible('header a[href="/es/lugares"]'), false, 'sin menú superior en móvil');
    assert.ok(await page.isVisible('nav a[aria-current=page]'), 'barra inferior en móvil');
    await page.goto(`${BASE}/es/restaurantes`, { waitUntil: 'networkidle' });
    console.log('navegación por tamaño OK');
    await page.goto(`${BASE}/es/restaurantes`, { waitUntil: 'networkidle' });

    // Aviso offline.
    await context.setOffline(true);
    await page.waitForSelector('[role=status]', { timeout: 10_000 });
    assert.ok((await page.innerText('[role=status]')).startsWith('Sin conexión'));
    await context.setOffline(false);
    console.log('aviso offline OK');

    console.log('PAGES E2E OK');
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
})().catch((e) => { console.error(e); process.exit(1); });
