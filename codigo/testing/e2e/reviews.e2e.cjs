// Reseñas y moderación (bloque 4c) en Chromium contra el proyecto Supabase de PRUEBAS. Nunca contra el real (se detiene).
// Recorrido: nombre visible → reseña con foto → moderación → publicación → edición → borrado.
// Ataques directos a la API con la sesión de un usuario normal: aprobarse, tocar lo ajeno, subir al bucket, fotos de más.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const sharp = require('sharp');
const { resetFactors, passMfa, syncClock } = require('./mfa-helper.cjs');

const FRONTEND = path.join(__dirname, '../../frontend');
const PORT = 3103;
const BASE = `http://localhost:${PORT}`;
const A = 'e2e-a@tablemaroc-e2e.test', B = 'e2e-b@tablemaroc-e2e.test', ADMIN = 'e2e-admin@tablemaroc-e2e.test';

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
const insert = (table, row) => api(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) }).then((x) => x[0]);

async function ensureUser(email, role) {
  const { users } = await api('/auth/v1/admin/users?per_page=200');
  const found = users.find((u) => u.email === email);
  const app_metadata = role ? { role } : {};
  return found ? api(`/auth/v1/admin/users/${found.id}`, { method: 'PUT', body: JSON.stringify({ app_metadata }) })
    : api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, email_confirm: true, app_metadata }) });
}
const genLink = async (email) => { const l = await api('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email }) }); return l.hashed_token ?? l.properties.hashed_token; };
async function signIn(browser, email, next) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/callback?token_hash=${await genLink(email)}&type=magiclink&next=${encodeURIComponent(next)}`);
  return page;
}
/** Sesión de usuario normal para atacar la API directamente, como haría alguien con la clave pública del navegador. */
async function userToken(email) {
  const r = await fetch(`${URL_}/auth/v1/verify`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', token_hash: await genLink(email) }) });
  return (await r.json()).access_token;
}
const asUser = (token, p, init = {}) => fetch(URL_ + p, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });

function startServer() {
  const e = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '' };
  const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: FRONTEND, shell: true, stdio: ['ignore', 'ignore', 'pipe'], env: e });
  child.stderr.on('data', (d) => process.stderr.write(d));
  return child;
}
function stopServer(c) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: 'ignore' }); else process.kill(-c.pid); } catch { c.kill(); } }
async function waitFor(url, ms = 120_000) { for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 500))) { try { if ((await fetch(url, { redirect: 'manual' })).status < 500) return; } catch {} } throw new Error(`Sin respuesta: ${url}`); }

(async () => {
  const userA = await ensureUser(A, null), userB = await ensureUser(B, null);
  await ensureUser(ADMIN, 'admin');
  await resetFactors(api, ADMIN);
  await syncClock(URL_);
  await api(`/rest/v1/profiles?id=in.(${userA.id},${userB.id})`, { method: 'PATCH', body: JSON.stringify({ display_name: null }) });
  await api(`/rest/v1/reviews?user_id=in.(${userA.id},${userB.id})`, { method: 'DELETE' });
  const stamp = Date.now().toString(36);
  const [region] = await api('/rest/v1/regions?select=id&limit=1');
  const [type] = await api('/rest/v1/place_types?select=id&slug=eq.restaurantes');
  const city = await insert('cities', { region_id: region.id, slug: `e2e-r-${stamp}`, status: 'publicado' });
  const place = await insert('places', { slug: `e2e-res-${stamp}`, city_id: city.id, place_type_id: type.id, status: 'publicado' });
  const place2 = await insert('places', { slug: `e2e-res2-${stamp}`, city_id: city.id, place_type_id: type.id, status: 'publicado' });
  for (const p of [place, place2]) await insert('translations', { entity_type: 'place', entity_id: p.id, locale: 'es', title: `E2E ${p.slug}`, status: 'publicada' });
  const form = `/cuenta/resena/restaurantes/${place.slug}?lang=es`;
  const publicUrl = `${BASE}/es/restaurantes/${place.slug}`;

  const server = startServer();
  let browser;
  const tmp = path.join(os.tmpdir(), `e2e-r-${stamp}.jpg`);
  try {
    await waitFor(`${BASE}/auth/entrar`);
    assert.equal((await fetch(`${BASE}${form}`, { redirect: 'manual' })).status, 307, 'sin sesión, el formulario pide entrar');
    browser = await chromium.launch();
    fs.writeFileSync(tmp, await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#47a' } }).jpeg().withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '35/1 47/1 0/1' } }).toBuffer());

    const page = await signIn(browser, A, form);
    await page.waitForSelector('h1');
    assert.ok(await page.isVisible('main > p[role=alert]'), 'pide elegir nombre visible');
    await page.goto(`${BASE}/cuenta?lang=es`);
    await page.fill('input[name=display_name]', 'yo@correo.com');
    await page.click('button:has-text("Guardar nombre")');
    await page.waitForSelector('form p[role=alert]');
    await page.fill('input[name=display_name]', 'Ana E2E');
    await page.click('button:has-text("Guardar nombre")');
    await page.waitForSelector('form p[role=status]');
    console.log('nombre visible: rechaza un email y guarda un nombre');

    await page.goto(`${BASE}${form}`);
    const send = async () => { await page.click('button:has-text("Enviar reseña")'); };
    await send();
    await page.waitForSelector('form p[role=alert]');
    assert.match(await page.textContent('form p[role=alert]'), /1 a 5 estrellas/);
    await page.check('input[name=rating][value="5"]');
    await page.fill('textarea[name=comment]', `Comentario E2E ${stamp}`);
    await send();
    await page.waitForFunction(() => /política de privacidad/.test(document.querySelector('form p[role=alert]')?.textContent ?? ''));
    await page.check('input[name=consent]');
    await page.setInputFiles('input[name=photos]', [tmp, tmp, tmp, tmp]);
    await send();
    await page.waitForFunction(() => /Máximo 3 fotos/.test(document.querySelector('form p[role=alert]')?.textContent ?? ''));
    await page.setInputFiles('input[name=photos]', [tmp]);
    await send();
    await page.waitForFunction(() => /fotos son tuyas/.test(document.querySelector('form p[role=alert]')?.textContent ?? ''));
    await page.check('input[name=photo_consent]');
    await send();
    await page.waitForSelector('form p[role=status]', { timeout: 30_000 });
    console.log('reseña: exige estrellas, consentimiento y derechos; máximo 3 fotos; queda enviada');

    const [review] = await api(`/rest/v1/reviews?user_id=eq.${userA.id}&select=id,status`);
    assert.equal(review.status, 'pendiente');
    assert.ok(!(await (await fetch(publicUrl)).text()).includes(`Comentario E2E ${stamp}`), 'pendiente: no se ve en la web');
    const consents = await api(`/rest/v1/consents?user_id=eq.${userA.id}&select=purpose,version`);
    assert.ok(['resena', 'fotos_resena'].every((p) => consents.some((c) => c.purpose === p)), 'consentimientos con versión');
    const [photo] = await api(`/rest/v1/photos?review_id=eq.${review.id}&select=id,status,storage_path,author,license`);
    assert.equal(photo.status, 'pendiente');
    assert.equal(photo.author, 'Ana E2E');
    assert.ok(photo.storage_path.startsWith(`${userA.id}/`) && photo.storage_path.endsWith('.webp'));
    console.log('pendiente: no aparece en la web; consentimiento registrado; foto en la carpeta del usuario');

    // Ataques con la sesión del usuario A, directamente contra la API.
    const tokenA = await userToken(A);
    let r = await asUser(tokenA, `/rest/v1/reviews?id=eq.${review.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprobada' }) });
    assert.ok(r.status >= 400, 'no puede aprobarse su reseña');
    r = await asUser(tokenA, `/rest/v1/photos?id=eq.${photo.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'aprobada' }) });
    assert.deepEqual(await r.json(), [], 'no puede aprobar su foto');
    r = await asUser(tokenA, '/rest/v1/photos', { method: 'POST', body: JSON.stringify({ user_id: userA.id, review_id: review.id, storage_path: `${userA.id}/x.webp`, status: 'aprobada' }) });
    assert.ok(r.status >= 400, 'no puede crear una foto aprobada');
    r = await fetch(`${URL_}/storage/v1/object/fotos/${userA.id}/directa.webp`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${tokenA}`, 'Content-Type': 'image/webp' }, body: await sharp(tmp).webp().toBuffer() });
    assert.ok(r.status >= 400, `no puede subir al bucket sin pasar por el servidor (${r.status})`);
    const tokenB = await userToken(B);
    r = await asUser(tokenB, `/rest/v1/reviews?id=eq.${review.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ comment: 'hackeado' }) });
    assert.deepEqual(await r.json(), [], 'B no edita la reseña de A');
    r = await asUser(tokenB, `/rest/v1/reviews?id=eq.${review.id}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    assert.deepEqual(await r.json(), [], 'B no borra la reseña de A');
    r = await asUser(tokenB, `/rest/v1/reviews?id=eq.${review.id}&select=id`);
    assert.deepEqual(await r.json(), [], 'B no ve la reseña pendiente de A');
    assert.equal((await page.goto(`${BASE}/admin/resenas`)).status(), 404, 'un usuario normal no ve la cola');
    console.log('ataques directos a la API: todos rechazados');

    // Moderación.
    const admin = await signIn(browser, ADMIN, '/admin/resenas');
    await passMfa(admin);
    const card = admin.locator(`section:has-text("Comentario E2E ${stamp}")`);
    await card.locator('button:has-text("Rechazar")').click();
    await card.locator('ul[role=alert]').waitFor();
    assert.match(await card.locator('ul[role=alert]').textContent(), /motivo/i);
    await card.locator('button:has-text("Aprobar")').click();
    for (let i = 0; i < 60; i++) { if ((await api(`/rest/v1/reviews?id=eq.${review.id}&select=status`))[0].status === 'aprobada') break; await new Promise((res) => setTimeout(res, 500)); }
    assert.equal((await api(`/rest/v1/reviews?id=eq.${review.id}&select=status`))[0].status, 'aprobada');

    await admin.goto(`${BASE}/admin/fotos`);
    const pc = admin.locator(`section:has(img[src*="${photo.storage_path.split('/')[1]}"])`);
    await pc.locator('select[name=status]').selectOption('aprobada');
    await pc.locator('button:has-text("Guardar")').click();
    await pc.locator('ul[role=alert]').waitFor();
    assert.match(await pc.locator('ul[role=alert]').textContent(), /texto alternativo/);
    await pc.locator('input[name=alt_es]').fill('Foto de la reseña');
    await pc.locator('button:has-text("Guardar")').click();
    for (let i = 0; i < 60; i++) { if ((await api(`/rest/v1/photos?id=eq.${photo.id}&select=status`))[0].status === 'aprobada') break; await new Promise((res) => setTimeout(res, 500)); }
    assert.equal((await api(`/rest/v1/photos?id=eq.${photo.id}&select=status`))[0].status, 'aprobada');
    console.log('moderación: rechazar exige motivo; aprobar foto exige alt en el idioma de la reseña');

    const html = await (await fetch(publicUrl)).text();
    assert.ok(html.includes(`Comentario E2E ${stamp}`) && html.includes('Ana E2E'), 'publicada con nombre visible');
    assert.ok(!html.includes(A), 'nunca aparece el email');
    const media = await fetch(`${BASE}/media/${photo.storage_path}`);
    assert.equal(media.headers.get('content-type'), 'image/webp');
    assert.equal((await sharp(Buffer.from(await media.arrayBuffer())).metadata()).exif, undefined, 'sin EXIF/GPS');
    console.log('publicada: nombre visible, sin email; foto servida sin GPS');

    // Respuesta en borrador: nunca pública.
    await admin.goto(`${BASE}/admin/resenas?estado=aprobada`);
    const rc = admin.locator(`section:has-text("Comentario E2E ${stamp}")`);
    await rc.locator('summary:has-text("Respuesta")').click();
    await rc.locator('textarea[name=body]').fill(`Respuesta E2E ${stamp}`);
    await rc.locator('button:has-text("Aprobar respuesta")').click();
    await rc.locator('[role=status]').waitFor();
    const [reply] = await api(`/rest/v1/review_replies?review_id=eq.${review.id}&select=status`);
    assert.equal(reply.status, 'aprobada_por_titular');
    assert.ok(!(await (await fetch(publicUrl)).text()).includes(`Respuesta E2E ${stamp}`), 'la respuesta no se publica');
    const audit = await api(`/rest/v1/audit_log?entidad_id=eq.${review.id}&select=accion,actor`);
    assert.ok(['moderar', 'respuesta'].every((a) => audit.some((x) => x.accion === a && x.actor === ADMIN)));
    console.log('respuesta aprobada pero no publicada; moderación en la auditoría');

    // Editar la devuelve a moderación; borrar quita también el archivo.
    await page.goto(`${BASE}${form}`);
    await page.fill('textarea[name=comment]', `Editado E2E ${stamp}`);
    await page.check('input[name=consent]');
    await send();
    await page.waitForSelector('form p[role=status]', { timeout: 30_000 });
    assert.equal((await api(`/rest/v1/reviews?id=eq.${review.id}&select=status`))[0].status, 'pendiente');
    assert.ok(!(await (await fetch(publicUrl)).text()).includes('E2E ' + stamp + '</p>') , 'editada: deja de verse');
    await page.goto(`${BASE}/cuenta?lang=es`);
    await page.click('button:has-text("Borrar definitivamente")');
    await page.waitForSelector('text=Todavía no has escrito ninguna reseña');
    assert.deepEqual(await api(`/rest/v1/reviews?id=eq.${review.id}&select=id`), []);
    assert.ok((await raw(`/storage/v1/object/fotos/${photo.storage_path}`)).status >= 400, 'el archivo también se borra');
    console.log('editar vuelve a moderación; borrar elimina reseña, fotos y archivo');

    // Límite diario en la base de datos, con la sesión del usuario.
    const extra = [];
    for (let i = 0; i < 6; i++) extra.push(await insert('places', { slug: `e2e-l${i}-${stamp}`, city_id: city.id, place_type_id: type.id, status: 'publicado' }));
    const tokenB2 = await userToken(B);
    const codes = [];
    for (const p of extra) codes.push((await asUser(tokenB2, '/rest/v1/reviews', { method: 'POST', body: JSON.stringify({ user_id: userB.id, place_id: p.id, rating: 3 }) })).status);
    assert.deepEqual(codes.slice(0, 5), [201, 201, 201, 201, 201]);
    assert.ok(codes[5] >= 400, 'la sexta reseña en 24 h se rechaza');
    console.log('límite de 5 reseñas en 24 h: aplicado por la base de datos');
    console.log('REVIEWS E2E OK');
  } finally {
    if (browser) await browser.close();
    stopServer(server);
    fs.rmSync(tmp, { force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
