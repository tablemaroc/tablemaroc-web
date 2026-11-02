// node --test codigo/testing/base-indexing.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicates, jaccard } from '../base-indexing/similarity.ts';
import { weekToSpecification } from '../shared/week.ts';
import { evaluateQualityGate, type GateInput } from '../base-indexing/quality-gate.ts';
import { buildSitemaps, buildSitemapXml } from '../base-indexing/sitemap.ts';
import { buildRobotsTxt } from '../base-indexing/robots.ts';

const place: GateInput = {
  entity: 'place', locale: 'es', status: 'publicado', translationPublished: true, descriptionChars: 320,
  duplicateDetected: false, factsVerified: true, metadataValid: true, lat: 35.78, lng: -5.81, cityAssigned: true,
  approvedPhotos: 1, approvedPhotosWithAlt: 1, inboundLinks: 1, outboundLinks: 2,
};
test('lugar completo: APTO', () => {
  const r = evaluateQualityGate(place);
  assert.equal(r.result, 'APTO'); assert.equal(r.isIndexable, true);
});
test('lugar con fallos: NO APTO y motivos', () => {
  const r = evaluateQualityGate({ ...place, descriptionChars: 100, outboundLinks: 1, approvedPhotosWithAlt: 0, lat: null });
  assert.equal(r.result, 'NO APTO'); assert.equal(r.isIndexable, false); assert.equal(r.failures.length, 4);
});
test('dato no comprobado: PENDIENTE, nunca APTO', () => {
  const r = evaluateQualityGate({ ...place, duplicateDetected: null });
  assert.equal(r.result, 'PENDIENTE'); assert.equal(r.isIndexable, false);
});
test('un fallo prevalece sobre lo pendiente', () => {
  assert.equal(evaluateQualityGate({ ...place, duplicateDetected: null, status: 'borrador' }).result, 'NO APTO');
});
test('verificación reciente solo se evalúa si se define el máximo', () => {
  const now = new Date('2026-10-29');
  assert.equal(evaluateQualityGate({ ...place, verifiedAt: '2020-01-01' }, { now }).result, 'APTO');
  assert.equal(evaluateQualityGate({ ...place, verifiedAt: '2020-01-01' }, { now, maxVerificationAgeDays: 365 }).result, 'NO APTO');
  assert.equal(evaluateQualityGate({ ...place, verifiedAt: null }, { now, maxVerificationAgeDays: 365 }).result, 'PENDIENTE');
});
test('plato no exige coordenadas; guía exige 3 relaciones, 2 fotos y autoría', () => {
  const dish = { entity: 'dish', locale: 'fr', status: 'publicado', translationPublished: true, descriptionChars: 300, duplicateDetected: false, metadataValid: true, relations: 1, approvedPhotos: 1, approvedPhotosWithAlt: 1, outboundLinks: 1 } as GateInput;
  assert.equal(evaluateQualityGate(dish).result, 'APTO');
  const guide = { ...dish, entity: 'guide', descriptionChars: 500, relations: 2, approvedPhotos: 1, approvedPhotosWithAlt: 1 } as GateInput;
  assert.equal(evaluateQualityGate(guide).failures.length, 3);
});
test('menú: categoría publicada sin artículos falla', () => {
  const menu = { entity: 'menu', locale: 'en', status: 'publicado', translationPublished: true, descriptionChars: 200, duplicateDetected: false, metadataValid: true,
    menu: { placePublished: true, categories: [{ published: true, publishedItems: 0 }], pricesVerifiedOrMarkedPending: true } } as GateInput;
  assert.equal(evaluateQualityGate(menu).result, 'NO APTO');
});
test('sitemap: escapa XML, incluye hreflang y divide en índice', () => {
  const xml = buildSitemapXml([{ url: 'https://tablemaroc.com/es/a&b/', alternates: { en: 'https://tablemaroc.com/en/a/' } }]);
  assert.ok(xml.includes('a&amp;b') && xml.includes('hreflang="en"'));
  const r = buildSitemaps([{ url: 'u1' }, { url: 'u2' }, { url: 'u3' }], 2);
  assert.deepEqual(Object.keys(r.files), ['sitemap-1.xml', 'sitemap-2.xml']); assert.ok(r.index);
});
test('robots.txt: bloquea admin/api y declara el sitemap', () => {
  const t = buildRobotsTxt();
  assert.ok(t.includes('Disallow: /admin') && t.includes('Sitemap: https://tablemaroc.com/sitemap.xml'));
});

test('duplicidad interna: detecta textos casi iguales e ignora los muy cortos', () => {
  const base = Array.from({ length: 60 }, (_, i) => `palabra${i}`).join(' ');
  const other = Array.from({ length: 60 }, (_, i) => `distinta${i}`).join(' ');
  const dup = findDuplicates([{ id: 'a', text: base }, { id: 'b', text: `${base} final` }, { id: 'c', text: other }]);
  assert.deepEqual([...dup].sort(), ['a', 'b']);
  assert.equal(findDuplicates([{ id: 'a', text: 'tres palabras solo' }, { id: 'b', text: 'tres palabras solo' }]).size, 0);
  assert.equal(jaccard(new Set(), new Set()), 0);
});

test('horario para datos estructurados: un tramo por entrada y días cerrados fuera', () => {
  assert.deepEqual(weekToSpecification({ mon: '9:00–13:00, 16:00–20:00', tue: '' }), [
    { dayOfWeek: 'Monday', opens: '09:00', closes: '13:00' }, { dayOfWeek: 'Monday', opens: '16:00', closes: '20:00' },
  ]);
  assert.deepEqual(weekToSpecification(null), []);
});
