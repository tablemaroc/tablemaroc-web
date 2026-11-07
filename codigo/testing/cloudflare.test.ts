// node --test codigo/testing/cloudflare.test.ts — base técnica en Cloudflare (maestro §18 ter)
// El esquema de D1 se prueba con el SQLite de Node (D1 es SQLite), sin cuenta de Cloudflare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { decidir, transicionPermitida, validarSolicitud, type AjustesReserva } from '../cloudflare/src/lib/reservas.ts';
import { elegirIdioma } from '../cloudflare/src/pages/index.ts';

const DIR = new URL('../cloudflare/migrations/', import.meta.url);

function base() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');                     // D1 aplica las claves foráneas
  for (const f of readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, DIR), 'utf8'));
  return db;
}

function conLocal(db: DatabaseSync) {
  db.exec(`INSERT INTO places (id, slug, city_id, place_type_id, lat, lng, status, accepts_reservations)
           VALUES ('p1', 'cafe-prueba', 'ct-tanger', 'pt-restaurantes', 35.78, -5.81, 'publicado', 1);
           INSERT INTO users (id, email) VALUES ('u1', 'prueba@example.test');
           INSERT INTO reservations (id, place_id, user_id, party_size, requested_for) VALUES ('r1', 'p1', 'u1', 2, '2026-12-01T20:00');`);
}

test('migraciones: se aplican y cargan los datos de referencia', () => {
  const db = base();
  const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  assert.equal(n('SELECT count(*) AS n FROM regions'), 12);
  assert.equal(n('SELECT count(*) AS n FROM place_types'), 4);
  assert.equal(n(`SELECT count(*) AS n FROM place_types WHERE slug = 'pastelerias-y-panaderias'`), 0);
  assert.equal(n('SELECT count(*) AS n FROM panel_modes'), 8);
});

test('esquema: sin barrios, sin árabe, sin moneda y sin alcohol', () => {
  const db = base();
  const tablas = (db.prepare(`SELECT group_concat(sql, ' ') AS s FROM sqlite_master`).get() as { s: string }).s.toLowerCase();
  assert.ok(!tablas.includes('neighborhood'));
  assert.ok(!tablas.includes("'ar'"));
  assert.ok(!/currency|moneda_|alcohol/.test(tablas.replace(/--[^\n]*/g, '')));
  assert.throws(() => db.exec(`INSERT INTO translations (id, entity_type, entity_id, locale) VALUES ('t', 'city', 'ct-tanger', 'ar')`));
});

test('reservas: transiciones, cancelar siempre y nunca borrar', () => {
  const db = base(); conLocal(db);
  db.exec(`UPDATE reservations SET status = 'cancelada' WHERE id = 'r1'`);   // pendiente → cancelada (06-11-2026)
  assert.throws(() => db.exec(`UPDATE reservations SET status = 'confirmada' WHERE id = 'r1'`), /no permitida/);
  assert.throws(() => db.exec(`DELETE FROM reservations WHERE id = 'r1'`), /no se borran/);
});

test('auditoría: solo inserción', () => {
  const db = base();
  db.exec(`INSERT INTO audit_log (id, actor, origen, entidad_tipo, entidad_id, accion) VALUES ('a1', 'claude_code', 'claude_code', 'place', 'p1', 'crear')`);
  assert.throws(() => db.exec(`UPDATE audit_log SET accion = 'x'`), /solo inserción/);
  assert.throws(() => db.exec(`DELETE FROM audit_log`), /solo inserción/);
});

test('RGPD / Ley 09-08: borrar la cuenta borra sus reseñas y deja la reserva sin usuario', () => {
  const db = base(); conLocal(db);
  db.exec(`INSERT INTO reviews (id, user_id, place_id, rating) VALUES ('rv1', 'u1', 'p1', 5);
           INSERT INTO favorites (user_id, place_id) VALUES ('u1', 'p1');
           DELETE FROM users WHERE id = 'u1';`);
  assert.equal((db.prepare(`SELECT count(*) AS n FROM reviews`).get() as { n: number }).n, 0);
  assert.equal((db.prepare(`SELECT count(*) AS n FROM favorites`).get() as { n: number }).n, 0);
  assert.equal((db.prepare(`SELECT user_id FROM reservations WHERE id = 'r1'`).get() as { user_id: null }).user_id, null);
});

test('reseñas y fotos: un rechazo exige motivo; precios verificados exigen importe', () => {
  const db = base(); conLocal(db);
  assert.throws(() => db.exec(`INSERT INTO reviews (id, user_id, place_id, rating, status) VALUES ('x', 'u1', 'p1', 3, 'rechazada')`));
  assert.throws(() => db.exec(`INSERT INTO reviews (id, user_id, place_id, rating, trip_type) VALUES ('y', 'u1', 'p1', 3, 'negocios')`));
  db.exec(`INSERT INTO menus (id, place_id) VALUES ('m1', 'p1'); INSERT INTO menu_categories (id, menu_id) VALUES ('c1', 'm1');`);
  assert.throws(() => db.exec(`INSERT INTO menu_items (id, category_id, price_status) VALUES ('i1', 'c1', 'verificado')`));
});

const AJUSTES: AjustesReserva = {
  accepts: true, maxParty: 6, capacityPerSlot: 10, closedDays: ['2026-12-25'],
  slots: [{ dia: 2, desde: '13:00', hasta: '15:00' }],      // martes
};

test('reservas automáticas: se confirma sola solo si encaja', () => {
  const ok = { fecha: '2026-12-01', hora: '13:30', personas: 4 };          // martes
  assert.deepEqual(decidir(ok, AJUSTES, 'automatico', 0), { estado: 'confirmada', motivo: 'encaja' });
  assert.equal(decidir(ok, AJUSTES, 'manual', 0).estado, 'pendiente');
  assert.equal(decidir({ ...ok, hora: '20:00' }, AJUSTES, 'automatico', 0).motivo, 'fuera_de_franja');
  assert.equal(decidir({ ...ok, personas: 7 }, AJUSTES, 'automatico', 0).motivo, 'demasiadas_personas');
  assert.equal(decidir(ok, AJUSTES, 'automatico', 8).motivo, 'sin_aforo');
  assert.equal(decidir({ ...ok, fecha: '2026-12-25' }, AJUSTES, 'automatico', 0).motivo, 'dia_cerrado');
});

test('reservas: validación y transiciones', () => {
  const ahora = new Date('2026-11-06T12:00:00Z');
  assert.equal(validarSolicitud({ fecha: '2026-11-01', hora: '13:00', personas: 2 }, AJUSTES, ahora), 'La fecha ya ha pasado');
  assert.equal(validarSolicitud({ fecha: '2026-12-01', hora: '25:00', personas: 2 }, AJUSTES, ahora), 'Hora no válida');
  assert.equal(validarSolicitud({ fecha: '2026-12-01', hora: '13:00', personas: 2 }, { ...AJUSTES, accepts: false }, ahora), 'El local no acepta reservas');
  assert.equal(validarSolicitud({ fecha: '2026-12-01', hora: '13:00', personas: 2 }, AJUSTES, ahora), null);
  assert.ok(transicionPermitida('pendiente', 'cancelada'));
  assert.ok(transicionPermitida('confirmada', 'cancelada'));
  assert.ok(!transicionPermitida('cancelada', 'confirmada'));
  assert.ok(!transicionPermitida('no_disponible', 'confirmada'));
});

test('idioma de entrada (§13): elegido → navegador es/en/fr → español', () => {
  assert.equal(elegirIdioma('tm_idioma=fr', 'en-GB,en;q=0.9'), 'fr');
  assert.equal(elegirIdioma(null, 'de-DE,de;q=0.9,en;q=0.8'), 'en');
  assert.equal(elegirIdioma(null, 'ar-MA,ar;q=0.9'), 'es');
  assert.equal(elegirIdioma(null, null), 'es');
});

// ───────────── Acceso sin contraseña (§18) ─────────────
import { base32, deBase32, nombreValido, emailValido, totp, totpValido } from '../cloudflare/src/lib/acceso.ts';
import { rutaSegura, validarIdToken } from '../cloudflare/src/lib/google.ts';
import { generarCodigo } from '../cloudflare/src/lib/sesion.ts';

test('TOTP: vector oficial del RFC 6238 (SHA-1) y desfase de ±30 s', async () => {
  const s = new TextEncoder().encode('12345678901234567890');
  assert.equal(await totp(s, 59_000), '287082');            // RFC 6238, T = 59 s (8 cifras: 94287082)
  assert.equal(await totp(s, 1_111_111_109_000), '081804');  // T = 1111111109 s (07081804)
  assert.ok(await totpValido(s, '287082', 59_000 + 30_000));
  assert.ok(!(await totpValido(s, '287082', 59_000 + 90_000)));
  assert.ok(!(await totpValido(s, 'abcdef', 59_000)));
  assert.deepEqual(deBase32(base32(s)), s);
});

test('códigos por email: 6 cifras', () => {
  for (let i = 0; i < 200; i++) assert.match(generarCodigo(), /^\d{6}$/);
});

test('Google: id_token con emisor, audiencia, caducidad y email verificado', () => {
  const tok = (c: object) => `x.${btoa(JSON.stringify(c)).replace(/=+$/, '')}.y`;
  const ok = { iss: 'https://accounts.google.com', aud: 'cid', exp: 2_000_000_000, email_verified: true, email: 'Ana@Example.test', sub: '123' };
  assert.deepEqual(validarIdToken(tok(ok), 'cid', 1_900_000_000_000), { sub: '123', email: 'ana@example.test' });
  assert.equal(validarIdToken(tok({ ...ok, aud: 'otra' }), 'cid', 1_900_000_000_000), null);
  assert.equal(validarIdToken(tok({ ...ok, iss: 'https://malicioso.example' }), 'cid', 1_900_000_000_000), null);
  assert.equal(validarIdToken(tok({ ...ok, email_verified: false }), 'cid', 1_900_000_000_000), null);
  assert.equal(validarIdToken(tok(ok), 'cid', 2_100_000_000_000), null);
});

test('sin redirecciones abiertas; nombre visible y email', () => {
  assert.equal(rutaSegura('/fr/', '/es/'), '/fr/');
  for (const malo of ['//malicioso.example', 'https://malicioso.example', '/\\malicioso', '/es/../x', 42]) assert.equal(rutaSegura(malo, '/es/'), '/es/');
  assert.equal(nombreValido('  Ana   María '), 'Ana María');
  assert.equal(nombreValido('a'), null);
  assert.equal(nombreValido('<script>'), null);
  assert.ok(emailValido('ana@example.test'));
  assert.ok(!emailValido('ana@'));
});

// ───────────── Panel (§20) ─────────────
import { validarAjustes } from '../cloudflare/src/lib/reservas.ts';
import { normalizarRuta } from '../cloudflare/src/lib/rutas.ts';
import { restaurarBase, validarVolcado, volcarBase } from '../cloudflare/src/lib/copias.ts';

/** Imitación mínima de D1 sobre el SQLite de Node, para probar la lógica de copias sin Cloudflare. */
function d1(db: DatabaseSync) {
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    all: async () => ({ results: db.prepare(sql).all(...(args as never[])) }),
    first: async () => db.prepare(sql).get(...(args as never[])) ?? null,
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(args as never[])).changes) } }),
  });
  return { prepare: (sql: string) => stmt(sql), batch: async (ss: ReturnType<typeof stmt>[]) => { db.exec('BEGIN'); try { for (const s of ss) await s.run(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } } } as unknown as D1Database;
}

test('ajustes de reservas: validación', () => {
  const ok = { acepta: true, franjas: [{ dia: 5, desde: '20:00', hasta: '23:00' }], maxPersonas: 8, aforo: 30, diasCerrados: ['2026-12-25', '2026-12-25'] };
  const v = validarAjustes(ok);
  assert.ok(!('error' in v) && v.diasCerrados.length === 1);
  assert.ok('error' in validarAjustes({ ...ok, franjas: [] }));                                     // acepta sin franjas
  assert.ok('error' in validarAjustes({ ...ok, franjas: [{ dia: 7, desde: '20:00', hasta: '23:00' }] }));
  assert.ok('error' in validarAjustes({ ...ok, franjas: [{ dia: 1, desde: '23:00', hasta: '20:00' }] }));
  assert.ok('error' in validarAjustes({ ...ok, maxPersonas: 0 }));
  assert.ok('error' in validarAjustes({ ...ok, diasCerrados: ['25/12/2026'] }));
  assert.ok(!('error' in validarAjustes({ acepta: false, franjas: [], maxPersonas: 4, aforo: null, diasCerrados: [] })));
});

test('redirecciones: solo rutas internas es/en/fr', () => {
  assert.equal(normalizarRuta('/ES/Tanger/Cafe-Hafa'), '/es/tanger/cafe-hafa/');
  for (const malo of ['/ar/x/', 'https://otro.example/', '/es//x/', '/de/x/', 'es/x', 3]) assert.equal(normalizarRuta(malo), null);
});

test('restaurar: vuelve al estado de la copia SIN borrar nada; auditoría y reservas solo se añaden', async () => {
  const db = base(); conLocal(db); const D = d1(db);
  db.exec(`INSERT INTO audit_log (id, actor, origen, entidad_tipo, entidad_id, accion) VALUES ('a1','x','sistema','place','p1','crear');
           INSERT INTO photos (id, place_id, r2_key, status) VALUES ('f1','p1','fotos/f1.webp','pendiente')`);
  const copia = await volcarBase(D);
  assert.ok(validarVolcado(copia));
  assert.ok(!('sessions' in copia.tablas) && !('email_codes' in copia.tablas));      // nada temporal en la copia
  // Después de la copia: se cambia un local, se cancela la reserva, se añade otro usuario y otra auditoría.
  db.exec(`UPDATE places SET slug = 'cambiado' WHERE id = 'p1';
           UPDATE reservations SET status = 'cancelada' WHERE id = 'r1';
           INSERT INTO users (id, email) VALUES ('u2', 'nuevo@example.test');
           INSERT INTO audit_log (id, actor, origen, entidad_tipo, entidad_id, accion) VALUES ('a2','x','sistema','place','p1','editar');`);
  await restaurarBase(D, copia);
  const v = (sql: string) => db.prepare(sql).get() as Record<string, unknown>;
  assert.equal(v(`SELECT slug FROM places WHERE id = 'p1'`).slug, 'cafe-prueba');        // vuelve al estado de la copia
  assert.equal(v(`SELECT count(*) AS n FROM users WHERE id = 'u2'`).n, 1);               // lo nuevo se conserva
  assert.equal(v(`SELECT status FROM reservations WHERE id = 'r1'`).status, 'cancelada'); // el historial no se reescribe
  assert.equal(v(`SELECT count(*) AS n FROM audit_log`).n, 2);                            // auditoría intacta
  assert.equal(v(`SELECT r2_key FROM photos WHERE id = 'f1'`).r2_key, 'fotos/f1.webp');        // columnas con números (r2_key)
  assert.ok(!validarVolcado({ version: 1, tablas: { sessions: [] } }));                    // tablas fuera de la lista: no
  assert.ok(!validarVolcado({ version: 2, tablas: {} }));
});

// ───────────── Contenido, fotos y menú (§3, §4, §17) ─────────────
import sharpLib from 'sharp';
import { evaluar } from '../cloudflare/src/lib/calidad.ts';
import { cambioEstadoPermitido, rutaPublica, validarCampos } from '../cloudflare/src/lib/contenido.ts';
import { limpiarWebp } from '../cloudflare/src/lib/fotos.ts';
import { validarPlato } from '../cloudflare/src/lib/menu.ts';

/** WebP real de 4×4 con un bloque EXIF que lleva una ubicación GPS inventada. */
async function webpConGps(): Promise<Uint8Array> {
  const limpio = await sharpLib({ create: { width: 4, height: 4, channels: 3, background: '#c33' } }).webp().toBuffer();
  const exif = Buffer.from('Exif\0\0GPSLatitude=35.7595;GPSLongitude=-5.8340');   // contenido de prueba
  const chunk = (id: string, d: Buffer) => { const h = Buffer.alloc(8); h.write(id, 0, 'ascii'); h.writeUInt32LE(d.length, 4); return Buffer.concat([h, d, d.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
  const vp8x = Buffer.alloc(10); vp8x[0] = 0x08; vp8x.writeUIntLE(3, 4, 3); vp8x.writeUIntLE(3, 7, 3);   // marca EXIF, 4×4
  const cuerpo = Buffer.concat([Buffer.from('WEBP'), chunk('VP8X', vp8x), limpio.subarray(12), chunk('EXIF', exif)]);
  const riff = Buffer.alloc(8); riff.write('RIFF', 0, 'ascii'); riff.writeUInt32LE(cuerpo.length, 4);
  return new Uint8Array(Buffer.concat([riff, cuerpo]));
}

test('fotos: el WebP se limpia de EXIF (GPS) y sigue siendo una imagen válida', async () => {
  const entrada = await webpConGps();
  assert.ok(Buffer.from(entrada).includes('GPSLatitude'));
  const r = limpiarWebp(entrada);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.quitados, ['EXIF']);
  assert.ok(!Buffer.from(r.datos).includes('GPSLatitude'));
  const meta = await sharpLib(Buffer.from(r.datos)).metadata();
  assert.equal(meta.format, 'webp'); assert.equal(meta.width, 4); assert.equal(meta.exif, undefined);
  assert.equal(r.datos[20]! & 0x0c, 0);                                   // marcas EXIF/XMP quitadas en VP8X
  assert.ok(!limpiarWebp(new TextEncoder().encode('no es una imagen, solo texto de prueba')).ok);
  const jpeg = await sharpLib({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  assert.ok(!limpiarWebp(new Uint8Array(jpeg)).ok);                        // solo WebP
});

test('estados del contenido: lo publicado no vuelve atrás', () => {
  assert.ok(cambioEstadoPermitido('borrador', 'revisado'));
  assert.ok(cambioEstadoPermitido('revisado', 'publicado'));
  assert.ok(cambioEstadoPermitido('revisado', 'borrador'));
  assert.ok(!cambioEstadoPermitido('borrador', 'publicado'));
  assert.ok(!cambioEstadoPermitido('publicado', 'borrador'));
  assert.ok(!cambioEstadoPermitido('publicado', 'revisado'));
});

test('campos del local: coordenadas obligatorias, sin datos inventados', () => {
  const e: Record<string, string> = {};
  const v = validarCampos('locales', { lat: '35.7595', lng: '-5.834', phone: '+212 539 12 34 56', accepts_card: true, has_terrace: null, staff_languages: ['es', 'fr', 'es'] }, e);
  assert.deepEqual(e, {});
  assert.equal(v.has_terrace, null);                                      // sin verificar = pendiente
  assert.equal(v.staff_languages, '["es","fr"]');
  const e2: Record<string, string> = {};
  validarCampos('locales', { lat: '', lng: '', staff_languages: ['ar'] }, e2);
  assert.ok(e2.coords && e2.staff_languages);
});

test('rutas públicas para las 301 (la sección se traduce, el slug no)', () => {
  assert.equal(rutaPublica('locales', 'en', 'cafe-hafa', 'cafes-y-teterias'), '/en/cafes-and-tea-rooms/cafe-hafa/');
  assert.equal(rutaPublica('ciudades', 'fr', 'tanger'), '/fr/villes/tanger/');
  assert.equal(rutaPublica('platos', 'es', 'harira'), '/es/platos-tipicos/harira/');
});

test('Quality Gate: indexable solo si cumple todo; un fallo no borra nada', () => {
  const base = { tipo: 'place' as const, idioma: 'es' as const, estado: 'publicado', traduccionPublicada: true, caracteres: 320, duplicada: false,
    lat: 35.7, lng: -5.8, ciudad: true, fotosConAlt: 1, entrantes: 1, salientes: 2, relaciones: 0 };
  assert.ok(evaluar(base).indexable);
  assert.ok(!evaluar({ ...base, caracteres: 299 }).indexable);
  assert.ok(!evaluar({ ...base, fotosConAlt: 0 }).indexable);
  assert.ok(!evaluar({ ...base, duplicada: true }).indexable);
  assert.ok(!evaluar({ ...base, estado: 'revisado' }).indexable);
  assert.ok(!evaluar({ ...base, tipo: 'guide', caracteres: 600, relaciones: 3, fotosConAlt: 2, autoria: false }).indexable);
});

test('menú: precios solo en MAD; vacío = pendiente; verificado exige importe', () => {
  const e: Record<string, string> = {};
  assert.deepEqual(validarPlato({ precio_mad: '35,50', precio_verificado: true }, e), { price_mad: 35.5, price_status: 'verificado' });
  assert.deepEqual(e, {});
  const e2: Record<string, string> = {}; validarPlato({ precio_mad: null, precio_verificado: true }, e2); assert.ok(e2.precio_mad);
  const e3: Record<string, string> = {}; validarPlato({ precio_mad: '10', moneda: 'EUR' }, e3); assert.ok(e3.moneda);
  const e4: Record<string, string> = {}; validarPlato({ precio_mad: '-5' }, e4); assert.ok(e4.price_mad);
});

// ───────────── Reseñas y cuentas (§3, §3.2, §20) ─────────────
import { validarResena } from '../cloudflare/src/lib/resenas.ts';
import { borrarCuenta, exportarDatos } from '../cloudflare/src/lib/cuenta.ts';

test('reseñas: estrellas 1-5, comentario ≤ 2000, visita no futura, tipo de viaje aprobado', () => {
  const hoy = new Date('2026-11-05T12:00:00Z');
  const ok = validarResena({ puntuacion: 5, comentario: '  Muy bueno  ', fechaVisita: '2026-11-01', tipoViaje: 'pareja', idioma: 'fr' }, hoy);
  assert.ok(ok.ok && ok.datos.comment === 'Muy bueno' && ok.datos.locale === 'fr' && ok.datos.trip_type === 'pareja');
  const sinIdioma = validarResena({ puntuacion: 3, idioma: 'ar' }, hoy);
  assert.ok(sinIdioma.ok && sinIdioma.datos.locale === 'es');                       // árabe no existe: español
  const mal = validarResena({ puntuacion: 6, comentario: 'x'.repeat(2001), fechaVisita: '2026-12-01', tipoViaje: 'negocios' }, hoy);
  assert.ok(!mal.ok && ['rating', 'comment', 'visited_on', 'trip_type'].every((c) => mal.campos.includes(c)));
});

test('borrar cuenta: se van sus datos y la reserva queda en el historial sin datos personales', async () => {
  const db = base(); conLocal(db); const D = d1(db);
  db.exec(`UPDATE reservations SET special_request = 'Alergia al marisco' WHERE id = 'r1';
           INSERT INTO reviews (id, user_id, place_id, rating) VALUES ('rv1', 'u1', 'p1', 4);
           INSERT INTO photos (id, place_id, review_id, user_id, r2_key) VALUES ('f1', 'p1', 'rv1', 'u1', 'fotos/locales/x.webp');
           INSERT INTO consents (id, user_id, purpose, version, granted) VALUES ('c1', 'u1', 'condiciones', 'v1', 1);`);
  const datos = await exportarDatos(D, 'u1');
  assert.equal((datos.cuenta as { email: string }).email, 'prueba@example.test');
  assert.equal(datos.resenas.length, 1); assert.equal(datos.reservas.length, 1); assert.equal(datos.consentimientos.length, 1);
  const borradas: string[][] = [];
  const r2 = { delete: async (k: string[]) => { borradas.push(k); } } as unknown as R2Bucket;
  assert.deepEqual(await borrarCuenta(D, r2, 'u1', 'u1', 'sistema', 'Solicitud del usuario'), { ok: true });
  const v = (sql: string) => db.prepare(sql).get() as Record<string, unknown>;
  assert.equal(v(`SELECT count(*) AS n FROM users WHERE id = 'u1'`).n, 0);
  assert.equal(v(`SELECT count(*) AS n FROM reviews`).n, 0);
  assert.equal(v(`SELECT count(*) AS n FROM photos`).n, 0);
  assert.deepEqual(borradas, [['fotos/locales/x.webp']]);                               // también se borra el archivo en R2
  const res = v(`SELECT user_id, special_request FROM reservations WHERE id = 'r1'`);
  assert.equal(res.user_id, null); assert.equal(res.special_request, null);
  assert.equal(v(`SELECT count(*) AS n FROM audit_log WHERE accion = 'borrar_cuenta'`).n, 1);
  db.exec(`INSERT INTO users (id, email, role) VALUES ('u9', 'local@example.test', 'propietario')`);
  assert.equal((await borrarCuenta(D, r2, 'u9', 'x', 'panel', 'm')).ok, false);          // un propietario no se borra así
});

test('reseñas sin límite por local: el mismo usuario puede reseñar varias veces el mismo local (06-11-2026)', () => {
  const db = base(); conLocal(db);
  db.exec(`INSERT INTO reviews (id, user_id, place_id, rating) VALUES ('v1', 'u1', 'p1', 4), ('v2', 'u1', 'p1', 5), ('v3', 'u1', 'p1', 3)`);
  assert.equal((db.prepare(`SELECT count(*) AS n FROM reviews WHERE user_id = 'u1' AND place_id = 'p1'`).get() as { n: number }).n, 3);
});

// ───────────── Parte pública: abierto ahora, cerca de aquí, sitemap (§13, §18 ter, §20) ─────────────
import { abiertoAhora, distancia, esRamadan, masCercanos } from '../cloudflare/src/lib/horario.ts';
import { robotsTxt, sitemapXml } from '../cloudflare/src/lib/seo.ts';
import { comoLlegar } from '../cloudflare/src/lib/publico.ts';

test('abierto ahora con la hora de Marruecos (lunes = mon)', () => {
  const h = { mon: '9:00–13:00, 16:00–20:00', fri: '20:00–02:00' };
  const a = (iso: string, o = {}) => abiertoAhora(h, new Date(iso), { ramadan: false, ...o });
  assert.equal(a('2026-11-02T10:00:00Z'), 'abierto');          // lunes 10:00
  assert.equal(a('2026-11-02T14:00:00Z'), 'cerrado');          // lunes entre tramos
  assert.equal(a('2026-11-02T20:00:00Z'), 'cerrado');          // hora de cierre: ya cerrado
  assert.equal(a('2026-11-03T10:00:00Z'), 'cerrado');          // martes: sin horario = cerrado
  assert.equal(a('2026-11-06T23:30:00Z'), 'abierto');          // viernes 23:30, tramo que pasa de medianoche
  assert.equal(a('2026-11-07T01:30:00Z'), 'abierto');          // sábado 01:30, sigue el tramo del viernes
  assert.equal(a('2026-11-07T02:30:00Z'), 'cerrado');
  assert.equal(abiertoAhora(null, new Date()), 'sin_horario');
  assert.equal(a('2026-11-02T10:00:00Z', { avisoRamadan: true, ramadan: true }), 'consultar_ramadan');   // no se inventa
  assert.equal(a('2026-11-02T10:00:00Z', { aperturaLocal: 'cerrado_temporalmente' }), 'cerrado_temporalmente');
});

test('Ramadán con el calendario islámico, sin servicios externos', () => {
  assert.ok(esRamadan(new Date('2026-03-01T12:00:00Z')));
  assert.ok(!esRamadan(new Date('2026-11-05T12:00:00Z')));
});

test('cerca de aquí: los más próximos dentro de 3 km, sin el propio local', () => {
  const o = { id: 'a', lat: 35.7595, lng: -5.834 };
  assert.ok(Math.abs(distancia(35.7595, -5.834, 35.7685, -5.834) - 1001) < 5);   // ~1 km por 0,009° de latitud
  const r = masCercanos(o, [o, { id: 'b', lat: 35.7605, lng: -5.834 }, { id: 'c', lat: 35.77, lng: -5.834 }, { id: 'lejos', lat: 35.9, lng: -5.834 }]);
  assert.deepEqual(r.map((x) => x.id), ['b', 'c']);
});

test('cómo llegar sin API; sitemap con hreflang es/en/fr y x-default; robots', () => {
  assert.equal(comoLlegar(35.7595, -5.834).google, 'https://www.google.com/maps/dir/?api=1&destination=35.7595,-5.834');
  const xml = sitemapXml([{ loc: 'https://tablemaroc.com/es/x/', lastmod: '2026-11-05', alternativas: { es: 'https://tablemaroc.com/es/x/', fr: 'https://tablemaroc.com/fr/x/', 'x-default': 'https://tablemaroc.com/es/x/' } }]);
  assert.ok(xml.includes('hreflang="x-default"') && xml.includes('hreflang="fr"') && !xml.includes('hreflang="ar"'));
  const rb = robotsTxt('https://tablemaroc.com');
  assert.ok(rb.includes('Disallow: /api/') && rb.includes('Disallow: /panel/') && rb.includes('Sitemap: https://tablemaroc.com/sitemap.xml'));
});

test('una respuesta con cookie nunca se guarda: el Worker la marca «private, no-store» (el Service Worker no ve Set-Cookie)', async () => {
  const { withSecurityHeaders } = await import('../cloudflare/src/lib/seguridad.ts');
  const r = withSecurityHeaders(new Response('x', { headers: { 'Set-Cookie': '__Host-tm_sesion=abc; Path=/', 'Cache-Control': 'public, max-age=60' } }));
  assert.equal(r.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(withSecurityHeaders(new Response('x', { headers: { 'Cache-Control': 'public, max-age=60' } })).headers.get('Cache-Control'), 'public, max-age=60');
});

test('versión de prueba (workers.dev): robots.txt cierra todo el sitio', async () => {
  const { servirSeo } = await import('../cloudflare/src/lib/seo.ts');
  const prueba = await servirSeo(new URL('https://x.workers.dev/robots.txt'), {} as D1Database, 'https://x.workers.dev', false);
  assert.equal(await prueba!.text(), 'User-agent: *\nDisallow: /\n');
  const prod = await servirSeo(new URL('https://tablemaroc.com/robots.txt'), {} as D1Database, 'https://tablemaroc.com', true);
  assert.ok((await prod!.text()).includes('Sitemap: https://tablemaroc.com/sitemap.xml'));
});

// ───────────── Emails con Brevo (§8, §18, §18 bis) ─────────────
import { enviar, mensajeCodigo, mensajeReserva } from '../cloudflare/src/lib/email.ts';

test('email del código en es/en/fr, con caducidad y sin enlaces', () => {
  for (const [l, palabra] of [['es', 'Caduca'], ['en', 'expires'], ['fr', 'expire']] as const) {
    const m = mensajeCodigo('123456', l);
    assert.ok(m.asunto.includes('123456') && m.texto.includes('123456') && m.html.includes(`lang="${l}"`) && m.texto.includes(palabra));
    assert.ok(!m.html.includes('<a ') && !m.html.includes('<img'));                 // sin enlaces ni píxeles de seguimiento
  }
});

test('aviso de reserva en el idioma del cliente y sin inyección de HTML', () => {
  const m = mensajeReserva('confirmada', 'Café <script>x</script>', '2026-12-01T13:30', 2, 'fr');
  assert.ok(m.asunto.includes('confirmée') && m.texto.includes('2 personnes') && m.texto.includes('2026-12-01 13:30'));
  assert.ok(!m.html.includes('<script>') && m.html.includes('&lt;script&gt;'));
  assert.ok(mensajeReserva('no_disponible', 'X', '2026-12-01T13:30', 1, 'es').texto.includes('1 persona'));
});

test('envío a Brevo: API transaccional, sin crear contactos; sin clave en producción → error claro', async () => {
  const llamadas: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => { llamadas.push({ url, init }); return new Response('{"messageId":"x"}', { status: 201 }); }) as typeof fetch;
  try {
    const env = { EMAIL_API_KEY: 'clave-de-prueba', SITE_URL: 'https://tablemaroc.com' } as unknown as Env;
    await enviar(env, 'ana@example.test', mensajeCodigo('654321', 'es'), 'codigo-acceso');
    assert.equal(llamadas[0]!.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal((llamadas[0]!.init.headers as Record<string, string>)['api-key'], 'clave-de-prueba');
    const cuerpo = JSON.parse(String(llamadas[0]!.init.body));
    assert.deepEqual(cuerpo.to, [{ email: 'ana@example.test' }]);
    assert.equal(cuerpo.sender.email, 'no-reply@tablemaroc.com');
    assert.ok(!('listIds' in cuerpo) && !('attributes' in cuerpo));                // no se añade a ninguna lista de contactos
    await assert.rejects(enviar({ SITE_URL: 'https://tablemaroc.com' } as unknown as Env, 'x@example.test', mensajeCodigo('1', 'es'), 't'), /EMAIL_API_KEY/);
  } finally { globalThis.fetch = original; }
});
