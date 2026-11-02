// node --test codigo/testing/seo.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageMetadata, sitemapEntries, pageUrl } from '../../seo/metadata.ts';
import { restaurantJsonLd, breadcrumbJsonLd, toScriptJson } from '../../seo/json-ld.ts';
import type { PageVersion } from '../../seo/types.ts';

const v = (locale: 'es' | 'en' | 'fr', o: Partial<PageVersion> = {}): PageVersion => ({
  locale, path: 'restaurantes/cafe-hafa', isIndexable: true, translationPublished: true, title: 'T', description: 'D', ...o,
});

test('canónica y hreflang solo entre versiones publicadas e indexables', () => {
  const vs = [v('es'), v('en'), v('fr', { translationPublished: false })];
  const m = buildPageMetadata(vs[0], vs);
  assert.equal(m.alternates.canonical, 'https://tablemaroc.com/es/restaurantes/cafe-hafa');
  assert.deepEqual(Object.keys(m.alternates.languages).sort(), ['en', 'es']);
  assert.equal(m.robots.index, true);
});
test('sin Quality Gate: noindex, sin hreflang y fuera del sitemap', () => {
  const vs = [v('es', { isIndexable: false }), v('en')];
  const m = buildPageMetadata(vs[0], vs);
  assert.equal(m.robots.index, false);
  assert.deepEqual(m.alternates.languages, {});
  assert.deepEqual(sitemapEntries(vs).map((e) => e.url), [pageUrl('en', 'restaurantes/cafe-hafa')]);
});
test('una sola versión: sin hreflang', () => {
  const vs = [v('es')];
  assert.deepEqual(buildPageMetadata(vs[0], vs).alternates.languages, {});
});
test('JSON-LD no inventa datos y valoración solo con reseñas aprobadas', () => {
  const base = { name: 'Café Hafa', url: 'https://tablemaroc.com/es/restaurantes/cafe-hafa' };
  const a = restaurantJsonLd(base);
  for (const k of ['aggregateRating', 'geo', 'address', 'telephone', 'priceRange', 'openingHours']) assert.ok(!(k in a), k);
  assert.ok(!('aggregateRating' in restaurantJsonLd({ ...base, approvedReviews: { count: 0, average: 0 } })));
  const b = restaurantJsonLd({ ...base, lat: 35.78, lng: -5.81, approvedReviews: { count: 3, average: 4.333 } }) as any;
  assert.equal(b.aggregateRating.ratingValue, 4.3); assert.equal(b.geo.latitude, 35.78);
});
test('JSON-LD: breadcrumb y escape de </script>', () => {
  assert.equal(breadcrumbJsonLd([]), null);
  assert.ok(!toScriptJson({ x: '</script><b>' }).includes('</script>'));
});

test('canónica: sin barra final, la URL que sirve la web', () => {
  assert.equal(pageUrl('es', '/restaurantes/x/'), 'https://tablemaroc.com/es/restaurantes/x');
  assert.equal(pageUrl('fr', ''), 'https://tablemaroc.com/fr');
});
