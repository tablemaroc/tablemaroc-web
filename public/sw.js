/* Service Worker de Tablemaroc — docs/10-politica-pwa-conectividad.md
 *
 * 1) Cache-First: iconos, CSS críticos, fuentes y página principal de guías gastronómicas
 *    (con revalidación en segundo plano para que no quede obsoleta).
 * 2) Network-First: fichas de restaurantes y menús digitales; si falla la red, se sirve la
 *    última copia guardada en IndexedDB (máximo 20 páginas, política LRU).
 * 3) Versionado: las cachés llevan la versión en el nombre; al activar una versión nueva se
 *    borran las cachés y las copias de IndexedDB de versiones anteriores.
 *    Una versión nueva queda en espera hasta recibir {type:'SKIP_WAITING'} desde la página.
 *
 * SUBIR `VERSION` en cada despliegue que cambie este archivo o los recursos estáticos
 * (idealmente inyectada por el build).
 * Privacidad: solo se guardan GET públicas y cacheables; nunca rutas de cuenta/admin/API, ni
 * respuestas con cookies o `Cache-Control: private/no-store`.
 * Rutas: las inyecta codigo/frontend/scripts/prepare-sw.mjs desde codigo/shared/routes.ts (secciones traducidas
 * es/en/fr, decisión del 29-10-2026). Los valores de abajo son los de reserva (solo español) para usar el archivo tal cual.
 */
const VERSION = 'v2';
const CACHE_PREFIX = 'tablemaroc-';
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const DB_NAME = 'tablemaroc-offline';
const DB_STORE = 'pages';
const MAX_PAGES = 20; // decisión 29-10-2026

const LOCALES = '(es|en|fr)';
const PLACE_SEGMENTS = '(restaurantes)'; // inyectado en el build: todos los tipos de lugar en los tres idiomas
const GUIDES_SEGMENTS = '(guias-gastronomicas)'; // inyectado en el build
const MENU_SEGMENT = 'menu';
const GUIDES_HOME = new RegExp(`^/${LOCALES}/${GUIDES_SEGMENTS}/?$`);
const NETWORK_FIRST = [
  new RegExp(`^/${LOCALES}/${PLACE_SEGMENTS}/[^/]+/?$`),
  new RegExp(`^/${LOCALES}/${PLACE_SEGMENTS}/[^/]+/${MENU_SEGMENT}/?$`),
];
const STATIC_PATHS = [/^\/icons\//, /^\/_next\/static\//, /^\/fonts\//];
const EXCLUDED = [/^\/api\//, /^\/admin/, /^\/auth/, /^\/cuenta/, /^\/account/];

/* ---------- IndexedDB ---------- */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { keyPath: 'url' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(DB_STORE, mode);
    const out = fn(t.objectStore(DB_STORE));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

/** Guarda una página y aplica LRU: se conservan como máximo MAX_PAGES, las más recientemente usadas. */
async function savePage(url, response) {
  const body = await response.text();
  const db = await openDb();
  try {
    const now = Date.now();
    await tx(db, 'readwrite', (s) => s.put({
      url, body, version: VERSION, status: response.status,
      contentType: response.headers.get('content-type') || 'text/html; charset=utf-8',
      savedAt: now, lastAccess: now,
    }));
    const all = (await tx(db, 'readonly', (s) => s.getAll())) || [];
    if (all.length > MAX_PAGES) {
      const evict = all.sort((a, b) => a.lastAccess - b.lastAccess).slice(0, all.length - MAX_PAGES);
      await tx(db, 'readwrite', (s) => { evict.forEach((r) => s.delete(r.url)); });
    }
  } finally { db.close(); }
}

/** Lee una página offline y la marca como usada (LRU). Ignora copias de otra versión. */
async function loadPage(url) {
  const db = await openDb();
  try {
    const rec = await tx(db, 'readonly', (s) => s.get(url));
    if (!rec || rec.version !== VERSION) return null;
    await tx(db, 'readwrite', (s) => s.put({ ...rec, lastAccess: Date.now() }));
    return new Response(rec.body, {
      status: rec.status,
      headers: { 'content-type': rec.contentType, 'x-tablemaroc-offline': String(rec.savedAt) },
    });
  } finally { db.close(); }
}

/** Borra las copias guardadas por otras versiones. */
async function purgeOldPages() {
  const db = await openDb();
  try {
    const all = (await tx(db, 'readonly', (s) => s.getAll())) || [];
    const old = all.filter((r) => r.version !== VERSION);
    if (old.length) await tx(db, 'readwrite', (s) => { old.forEach((r) => s.delete(r.url)); });
  } finally { db.close(); }
}

/* ---------- Criterios ---------- */
function isStorable(response) {
  if (!response || !response.ok || response.type === 'opaque') return false;
  if (response.headers.has('set-cookie')) return false;
  const cc = (response.headers.get('cache-control') || '').toLowerCase();
  return !/(no-store|private)/.test(cc);
}
const matches = (list, path) => list.some((re) => re.test(path));

/* ---------- Estrategias ---------- */
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => { if (isStorable(res)) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  if (cached) return cached;
  return (await refresh) || offlineResponse();
}

async function networkFirst(request) {
  const key = new URL(request.url).pathname;
  try {
    const res = await fetch(request);
    if (isStorable(res)) savePage(key, res.clone()).catch(() => {});
    return res;
  } catch (_) {
    return (await loadPage(key).catch(() => null)) || offlineResponse();
  }
}

function offlineResponse() {
  return new Response('Sin conexión / Offline / Hors ligne', {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

/* ---------- Ciclo de vida ---------- */
// install: NO se hace skipWaiting automático; la página decide (mensaje SKIP_WAITING).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== STATIC_CACHE).map((k) => caches.delete(k)));
    await purgeOldPages().catch(() => {});
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (matches(EXCLUDED, path)) return;

  if (matches(STATIC_PATHS, path) || GUIDES_HOME.test(path) ||
      request.destination === 'style' || request.destination === 'font') {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate' && matches(NETWORK_FIRST, path)) {
    event.respondWith(networkFirst(request));
  }
});
