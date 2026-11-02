// Panel de contenido (bloque 4b) en Chromium contra el proyecto Supabase de PRUEBAS (codigo/frontend/.env.test.local).
// Nunca contra el proyecto real: si la URL coincide con la de .env.local, se detiene sin hacer nada.
// Crea (si no existen) dos cuentas de prueba en el proyecto de pruebas: e2e-admin@… (rol admin) y e2e-user@… (sin rol).
// Entra con un enlace de acceso generado por la API de administración (no se envía ningún email).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const sharp = require('sharp');
const { resetFactors, passMfa, syncClock } = require('./mfa-helper.cjs');

const FRONTEND = path.join(__dirname, '../../frontend');
const PORT = 3102;
const BASE = `http://localhost:${PORT}`;
const ADMIN_EMAIL = 'e2e-admin@tablemaroc-e2e.test';
const USER_EMAIL = 'e2e-user@tablemaroc-e2e.test';

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
}
const test = readEnv(path.join(FRONTEND, '.env.test.local'));
const real = readEnv(path.join(FRONTEND, '.env.local'));
const URL_ = test.NEXT_PUBLIC_SUPABASE_URL, ANON = test.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = test.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.error('Falta codigo/frontend/.env.test.local con el proyecto de PRUEBAS. No se ejecuta nada.'); process.exit(2); }
if (URL_ === real.NEXT_PUBLIC_SUPABASE_URL) { console.error('BLOQUEADO: .env.test.local apunta al proyecto REAL. No se ejecuta nada.'); process.exit(2); }

const api = async (p, init = {}) => {
  const r = await fetch(URL_ + p, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${p}: ${r.status} ${body.slice(0, 200)}`);
  return body ? JSON.parse(body) : null;
};
async function ensureUser(email, role) {
  const list = await api('/auth/v1/admin/users?per_page=200');
  const found = list.users.find((u) => u.email === email);
  const app_metadata = role ? { role } : {};
  if (found) return api(`/auth/v1/admin/users/${found.id}`, { method: 'PUT', body: JSON.stringify({ app_metadata }) });
  return api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, email_confirm: true, app_metadata }) });
}
async function signIn(context, email, next) {
  const link = await api('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email }) });
  const page = await context.newPage();
  await page.goto(`${BASE}/auth/callback?token_hash=${link.hashed_token ?? link.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`);
  return page;
}

function startServer() {
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '' };
  const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: FRONTEND, shell: true, stdio: ['ignore', 'ignore', 'pipe'], env });
  child.stderr.on('data', (d) => process.stderr.write(d));
  return child;
}
function stopServer(child) {
  try { if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); else process.kill(-child.pid); } catch { child.kill(); }
}
async function waitFor(url, ms = 120_000) {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 500))) {
    try { if ((await fetch(url, { redirect: 'manual' })).status < 500) return; } catch {}
  }
  throw new Error(`El servidor no responde en ${url}`);
}

(async () => {
  await ensureUser(ADMIN_EMAIL, 'admin');
  await ensureUser(USER_EMAIL, null);
  await resetFactors(api, ADMIN_EMAIL);
  await syncClock(URL_);
  const server = startServer();
  let browser;
  const stamp = Date.now().toString(36);
  try {
    await waitFor(`${BASE}/auth/entrar`);
    browser = await chromium.launch();

    // Un usuario sin rol no ve el panel (404).
    const userCtx = await browser.newContext();
    const userPage = await signIn(userCtx, USER_EMAIL, '/admin');
    assert.match(await userPage.title(), /404|Tablemaroc/);
    assert.equal((await userPage.goto(`${BASE}/admin/lugares`)).status(), 404, 'usuario sin rol: 404');
    console.log('usuario sin rol: el panel responde 404');

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await signIn(ctx, ADMIN_EMAIL, '/admin');
    await passMfa(page);
    await page.waitForSelector('h1:has-text("Pendiente de tu decisión")');
    console.log('administrador: entra en el panel');

    // Ciudad nueva (región: la primera de los datos de referencia).
    await page.goto(`${BASE}/admin/ciudades/nuevo`);
    await page.fill('input[name=slug]', `e2e-ciudad-${stamp}`);
    await page.selectOption('select[name=region_id]', { index: 1 });
    await page.fill('input[name=lat]', '35.78'); await page.fill('input[name=lng]', '-5.81');
    await page.click('button:has-text("Crear ciudad")');
    await page.waitForURL(/\/admin\/ciudades\/[0-9a-f-]{36}/);
    console.log('alta de ciudad: OK');

    // Lugar: primero con errores (se conservan los datos escritos), luego bien.
    await page.goto(`${BASE}/admin/lugares/nuevo`);
    await page.fill('input[name=slug]', 'Café Mal');
    await page.fill('input[name=address]', 'Calle de prueba 1');
    await page.fill('input[name=lat]', '35.78');
    await page.fill('input[name=hours_mon]', 'por la mañana');
    await page.click('button:has-text("Crear lugar")');
    await page.waitForSelector('ul[role=alert]');
    const errs = await page.textContent('ul[role=alert]');
    for (const f of ['Slug', 'Tipo de lugar', 'Ciudad', 'Coordenadas', 'Horario Lunes']) assert.ok(errs.includes(f), `falta el error de ${f}: ${errs}`);
    assert.equal(await page.inputValue('input[name=address]'), 'Calle de prueba 1', 'lo escrito se conserva tras un error');
    const slug = `e2e-lugar-${stamp}`;
    await page.fill('input[name=slug]', slug);
    await page.selectOption('select[name=place_type_id]', { label: 'restaurantes' });
    await page.selectOption('select[name=city_id]', { label: `e2e-ciudad-${stamp}` });
    await page.fill('input[name=lng]', '-5.81');
    await page.fill('input[name=hours_mon]', '9:00-13:00');
    await page.click('button:has-text("Crear lugar")');
    await page.waitForURL(/\/admin\/lugares\/[0-9a-f-]{36}/);
    const placeUrl = page.url();
    const placeId = placeUrl.split('/').pop().split('?')[0];
    console.log('alta de lugar: errores claros, datos conservados y alta correcta');

    // Texto en español, publicar traducción y ficha.
    const es = page.locator('details:has(summary:has-text("Español"))');
    await es.locator('input[name=title]').fill(`E2E Restaurante ${stamp}`);
    await es.locator('textarea[name=description]').fill('Resumen de prueba.');
    await es.locator('textarea[name=directions]').fill('Indicaciones de prueba.');
    await es.locator('button:has-text("Guardar texto (es)")').click();
    await es.locator('[role=status]').waitFor();
    await page.reload();
    await page.locator('details:has(summary:has-text("Español")) button:has-text("Marcar como revisada")').click();
    await page.waitForSelector('details:has(summary:has-text("Español · Revisada"))');
    await page.locator('details:has(summary:has-text("Español")) button:has-text("Publicar traducción")').click();
    await page.waitForSelector('details:has(summary:has-text("Español · Publicada"))');
    await page.click('button:has-text("Marcar como revisado")');
    await page.waitForSelector('button:has-text("Publicar")');
    assert.ok(await page.isVisible('details summary:has-text("Quality Gate")'), 'se ve el Quality Gate antes de publicar');
    await page.locator('section:has(#estado) button:has-text("Publicar")').click();
    await page.waitForSelector('a:has-text("Ver en la web")');
    console.log('traducción y ficha publicadas; Quality Gate visible antes');

    // Ya es pública (sin sesión) y su slug ha quedado fijo.
    assert.equal((await fetch(`${BASE}/es/restaurantes/${slug}`)).status, 200, 'la ficha publicada se ve en la web');
    await page.reload();
    assert.ok(await page.isVisible('input[name=slug_readonly][readonly]'), 'slug fijo tras publicar');
    console.log('ficha pública en /es/restaurantes/' + slug + ' y slug fijo');

    // Foto con GPS: se aprueba con derechos y alt, y la sirve /media sin EXIF.
    const jpeg = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#a55' } }).jpeg().withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '35/1 47/1 0/1' } }).toBuffer();
    assert.ok((await sharp(jpeg).metadata()).exif, 'la foto de prueba lleva GPS de verdad');
    const tmp = path.join(require('os').tmpdir(), `e2e-${stamp}.jpg`);
    fs.writeFileSync(tmp, jpeg);
    const up = page.locator('form:has(button:has-text("Subir foto"))');
    await up.locator('input[type=file]').setInputFiles(tmp);
    await up.locator('input[name=source]').fill('Foto de prueba');
    await up.locator('input[name=author]').fill('E2E');
    await up.locator('input[name=license]').fill('Solo pruebas');
    await up.locator('input[name=alt_es]').fill('Sala de prueba');
    await up.locator('button:has-text("Subir foto")').click();
    await up.locator('[role=status]').waitFor({ timeout: 30_000 });
    const photos = await api(`/rest/v1/photos?place_id=eq.${placeId}&select=storage_path,status`);
    assert.equal(photos.length, 1);
    assert.equal(photos[0].status, 'aprobada');
    const media = await fetch(`${BASE}/media/${photos[0].storage_path}`);
    assert.equal(media.status, 200);
    assert.equal(media.headers.get('content-type'), 'image/webp');
    const meta = await sharp(Buffer.from(await media.arrayBuffer())).metadata();
    assert.equal(meta.width, 1600);
    assert.equal(meta.exif, undefined, 'la foto publicada no lleva EXIF/GPS');
    console.log('foto: aprobada con derechos y alt; /media la sirve en WebP 1600 px sin GPS');

    // Fotos de plato, guía y ciudad: mismo formulario; no se sirven mientras la ficha sea borrador y se ven en la ficha publicada.
    const created = { Prefer: 'return=representation' };
    const [dish] = await api('/rest/v1/dishes', { method: 'POST', headers: created, body: JSON.stringify({ slug: `e2e-plato-${stamp}` }) });
    const [guide] = await api('/rest/v1/guides', { method: 'POST', headers: created, body: JSON.stringify({ slug: `e2e-guia-${stamp}` }) });
    const [cityRow] = await api(`/rest/v1/cities?slug=eq.e2e-ciudad-${stamp}&select=id,slug`);
    const targets = [
      { panel: 'platos', table: 'dishes', column: 'dish_id', type: 'dish', section: 'platos-tipicos', row: dish },
      { panel: 'guias', table: 'guides', column: 'guide_id', type: 'guide', section: 'guias-gastronomicas', row: guide },
      { panel: 'ciudades', table: 'cities', column: 'city_id', type: 'city', section: 'ciudades', row: cityRow },
    ];
    for (const x of targets) {
      const setStatus = (status) => api(`/rest/v1/${x.table}?id=eq.${x.row.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await setStatus('borrador');
      await page.goto(`${BASE}/admin/${x.panel}/${x.row.id}`);
      const form = page.locator('form:has(button:has-text("Subir foto"))');
      await form.locator('input[type=file]').setInputFiles(tmp);
      await form.locator('input[name=source]').fill('Foto de prueba');
      await form.locator('input[name=author]').fill('E2E');
      await form.locator('input[name=license]').fill('Solo pruebas');
      await form.locator('input[name=alt_es]').fill('Foto de ficha');
      await form.locator('button:has-text("Subir foto")').click();
      await form.locator('[role=status]').waitFor({ timeout: 30_000 });
      const [photo] = await api(`/rest/v1/photos?${x.column}=eq.${x.row.id}&select=storage_path,status`);
      assert.equal(photo.status, 'aprobada');
      assert.equal((await fetch(`${BASE}/media/${photo.storage_path}`)).status, 404, `${x.panel} en borrador: su foto no es pública`);
      await setStatus('publicado');
      assert.equal((await fetch(`${BASE}/media/${photo.storage_path}`)).status, 200, `${x.panel} publicado: su foto se sirve`);
      await api('/rest/v1/translations?on_conflict=entity_type,entity_id,locale', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ entity_type: x.type, entity_id: x.row.id, locale: 'es', title: `E2E ${x.row.slug}`, status: 'publicada' }) });
      await page.goto(`${BASE}/es/${x.section}/${x.row.slug}`);
      assert.equal(await page.getAttribute('main img[src^="/media/"]', 'alt'), 'Foto de ficha', `${x.panel}: la ficha pública muestra la foto`);
    }
    console.log('fotos de plato, guía y ciudad: privadas en borrador, públicas al publicar y visibles en la ficha');

    // Auditoría de todo lo anterior.
    const audit = await api(`/rest/v1/audit_log?entidad_id=eq.${placeId}&select=accion,campo,origen,actor`);
    const actions = audit.map((a) => a.accion);
    for (const a of ['crear', 'estado']) assert.ok(actions.includes(a), `auditoría sin "${a}"`);
    assert.ok(audit.every((a) => a.origen === 'panel' && a.actor === ADMIN_EMAIL));
    const trAudit = await api(`/rest/v1/audit_log?entidad_id=eq.place/${placeId}/es&select=accion`);
    assert.ok(trAudit.length >= 3, 'auditoría de la traducción');
    console.log(`auditoría: ${audit.length + trAudit.length} entradas, origen panel, actor el administrador`);

    // En móvil, todo pulsable ≥ 48 px en la ficha de edición.
    const small = await page.evaluate(() => [...document.querySelectorAll('main a, main button, main input:not([type=hidden]):not([type=checkbox]), main select')]
      .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 48; }).map((e) => e.outerHTML.slice(0, 60)));
    assert.deepEqual(small, [], `elementos < 48 px: ${JSON.stringify(small)}`);
    console.log('ADMIN E2E OK');
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
})().catch((e) => { console.error(e); process.exit(1); });
