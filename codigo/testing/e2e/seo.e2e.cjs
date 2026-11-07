// SEO (Fase 5) contra el proyecto Supabase de PRUEBAS, con el interruptor de indexación ENCENDIDO. Nunca contra el real (se detiene).
// Comprueba el HTML tal como lo recibe un buscador, sin ejecutar JavaScript.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const { resetFactors, passMfa, syncClock } = require('./mfa-helper.cjs');

const FRONTEND = path.join(__dirname, '../../frontend');
const PORT = 3105;
const BASE = `http://localhost:${PORT}`;
const ADMIN = 'e2e-admin@tablemaroc-e2e.test';

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
}
const env = readEnv(path.join(FRONTEND, '.env.test.local'));
const real = readEnv(path.join(FRONTEND, '.env.local'));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.error('Falta codigo/frontend/.env.test.local. No se ejecuta nada.'); process.exit(2); }
if (URL_ === real.NEXT_PUBLIC_SUPABASE_URL) { console.error('BLOQUEADO: apunta al proyecto REAL. No se ejecuta nada.'); process.exit(2); }

const api = async (p, init = {}) => { const r = await fetch(URL_ + p, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } }); const b = await r.text(); if (!r.ok) throw new Error(`${p}: ${r.status} ${b.slice(0, 200)}`); return b ? JSON.parse(b) : null; };
const insert = (t, row) => api(`/rest/v1/${t}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) }).then((x) => x[0]);
const words = (n) => Array.from({ length: n }, () => Math.random().toString(36).slice(2, 9)).join(' ');
const html = (u) => fetch(`${BASE}${u}`).then((r) => r.text());
const meta = (h, name) => (h.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) ?? [])[1];
const canonical = (h) => (h.match(/<link rel="canonical" href="([^"]*)"/) ?? [])[1];
const hreflang = (h) => [...h.matchAll(/<link rel="alternate" hrefLang="([^"]*)" href="([^"]*)"/g)].map((m) => [m[1], m[2]]).sort();
const jsonLd = (h) => [...h.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

function startServer() {
  const e = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '', SITE_INDEXING_ENABLED: '1' };
  const c = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: FRONTEND, shell: true, stdio: ['ignore', 'ignore', 'pipe'], env: e });
  c.stderr.on('data', (d) => process.stderr.write(d));
  return c;
}
function stopServer(c) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: 'ignore' }); else process.kill(-c.pid); } catch { c.kill(); } }
async function waitFor(url, ms = 120_000) { for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 500))) { try { if ((await fetch(url, { redirect: 'manual' })).status < 500) return; } catch {} } throw new Error(`Sin respuesta: ${url}`); }

(async () => {
  const stamp = Date.now().toString(36);
  const { users } = await api('/auth/v1/admin/users?per_page=200');
  if (!users.some((u) => u.email === ADMIN)) await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: ADMIN, email_confirm: true, app_metadata: { role: 'admin' } }) });
  await resetFactors(api, ADMIN);
  await syncClock(URL_);
  const [region] = await api('/rest/v1/regions?select=id&limit=1');
  const [type] = await api('/rest/v1/place_types?select=id&slug=eq.restaurantes');
  const city = await insert('cities', { region_id: region.id, slug: `e2e-s-${stamp}`, status: 'publicado' });
  const dish = await insert('dishes', { slug: `e2e-sd-${stamp}`, status: 'publicado' });
  const addPlace = async (slug, extra = {}) => insert('places', { slug, city_id: city.id, place_type_id: type.id, status: 'publicado', lat: 35.78, lng: -5.81, address: 'Calle 1', phone: '+212 539 000 000',
    opening_hours: { mon: '9:00–13:00, 16:00–20:00' }, verification_status: 'verificado', verified_at: new Date().toISOString(), verification_source: 'e2e', ...extra });
  const tr = (p, locale, description) => insert('translations', { entity_type: 'place', entity_id: p.id, locale, title: `E2E ${p.slug} ${locale}`, description, status: 'publicada' });
  const addPhoto = async (p) => {
    const ph = await insert('photos', { place_id: p.id, storage_path: `admin/e2e/${p.slug}.webp`, source: 'e2e', author: 'e2e', license: 'e2e', status: 'aprobada' });
    for (const locale of ['es', 'en']) await insert('photo_translations', { photo_id: ph.id, locale, alt: 'alt' });
  };
  const link = (p) => insert('place_dishes', { place_id: p.id, dish_id: dish.id });

  const ok = await addPlace(`e2e-ok-${stamp}`);
  await tr(ok, 'es', words(70)); await tr(ok, 'en', words(70)); await addPhoto(ok); await link(ok);
  await insert('reviews', { user_id: users.find((u) => u.email === ADMIN).id, place_id: ok.id, rating: 4, status: 'aprobada', comment: 'Bien' });
  const noPhoto = await addPlace(`e2e-nofoto-${stamp}`);
  await tr(noPhoto, 'es', words(70)); await link(noPhoto);
  const same = words(70);
  const dupA = await addPlace(`e2e-dupa-${stamp}`); const dupB = await addPlace(`e2e-dupb-${stamp}`);
  for (const p of [dupA, dupB]) { await tr(p, 'es', same); await addPhoto(p); await link(p); }
  const old = await addPlace(`e2e-viejo-${stamp}`, { verified_at: new Date(Date.now() - 400 * 86_400_000).toISOString() });
  await tr(old, 'es', words(70)); await addPhoto(old); await link(old);

  const server = startServer();
  let browser;
  try {
    await waitFor(`${BASE}/es`);
    browser = await chromium.launch();
    const l = await api('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email: ADMIN }) });
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${BASE}/auth/callback?token_hash=${l.hashed_token ?? l.properties.hashed_token}&type=magiclink&next=/admin/indexacion`);
    await passMfa(page);
    await page.waitForSelector('h1:has-text("Indexación")');
    assert.ok(await page.isVisible('text=Interruptor ENCENDIDO'));
    await page.click('button:has-text("Recalcular ahora")');
    await page.waitForSelector('[role=status]:has-text("textos evaluados")', { timeout: 60_000 });

    const flags = async (p) => (await api(`/rest/v1/translations?entity_id=eq.${p.id}&select=locale,is_indexable`)).reduce((o, t) => ({ ...o, [t.locale]: t.is_indexable }), {});
    assert.deepEqual(await flags(ok), { es: true, en: true }, 'ficha completa: indexable');
    assert.deepEqual(await flags(noPhoto), { es: false }, 'sin foto: no indexable');
    assert.deepEqual(await flags(dupA), { es: false }, 'texto duplicado: no indexable');
    assert.deepEqual(await flags(dupB), { es: false }, 'texto duplicado: no indexable');
    assert.deepEqual(await flags(old), { es: false }, 'verificación de hace más de 365 días: no indexable');
    console.log('is_indexable: APTO solo la ficha completa; fallan sin foto, duplicado y verificación caducada');

    const es = await html(`/es/restaurantes/${ok.slug}`);
    assert.match(meta(es, 'robots') ?? '', /^index/);
    assert.equal(canonical(es), `https://tablemaroc.com/es/restaurantes/${ok.slug}`);
    const expected = [['en', `https://tablemaroc.com/en/restaurants/${ok.slug}`], ['es', `https://tablemaroc.com/es/restaurantes/${ok.slug}`]];
    assert.deepEqual(hreflang(es), expected, 'hreflang incluye la propia página');
    assert.deepEqual(hreflang(await html(`/en/restaurants/${ok.slug}`)), expected, 'hreflang recíproco');
    assert.equal((await fetch(`${BASE}/fr/restaurants/${ok.slug}`)).status, 404);
    console.log('ficha apta: index, canónica sin barra final y hreflang recíproco solo es/en');

    const ld = jsonLd(es);
    const biz = ld.find((x) => x['@type'] === 'Restaurant');
    assert.ok(biz, 'JSON-LD de negocio');
    assert.equal(biz.address.streetAddress, 'Calle 1');
    assert.equal(biz.aggregateRating.reviewCount, 1);
    assert.equal(biz.priceRange, undefined, 'sin símbolos de moneda');
    assert.deepEqual(biz.openingHoursSpecification.map((s) => [s.opens, s.closes]), [['09:00', '13:00'], ['16:00', '20:00']]);
    assert.ok(ld.some((x) => x['@type'] === 'BreadcrumbList'));
    assert.ok(es.includes('Bien'), 'la reseña valorada se ve en la página');
    console.log('JSON-LD: negocio con dirección, horario y valoración visible; migas de pan');

    // Menú publicado de la ficha apta: indexable si tiene texto suficiente.
    const menu = await insert('menus', { place_id: ok.id, status: 'publicado' });
    const cat = await insert('menu_categories', { menu_id: menu.id, status: 'publicado' });
    await insert('menu_translations', { target_type: 'category', target_id: cat.id, locale: 'es', name: 'Principales', status: 'publicada' });
    const item = await insert('menu_items', { category_id: cat.id, status: 'publicado', price_mad: 120, price_status: 'verificado' });
    await insert('menu_translations', { target_type: 'item', target_id: item.id, locale: 'es', name: 'Plato', description: words(40), status: 'publicada' });
    await page.goto(`${BASE}/admin/indexacion`);
    await page.click('button:has-text("Recalcular ahora")');
    await page.waitForSelector('[role=status]:has-text("textos evaluados")', { timeout: 60_000 });
    const menuHtml = await html(`/es/restaurantes/${ok.slug}/menu`);
    assert.match(meta(menuHtml, 'robots') ?? '', /^index/);
    assert.equal(canonical(menuHtml), `https://tablemaroc.com/es/restaurantes/${ok.slug}/menu`);
    assert.ok((await html('/sitemap.xml')).includes(`/es/restaurantes/${ok.slug}/menu</loc>`));
    assert.match(meta(await html(`/en/restaurants/${ok.slug}`), 'robots') ?? '', /^index/);
    console.log('menú: indexable y en el sitemap cuando su ficha lo es y tiene texto suficiente');

    const bad = await html(`/es/restaurantes/${noPhoto.slug}`);
    assert.match(meta(bad, 'robots') ?? '', /^noindex/);
    assert.deepEqual(hreflang(bad), []);
    assert.equal(jsonLd(bad).length, 0, 'sin datos estructurados si no es apta');
    const sm = await html('/sitemap.xml');
    assert.ok(sm.includes(`<loc>https://tablemaroc.com/es/restaurantes/${ok.slug}</loc>`) && sm.includes('hreflang="en"') && sm.includes('<loc>https://tablemaroc.com/fr</loc>'));
    for (const p of [noPhoto, dupA, dupB, old]) assert.ok(!sm.includes(p.slug), `${p.slug} no debe estar en el sitemap`);
    console.log('ficha no apta: noindex, sin hreflang ni JSON-LD, y fuera del sitemap');

    const robots = await html('/robots.txt');
    assert.match(robots, /Disallow: \/admin/);
    assert.match(robots, /Sitemap: https:\/\/tablemaroc\.com\/sitemap\.xml/);
    assert.doesNotMatch(robots, /Disallow: \/\n/);
    assert.match(meta(await html('/es'), 'robots') ?? '', /^index/);
    assert.match(meta(await html('/'), 'robots') ?? '', /^noindex/);
    assert.match(meta(await html('/es/ciudades'), 'robots') ?? '', /^noindex/, 'listado con menos de 3 fichas indexables');
    assert.ok((await fetch(`${BASE}/icon.svg`)).ok, 'favicon');
    console.log('robots.txt, portada indexable, selector / con noindex y favicon');
    console.log('SEO E2E OK');
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
})().catch((e) => { console.error(e); process.exit(1); });
