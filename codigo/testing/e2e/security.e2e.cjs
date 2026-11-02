// Fase 6 contra el proyecto Supabase de PRUEBAS: dos pasos del panel, límite de intentos y derechos del usuario. Nunca contra el real.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const { nextCode, resetFactors, passMfa, totp, syncClock } = require('./mfa-helper.cjs');

const FRONTEND = path.join(__dirname, '../../frontend');
const PORT = 3106;
const BASE = `http://localhost:${PORT}`;
const ADMIN = 'e2e-admin@tablemaroc-e2e.test', GONE = 'e2e-baja@tablemaroc-e2e.test';

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
}
const env = readEnv(path.join(FRONTEND, '.env.test.local'));
const real = readEnv(path.join(FRONTEND, '.env.local'));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.error('Falta codigo/frontend/.env.test.local. No se ejecuta nada.'); process.exit(2); }
if (URL_ === real.NEXT_PUBLIC_SUPABASE_URL) { console.error('BLOQUEADO: apunta al proyecto REAL. No se ejecuta nada.'); process.exit(2); }

const raw = (p, init = {}) => fetch(URL_ + p, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
const api = async (p, init) => { const r = await raw(p, init); const b = await r.text(); if (!r.ok) throw new Error(`${p}: ${r.status} ${b.slice(0, 200)}`); return b ? JSON.parse(b) : null; };
const insert = (t, row) => api(`/rest/v1/${t}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) }).then((x) => x[0]);
async function ensureUser(email, role) {
  const { users } = await api('/auth/v1/admin/users?per_page=200');
  const f = users.find((u) => u.email === email);
  const app_metadata = role ? { role } : {};
  return f ? api(`/auth/v1/admin/users/${f.id}`, { method: 'PUT', body: JSON.stringify({ app_metadata }) }) : api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, email_confirm: true, app_metadata }) });
}
const hashed = async (email) => { const l = await api('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email }) }); return l.hashed_token ?? l.properties.hashed_token; };
async function signIn(browser, email, next) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/callback?token_hash=${await hashed(email)}&type=magiclink&next=${encodeURIComponent(next)}`);
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

(async () => {
  await ensureUser(ADMIN, 'admin');
  await resetFactors(api, ADMIN);
  await syncClock(URL_);
  const gone = await ensureUser(GONE, null);
  const stamp = Date.now().toString(36);
  const [region] = await api('/rest/v1/regions?select=id&limit=1');
  const [type] = await api('/rest/v1/place_types?select=id&slug=eq.restaurantes');
  const city = await insert('cities', { region_id: region.id, slug: `e2e-g-${stamp}`, status: 'publicado' });
  const draft = await insert('places', { slug: `e2e-borrador-${stamp}`, city_id: city.id, place_type_id: type.id, status: 'borrador' });
  const place = await insert('places', { slug: `e2e-g-${stamp}`, city_id: city.id, place_type_id: type.id, status: 'publicado' });
  await api(`/rest/v1/profiles?id=eq.${gone.id}`, { method: 'PATCH', body: JSON.stringify({ display_name: 'Baja E2E' }) });
  const review = await insert('reviews', { user_id: gone.id, place_id: place.id, rating: 5, comment: `Baja ${stamp}`, status: 'aprobada' });
  await insert('consents', { user_id: gone.id, purpose: 'resena', version: 'e2e', granted: true });
  const storagePath = `${gone.id}/e2e-${stamp}.webp`;
  const up = await fetch(`${URL_}/storage/v1/object/fotos/${storagePath}`, { method: 'POST', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'image/webp' }, body: Buffer.from('RIFF') });
  assert.ok(up.ok, 'archivo de prueba');
  await insert('photos', { user_id: gone.id, review_id: review.id, storage_path: storagePath, status: 'pendiente' });

  const server = startServer();
  let browser;
  try {
    await waitFor(`${BASE}/auth/entrar`);
    browser = await chromium.launch();

    // Administrador con enlace, pero sin el segundo paso.
    const tokenAal1 = (await (await fetch(`${URL_}/auth/v1/verify`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', token_hash: await hashed(ADMIN) }) })).json()).access_token;
    const r = await fetch(`${URL_}/rest/v1/places?id=eq.${draft.id}&select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${tokenAal1}` } });
    assert.deepEqual(await r.json(), [], 'sin segundo paso, la API no enseña borradores');
    const w = await fetch(`${URL_}/rest/v1/places?id=eq.${draft.id}`, { method: 'PATCH', headers: { apikey: ANON, Authorization: `Bearer ${tokenAal1}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status: 'publicado' }) });
    assert.deepEqual(await w.json(), [], 'sin segundo paso, la API no publica nada');
    console.log('dos pasos: una sesión de administrador sin el segundo paso no consigue nada por la API');

    const page = await signIn(browser, ADMIN, '/admin');
    await page.waitForURL(/\/auth\/mfa/);
    await page.click('button:has-text("Empezar")');
    await page.waitForSelector('[data-testid=totp-secret]');
    const shown = await page.textContent('[data-testid=totp-secret]');
    await page.fill('#code', '000000');
    await page.click('button:has-text("Verificar")');
    await page.waitForSelector('form p[role=alert]');
    assert.equal(await page.textContent('[data-testid=totp-secret]'), shown, 'un código falso no cambia el QR ya escaneado');
    const secret = await passMfa(page);
    await page.waitForSelector('h1:has-text("Pendiente de tu decisión")');
    console.log('dos pasos: alta con QR/clave; un código falso se rechaza; el correcto da acceso');

    const second = await signIn(browser, ADMIN, '/admin/lugares');
    await second.waitForURL(/\/auth\/mfa/);
    assert.equal(await second.locator('[data-testid=totp-secret]').count(), 0, 'la clave solo se enseña en el alta');
    await nextCode();
    await second.fill('#code', totp(secret));
    await second.click('button:has-text("Verificar")');
    await second.waitForSelector('h1:has-text("Lugares")', { timeout: 20_000 }).catch(async (e) => { throw new Error(`En ${second.url()}: ${(await second.innerText('body')).replace(/s+/g, ' ').slice(0, 300)}`, { cause: e }); });
    console.log('dos pasos: en cada entrada pide el código y no vuelve a enseñar la clave');
    const session = (await second.context().cookies()).filter((c) => c.name.includes('auth-token'));
    assert.ok(session.length > 0 && session.every((c) => c.httpOnly && c.sameSite === 'Lax'), 'cookie de sesión HttpOnly');
    console.log('cookies de sesión: HttpOnly y SameSite=Lax');

    // Límite de intentos: dirección de un dominio reservado, sin cuenta (no se envía ningún email).
    const login = await (await browser.newContext()).newPage();
    await login.goto(`${BASE}/auth/entrar?lang=es`);
    let limited = false;
    for (let i = 0; i < 7 && !limited; i++) {
      await login.fill('#email', `nadie${i}@tablemaroc-e2e.test`);
      await login.locator('form').first().locator('button[type=submit]').click();
      await login.waitForTimeout(1200);
      limited = (await login.locator('form p[role=alert]').count()) > 0 && /demasiados/i.test(await login.locator('form p[role=alert]').first().textContent());
    }
    assert.ok(limited, 'corta tras varios enlaces seguidos');
    console.log('límite de intentos: corta los enlaces de acceso repetidos');

    // Derechos del usuario.
    const user = await signIn(browser, GONE, '/cuenta?lang=es');
    await user.waitForSelector('h1:has-text("Mi cuenta")');
    const exported = await user.request.get(`${BASE}/cuenta/exportar`);
    const data = await exported.json();
    assert.equal(data.email, GONE);
    assert.ok(data.resenas.some((x) => x.id === review.id), 'su reseña');
    assert.ok(data.consentimientos.length >= 1, 'sus consentimientos');
    assert.match(exported.headers()['content-disposition'], /attachment/);
    await user.locator('summary:has-text("Eliminar mi cuenta")').click();
    await user.fill('input[name=confirm]', 'otro@correo.test');
    await user.click('button:has-text("Eliminar mi cuenta")');
    await user.waitForSelector('text=El email no coincide');
    assert.equal((await api(`/rest/v1/reviews?id=eq.${review.id}&select=id`)).length, 1, 'con el email mal no borra nada');
    await user.fill('input[name=confirm]', GONE);
    await user.click('button:has-text("Eliminar mi cuenta")');
    await user.waitForURL(/\/es$/);
    assert.deepEqual(await api(`/rest/v1/reviews?id=eq.${review.id}&select=id`), []);
    assert.deepEqual(await api(`/rest/v1/profiles?id=eq.${gone.id}&select=id`), []);
    assert.deepEqual(await api(`/rest/v1/consents?user_id=eq.${gone.id}&select=id`), []);
    assert.ok((await raw(`/storage/v1/object/fotos/${storagePath}`)).status >= 400, 'archivo borrado');
    assert.ok((await raw(`/auth/v1/admin/users/${gone.id}`)).status >= 400, 'usuario borrado');
    const audit = await api(`/rest/v1/audit_log?entidad_id=eq.usuario/${gone.id}&select=accion,actor`);
    assert.equal(audit[0].accion, 'eliminar_cuenta');
    assert.ok(!JSON.stringify(audit).includes(GONE), 'la auditoría no guarda el email');
    console.log('derechos: exporta sus datos; eliminar borra cuenta, perfil, reseñas, consentimientos y archivos, y la auditoría no guarda el email');
    console.log('SECURITY E2E OK');
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
})().catch((e) => { console.error(e); process.exit(1); });
