// Menú e importación (bloque 4d) en Chromium contra el proyecto Supabase de PRUEBAS. Nunca contra el real (se detiene).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const { resetFactors, passMfa, syncClock } = require('./mfa-helper.cjs');

const FRONTEND = path.join(__dirname, '../../frontend');
const PORT = 3104;
const BASE = `http://localhost:${PORT}`;
const ADMIN = 'e2e-admin@tablemaroc-e2e.test', USER = 'e2e-user@tablemaroc-e2e.test';

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
async function ensureUser(email, role) {
  const { users } = await api('/auth/v1/admin/users?per_page=200');
  const f = users.find((u) => u.email === email);
  const app_metadata = role ? { role } : {};
  return f ? api(`/auth/v1/admin/users/${f.id}`, { method: 'PUT', body: JSON.stringify({ app_metadata }) }) : api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, email_confirm: true, app_metadata }) });
}
async function signIn(browser, email, next) {
  const l = await api('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email }) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/callback?token_hash=${l.hashed_token ?? l.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`);
  return page;
}
function startServer() {
  const e = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '' };
  const c = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: FRONTEND, shell: true, stdio: ['ignore', 'ignore', 'pipe'], env: e });
  c.stderr.on('data', (d) => process.stderr.write(d));
  return c;
}
function stopServer(c) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: 'ignore' }); else process.kill(-c.pid); } catch { c.kill(); } }
async function waitFor(url, ms = 120_000) { for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 500))) { try { if ((await fetch(url, { redirect: 'manual' })).status < 500) return; } catch {} } throw new Error(`Sin respuesta: ${url}`); }
const text = async (u) => (await fetch(u)).text();

(async () => {
  await ensureUser(ADMIN, 'admin'); await ensureUser(USER, null);
  await resetFactors(api, ADMIN);
  await syncClock(URL_);
  const stamp = Date.now().toString(36);
  const [region] = await api('/rest/v1/regions?select=id&limit=1');
  const [type] = await api('/rest/v1/place_types?select=id&slug=eq.restaurantes');
  const city = await insert('cities', { region_id: region.id, slug: `e2e-m-${stamp}`, status: 'publicado' });
  const place = await insert('places', { slug: `e2e-menu-${stamp}`, city_id: city.id, place_type_id: type.id, status: 'borrador' });
  await insert('translations', { entity_type: 'place', entity_id: place.id, locale: 'es', title: 'E2E menú', status: 'publicada' });
  const publicMenu = `${BASE}/es/restaurantes/${place.slug}/menu`;

  const server = startServer();
  let browser;
  const csvFile = path.join(os.tmpdir(), `e2e-${stamp}.csv`);
  const binFile = path.join(os.tmpdir(), `e2e-${stamp}.bin.csv`);
  try {
    await waitFor(`${BASE}/auth/entrar`);
    assert.equal((await fetch(`${BASE}/admin/lugares/${place.id}/menu/qr?lang=es`, { redirect: 'manual' })).status, 307, 'QR sin sesión: a entrar');
    browser = await chromium.launch();

    const user = await signIn(browser, USER, '/');
    assert.equal((await user.goto(`${BASE}/admin/importar`)).status(), 404, 'usuario sin rol: importar 404');
    assert.equal((await user.goto(`${BASE}/admin/lugares/${place.id}/menu`)).status(), 404, 'usuario sin rol: menú 404');
    console.log('usuario sin rol: 404 en importar y en el menú');

    const page = await signIn(browser, ADMIN, `/admin/lugares/${place.id}/menu`);
    await passMfa(page);
    await page.waitForSelector('h1:has-text("Menú")');
    const newCat = page.locator('section:has(h2:has-text("Nueva categoría"))');
    await newCat.locator('input[name=name_es]').fill('Principales');
    await newCat.locator('button:has-text("Añadir categoría")').click();
    await page.waitForSelector('summary:has-text("Categoría: Principales")');

    const addItem = async (name, price, verified) => {
      const box = page.locator('details:has(summary:has-text("+ Añadir artículo"))');
      if (!(await box.getAttribute('open') !== null)) await box.locator('summary').click();
      await box.locator('input[name=name_es]').fill(name);
      await box.locator('input[name=price_mad]').fill(price);
      if (verified) await box.locator('input[name=price_verified]').check(); else await box.locator('input[name=price_verified]').uncheck();
      await box.locator('button:has-text("Añadir artículo")').click();
    };
    await addItem('Inválido', '-5', true);
    await page.waitForSelector('ul[role=alert]:has-text("Importe en MAD")');
    await addItem('Inválido', '12 EUR', true);
    await page.waitForSelector('ul[role=alert]:has-text("Importe en MAD")');
    await addItem('Sin importe', '', true);
    await page.waitForSelector('ul[role=alert]:has-text("necesita importe")');
    await addItem('Tajine E2E', '120', true);
    await page.waitForSelector('summary:has-text("Tajine E2E")');
    await addItem('Sin verificar E2E', '35', false);
    await page.waitForSelector('summary:has-text("Sin verificar E2E")');
    await addItem('Decimal E2E', '12,50', true);
    await page.waitForSelector('summary:has-text("Decimal E2E")');
    console.log('artículos: rechaza negativos, otras monedas y verificado sin importe');

    await page.click('button:has-text("Publicar menú")');
    await page.waitForSelector('ul[role=alert]:has-text("Publica primero el lugar")');
    await api(`/rest/v1/places?id=eq.${place.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'publicado' }) });
    await page.click('button:has-text("Publicar menú")');
    await page.waitForSelector('button:has-text("Retirar de la web")');
    const html = await text(publicMenu);
    assert.ok(html.includes('Tajine E2E') && html.includes('120 MAD'), 'precio verificado en MAD');
    assert.ok(html.includes('12,5 MAD'), 'decimales solo cuando existen');
    assert.ok(html.includes('Sin verificar E2E') && !html.includes('35 MAD') && html.includes('Precio pendiente'), 'sin verificar: Precio pendiente');
    console.log('publicado: 120 MAD, 12,5 MAD y el no verificado como Precio pendiente');

    const qr = await page.request.get(`${BASE}/admin/lugares/${place.id}/menu/qr?lang=fr`);
    assert.equal(qr.status(), 200);
    assert.equal(qr.headers()['content-type'], 'image/png');
    assert.ok((await qr.body()).length > 500);
    console.log('QR: PNG para el administrador; sin sesión pide entrar');

    const item = page.locator('details:has(summary:has-text("Tajine E2E"))');
    await item.locator('summary').click();
    await item.locator('button:has-text("Ocultar artículo")').click();
    await page.waitForSelector('summary:has-text("🚫")');
    assert.ok(!(await text(publicMenu)).includes('Tajine E2E'), 'oculto: sale de la web al momento');
    await page.click('button:has-text("Retirar de la web")');
    await page.waitForSelector('button:has-text("Publicar menú")');
    assert.ok(!(await text(publicMenu)).includes('Decimal E2E'), 'retirado: no se ve');
    const audit = await api(`/rest/v1/audit_log?entidad_tipo=eq.menu&actor=eq.${encodeURIComponent(ADMIN)}&select=accion&order=fecha.desc&limit=20`);
    assert.ok(['estado', 'crear_articulo', 'ocultar_articulo'].every((a) => audit.some((x) => x.accion === a)));
    console.log('ocultar y retirar funcionan al momento; todo en la auditoría');

    // Importación.
    const hood = `e2e-b-${stamp}`;
    await insert('neighborhoods', { city_id: city.id, slug: hood, status: 'publicado' });
    const good = `E2E Importado ${stamp}`;
    fs.writeFileSync(csvFile, `﻿nombre;tipo;ciudad;barrio;direccion;lunes\n"${good}";Restaurantes;${city.slug};${hood};"Calle 1; local 2";9:00-13:00\nMal;tipo-raro;${city.slug};;;\n`);
    fs.writeFileSync(binFile, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0]));
    await page.goto(`${BASE}/admin/importar`);
    const plantilla = await page.request.get(`${BASE}/admin/importar/plantilla`);
    assert.match(await plantilla.text(), /nombre;tipo;ciudad/);
    await page.setInputFiles('input[type=file]', binFile);
    await page.click('button:has-text("Revisar archivo")');
    await page.waitForSelector('p[role=alert]:has-text("CSV de texto")');
    await page.setInputFiles('input[type=file]', csvFile);
    await page.click('button:has-text("Revisar archivo")');
    await page.waitForSelector('h2:has-text("Vista previa")');
    assert.equal((await api(`/rest/v1/places?slug=like.e2e-importado-${stamp}*&select=id`)).length, 0, 'la vista previa no guarda nada');
    assert.ok(await page.isVisible('li:has-text("tipo desconocido")'));
    await page.click('button:has-text("Crear 1 lugares en borrador")');
    await page.waitForSelector('p[role=status]:has-text("creados en borrador")');
    const [created] = await api(`/rest/v1/places?slug=eq.${`e2e-importado-${stamp}`}&select=id,status,address,opening_hours,lat`);
    assert.equal(created.status, 'borrador');
    assert.equal(created.address, 'Calle 1; local 2');
    assert.deepEqual(created.opening_hours, { mon: '9:00–13:00' });
    assert.equal(created.lat, null, 'no inventa coordenadas');
    const logs = await api(`/rest/v1/audit_log?origen=eq.importacion&actor=eq.${encodeURIComponent(ADMIN)}&select=accion,valor_nuevo&order=fecha.desc&limit=1`);
    assert.equal(logs[0].valor_nuevo.creados, 1);
    assert.equal((await fetch(`${BASE}/es/restaurantes/e2e-importado-${stamp}`)).status, 404, 'en borrador: no es público');
    await page.goto(`${BASE}/admin/importar`);
    await page.setInputFiles('input[type=file]', csvFile);
    await page.click('button:has-text("Revisar archivo")');
    await page.waitForSelector('li:has-text("ya existe")');
    assert.equal(await page.locator('button:has-text("Crear")').count(), 0, 'repetir el archivo no duplica');
    console.log('importación: rechaza binarios, vista previa sin guardar, borrador, datos fieles, auditoría y sin duplicar');
    console.log('MENU E2E OK');
  } finally {
    if (browser) await browser.close();
    stopServer(server);
    for (const f of [csvFile, binFile]) fs.rmSync(f, { force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
