// «Crear copia» y «Restaurar desde archivo» (maestro §9, §20) en Chromium real contra el Worker local (wrangler dev).
// Uso: node codigo/testing/e2e/copia-pc.e2e.cjs <base, p. ej. http://localhost:8787> <SESSION_PEPPER> <carpeta de codigo/cloudflare>
// Necesita el Worker local arrancado con ese SESSION_PEPPER, un TOTP_KEY y SITE_URL = <base>. Datos ficticios, solo en local.
// La carpeta del PC se sustituye por una carpeta interna del navegador (OPFS): misma API de archivos, sin selector de Windows.
const { createHash, createHmac, randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { writeFileSync, mkdtempSync } = require('node:fs');
const { join } = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const sharp = require('sharp');

const [, , B, PEPPER, CWD] = process.argv;
let fallos = 0;
const ok = (d, c, i = '') => { console.log(`${c ? '✔' : '✖'} ${d}${i ? ' — ' + i : ''}`); if (!c) fallos++; };
const sh = (args) => spawnSync('npx', args, { cwd: CWD, shell: true, encoding: 'utf8', env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' } });
const sql = (s) => { const f = join(mkdtempSync(join(os.tmpdir(), 'tm-')), 's.sql'); writeFileSync(f, s); const r = sh(['wrangler', 'd1', 'execute', 'tablemaroc', '--local', '--persist-to', '.wrangler/state', '--file', f]); if (r.status) throw new Error(r.stderr); };
const totp = (sec) => { const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000))); const h = createHmac('sha1', sec).update(m).digest(); const o = h[19] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'); };
const deB32 = (s) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, val = 0; const out = []; for (const c of s) { val = (val << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };

(async () => {
  const token = randomBytes(32).toString('hex');
  sql(`INSERT OR IGNORE INTO users (id, email, display_name, role, email_verified_at) VALUES ('cp-admin','admin@copia.example.test','Admin','admin','2026-11-01');
       INSERT INTO sessions (id_hash, user_id, second_factor_ok, expires_at) VALUES ('${createHash('sha256').update(`${PEPPER}:${token}`).digest('hex')}','cp-admin',1,'2099-01-01');
       INSERT OR IGNORE INTO places (id, slug, city_id, place_type_id, lat, lng, status) VALUES ('cp-local','copia-uno','ct-tanger','pt-restaurantes',35.7,-5.8,'borrador');`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  // En http://localhost Chromium no admite crear a mano una cookie __Host- (exige HTTPS): se envía como cabecera.
  await ctx.setExtraHTTPHeaders({ Cookie: `__Host-tm_sesion=${token}` });
  const page = await ctx.newPage();
  await page.goto(B + '/es/');
  await page.addScriptTag({ url: '/copia-pc.js' });
  const api = (metodo, ruta, cuerpo) => page.evaluate(async ([m, r, c]) => {
    const res = await fetch(r, { method: m, headers: c ? { 'Content-Type': 'application/json' } : {}, body: c ? JSON.stringify(c) : undefined });
    return { s: res.status, d: await res.json().catch(() => null) };
  }, [metodo, ruta, cuerpo]);

  // Segundo factor configurado (para restaurar) y una foto en R2.
  const sf = await api('GET', '/api/acceso/segundo-factor/');
  const secreto = deB32(new URL(sf.d.otpauth).searchParams.get('secret'));
  const webp = await sharp({ create: { width: 6, height: 6, channels: 3, background: '#a33' } }).webp().toBuffer();
  const foto = await page.evaluate(async (bytes) => {
    const f = new FormData(); f.set('archivo', new Blob([new Uint8Array(bytes)], { type: 'image/webp' }), 'f.webp');
    for (const [k, v] of Object.entries({ destino: 'locales', id: 'cp-local', origen: 'Titular', autoria: 'Titular', licencia: 'Propia', alt_es: 'Prueba' })) f.set(k, v);
    const r = await fetch('/api/panel/fotos/', { method: 'POST', body: f }); return r.json();
  }, [...webp]);
  ok('preparación: segundo factor y una foto subida', !!secreto.length && foto.ok, JSON.stringify(foto));

  // 1. Configurar: contraseña corta rechazada; carpeta y clave guardadas en el navegador.
  const corta = await page.evaluate(async () => { const d = await navigator.storage.getDirectory(); try { await window.tablemarocCopia.configurar({ contrasena: 'corta', carpeta: d }); return 'aceptada'; } catch (e) { return e.message; } });
  ok('contraseña de menos de 12 caracteres → rechazada', corta.includes('12'), corta);
  const conf = await page.evaluate(async () => { const d = await navigator.storage.getDirectory(); await window.tablemarocCopia.configurar({ contrasena: 'contraseña-de-copia-larga', carpeta: d }); return window.tablemarocCopia.estaConfigurada(); });
  ok('configurada: carpeta y clave (no extraíble) recordadas en este navegador', conf === true);
  const extraible = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tablemaroc-copia'); r.onsuccess = () => { const g = r.result.transaction('ajustes').objectStore('ajustes').get('ajustes'); g.onsuccess = () => ok(g.result.clave.extractable); }; }));
  ok('la clave guardada no se puede extraer', extraible === false);

  // 2. Crear copia (completa y cifrada).
  const c1 = await page.evaluate(() => window.tablemarocCopia.crearCopia());
  ok('«Crear copia»: base de datos y la foto, sin fotos fallidas', c1.fotos === 1 && c1.fotosQueNoSeHanPodidoCopiar.length === 0, JSON.stringify(c1));
  const leer = (contrasena) => page.evaluate(async (p) => {
    const d = await navigator.storage.getDirectory(); const f = await (await d.getFileHandle('tablemaroc-copia.tmcopia')).getFile();
    try { const c = await window.tablemarocCopia.leerCopia(f, p); return { ok: true, slug: c.volcado.tablas.places.find((x) => x.id === 'cp-local')?.slug, fotos: c.fotos.length, emails: JSON.stringify(c.volcado).includes('admin@copia.example.test') }; }
    catch (e) { return { ok: false, error: e.message }; }
  }, contrasena);
  const texto = await page.evaluate(async () => { const d = await navigator.storage.getDirectory(); return new TextDecoder('latin1').decode(await (await (await d.getFileHandle('tablemaroc-copia.tmcopia')).getFile()).arrayBuffer()); });
  ok('el archivo está cifrado: no se leen ni emails ni slugs', !texto.includes('admin@copia.example.test') && !texto.includes('copia-uno') && texto.startsWith('TMCOPIA1'));
  const l1 = await leer('contraseña-de-copia-larga');
  ok('con la contraseña se lee entera (base + foto)', l1.ok && l1.slug === 'copia-uno' && l1.fotos === 1 && l1.emails, JSON.stringify(l1));
  ok('contraseña errónea → rechazada', (await leer('otra-contraseña-cualquiera')).error === 'Contraseña de copia incorrecta');

  // 3. La nueva copia sustituye a la anterior: un solo archivo, con los datos nuevos.
  await api('PUT', '/api/panel/contenido/locales/cp-local/', { slug: 'copia-dos' });
  await page.evaluate(() => window.tablemarocCopia.crearCopia());
  const archivos = await page.evaluate(async () => { const d = await navigator.storage.getDirectory(); const n = []; for await (const [nombre] of d.entries()) n.push(nombre); return n; });
  ok('tras la segunda copia sigue habiendo UN solo archivo', archivos.length === 1 && archivos[0] === 'tablemaroc-copia.tmcopia', archivos.join(', '));
  ok('y tiene los datos nuevos (la antigua ya no está)', (await leer('contraseña-de-copia-larga')).slug === 'copia-dos');

  // 4. Un archivo manipulado o recortado se rechaza.
  const manipulado = await page.evaluate(async () => {
    const d = await navigator.storage.getDirectory(); const b = new Uint8Array(await (await (await d.getFileHandle('tablemaroc-copia.tmcopia')).getFile()).arrayBuffer());
    const r = [];
    for (const cambio of [(x) => { x[x.length - 5] ^= 1; return x; }, (x) => x.slice(0, x.length - 40)]) {
      try { await window.tablemarocCopia.leerCopia(new Blob([cambio(b.slice())]), 'contraseña-de-copia-larga'); r.push('aceptado'); } catch (e) { r.push(e.message); }
    }
    return r;
  });
  ok('un byte cambiado o el final recortado → rechazado', manipulado.every((m) => m !== 'aceptado'), manipulado.join(' | '));

  // 5. Restaurar desde archivo: el local vuelve al estado de la copia y la foto borrada de R2 se repone.
  await api('PUT', '/api/panel/contenido/locales/cp-local/', { slug: 'copia-tres' });
  const key = (await api('GET', '/api/panel/contenido/locales/cp-local/')).d.fotos[0].r2_key;
  sh(['wrangler', 'r2', 'object', 'delete', `tablemaroc-fotos/${key}`, '--local', '--persist-to', '.wrangler/state']);
  ok('preparación: la foto ya no está en R2', (await page.evaluate(async (k) => (await fetch(`/api/panel/copias/foto/?key=${encodeURIComponent(k)}`)).status, key)) === 404);
  const restaurar = (conf) => page.evaluate(async (c) => {
    const d = await navigator.storage.getDirectory(); const f = await (await d.getFileHandle('tablemaroc-copia.tmcopia')).getFile();
    try { return await window.tablemarocCopia.restaurarDesdeArchivo(f, 'contraseña-de-copia-larga', c); } catch (e) { return { error: e.message }; }
  }, conf);
  ok('sin escribir RESTAURAR → rechazado', (await restaurar({ confirmacion: 'si', codigo: totp(secreto) })).error?.includes('RESTAURAR'));
  ok('con código incorrecto → rechazado', (await restaurar({ confirmacion: 'RESTAURAR', codigo: '000000' })).error?.includes('código'));
  const r = await restaurar({ confirmacion: 'RESTAURAR', codigo: totp(secreto) });
  ok('restaurar desde archivo con RESTAURAR y el código de la app', r.ok && !!r.copiaPrevia && r.fotosRepuestas === 1, JSON.stringify(r));
  const tras = (await api('GET', '/api/panel/contenido/locales/cp-local/')).d.elemento.slug;
  ok('el local vuelve al estado de la copia (copia-dos)', tras === 'copia-dos', tras);
  ok('la foto vuelve a estar en R2', (await page.evaluate(async (k) => (await fetch(`/api/panel/copias/foto/?key=${encodeURIComponent(k)}`)).status, key)) === 200);
  const aud = (await api('GET', '/api/panel/auditoria/?entidad=config&id=copia:pc')).d.registros.map((x) => x.accion);
  ok('queda auditado (crear copia, rechazos y restauración)', ['crear_copia_pc', 'restaurar_rechazado', 'restaurar_desde_archivo'].every((a) => aud.includes(a)), aud.join(', '));

  // 6. Claude Code no puede exportar datos personales.
  const cc = await page.evaluate(async () => (await fetch('/api/panel/copias/exportar/', { headers: { 'X-Origen': 'claude_code' } })).status);
  ok('Claude Code no puede crear la copia externa → 403', cc === 403);

  await browser.close();
  console.log(fallos ? `✖ ${fallos} comprobaciones fallidas` : '✔ Todas las comprobaciones de la copia en el PC han pasado');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
