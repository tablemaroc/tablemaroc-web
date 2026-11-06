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
