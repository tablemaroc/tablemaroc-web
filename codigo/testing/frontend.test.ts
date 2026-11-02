// node --test codigo/testing/frontend.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLACE_SECTIONS, SEGMENTS, sectionFromSegment, sectionPath, segmentsAlternation } from '../shared/routes.ts';
import { languageLinks, translatePath } from '../frontend/i18n/alternates.ts';
import { contentSource } from '../backend/content/index.ts';
import { demoSource } from '../backend/content/demo-source.ts';
import { normalizeOpeningHours } from '../backend/content/types.ts';
import { cached, clearContentCache } from '../backend/content/cache.ts';

test('rutas: sección traducida por idioma; un segmento de otro idioma no vale', () => {
  assert.equal(sectionPath('en', 'restaurantes', 'x', 'menu'), '/en/restaurants/x/menu');
  assert.equal(sectionFromSegment('fr', 'villes'), 'ciudades-y-barrios');
  assert.equal(sectionFromSegment('en', 'restaurantes'), null);
  for (const l of ['es', 'en', 'fr'] as const) {
    const segs = Object.values(SEGMENTS).map((s) => s[l]);
    assert.equal(new Set(segs).size, segs.length, `segmentos repetidos en ${l}`);
  }
  const placeRe = new RegExp(`^${segmentsAlternation(PLACE_SECTIONS)}$`);
  assert.ok(['restaurantes', 'street-food', 'marches-et-souks'].every((x) => placeRe.test(x)));
  assert.ok(!placeRe.test('platos-tipicos'));
});

test('selector de idioma: traduce la sección, conserva el slug y no enlaza versiones sin publicar', () => {
  assert.equal(translatePath('/es/ciudades/tanger/medina', 'fr'), '/fr/villes/tanger/medina');
  assert.equal(translatePath('/es', 'en'), '/en');
  assert.equal(translatePath('/es/desconocida', 'en'), null);
  assert.deepEqual(languageLinks('/es/restaurantes/x', 'es', ['es', 'en']), [{ locale: 'en', href: '/en/restaurants/x' }, { locale: 'fr', href: '/fr' }]);
});

test('textos de interfaz: mismas claves en es, en y fr, y ninguna vacía', () => {
  const load = (l: string) => JSON.parse(readFileSync(new URL(`../frontend/i18n/messages/${l}.json`, import.meta.url), 'utf8'));
  const flat = (o: object, p = ''): [string, unknown][] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const [es, en, fr] = ['es', 'en', 'fr'].map((l) => flat(load(l)));
  const keys = (x: [string, unknown][]) => x.map(([k]) => k).sort();
  assert.deepEqual(keys(en), keys(es));
  assert.deepEqual(keys(fr), keys(es));
  for (const [k, v] of [...es, ...en, ...fr]) assert.ok(typeof v === 'string' && v.trim(), `texto vacío: ${k}`);
});

test('datos demo: prohibidos en producción; sin Supabase, origen vacío', async () => {
  assert.throws(() => contentSource({ TABLEMAROC_DEMO_DATA: '1', NODE_ENV: 'production' }), /no está permitido en producción/);
  assert.equal(contentSource({ TABLEMAROC_DEMO_DATA: '1', NODE_ENV: 'development' }).isDemo, true);
  assert.deepEqual(await contentSource({}).listPlaces('es'), []);
});

test('datos demo: todo lleva el prefijo demo- y una ficha sin francés no existe en /fr', async () => {
  const places = await demoSource.listPlaces('es');
  assert.ok(places.length > 0 && places.every((p) => p.slug.startsWith('demo-') && /^Demo/.test(p.name)));
  assert.equal(await demoSource.getPlace('fr', 'comida-callejera', 'demo-puesto'), null);
  const menu = await demoSource.getMenu('es', 'restaurantes', 'demo-restaurante');
  assert.ok(menu!.categories[0].items.some((i) => i.priceMad === null), 'el menú demo incluye un precio pendiente');
});

test('horario: formato por días del panel, con nombres traducidos y Cerrado si falta', () => {
  const week = normalizeOpeningHours({ mon: '9:00–13:00', sat: '' }, 'fr');
  assert.equal(week.length, 7);
  assert.deepEqual(week[0], ['Lundi', '9:00–13:00']);
  assert.deepEqual(week[5], ['Samedi', 'Fermé']);
});

test('horario: acepta objeto {día: texto} o lista, e ignora valores vacíos', () => {
  assert.deepEqual(normalizeOpeningHours({ lunes: '9-13', martes: '' }), [['lunes', '9-13']]);
  assert.deepEqual(normalizeOpeningHours(['Todos los días 9-20', 3]), [['', 'Todos los días 9-20']]);
  assert.deepEqual(normalizeOpeningHours(null), []);
});

test('caché pública: reutiliza 60 s, se vacía al guardar y no guarda errores', async () => {
  clearContentCache();
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await cached('k', load, 0), 1);
  assert.equal(await cached('k', load, 59_999), 1);
  assert.equal(await cached('k', load, 60_000), 2);
  clearContentCache();
  assert.equal(await cached('k', load, 60_001), 3);
  await assert.rejects(cached('e', async () => { throw new Error('x'); }, 0));
  await new Promise((r) => setImmediate(r));
  assert.equal(await cached('e', async () => 'bien', 1), 'bien');
});
