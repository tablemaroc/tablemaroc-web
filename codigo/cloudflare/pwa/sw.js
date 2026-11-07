/* Service Worker de Tablemaroc en Cloudflare — maestro §12 y §15; docs/10-politica-pwa-conectividad.md.
 * Basado en el Service Worker anterior (public/sw.js, ya probado en Chromium real) y adaptado a Astro y al panel nuevo.
 *
 * 1) Cache-First (con revalidación en segundo plano): iconos, CSS y JS de Astro (/_astro/), fuentes, manifiesto,
 *    página «Sin conexión» y la página principal de guías gastronómicas.
 * 2) Network-First: info del local y menú; si falla la red, la última copia de IndexedDB (máx. 20 páginas, LRU).
 *    Sin copia: página «Sin conexión» (es/en/fr) con estado 503.
 * 3) Favoritos sin conexión (§12): la página envía la lista ({type:'GUARDAR_FAVORITOS'}) y se guarda SOLO la ficha mínima
 *    (nombre, dirección, coordenadas, indicaciones) en un almacén aparte; no cuenta en el límite de 20 páginas.
 * 4) Versionado: las cachés llevan la versión; al activar una nueva se borran las cachés y las páginas de otras versiones.
 *    La versión nueva espera a {type:'SKIP_WAITING'} desde la página (sin recargas inesperadas).
 * 5) Privacidad: solo GET públicas y cacheables; nunca API, panel, acceso ni cuenta; nunca respuestas con Cache-Control
 *    private/no-store. OJO: el navegador NO deja ver Set-Cookie al Service Worker; por eso el Worker marca como
 *    «private, no-store» toda respuesta con cookie (src/lib/seguridad.ts) y las páginas no se personalizan en el servidor
 *    (lo personal lo cargan las islas desde la API). {type:'BORRAR_DATOS_LOCALES'} (al salir o borrar la cuenta) lo borra todo.
 *
 * Los valores entre comillas los inyecta scripts/preparar-pwa.mjs (VERSION y rutas traducidas desde shared/routes.ts).
 */
const VERSION = 'cf1';
const CACHE_PREFIX = 'tablemaroc-';
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const DB_NAME = 'tablemaroc-offline';
const DB_VERSION = 2;
const PAGES = 'pages';
const FAVORITOS = 'favoritos';
const MAX_PAGES = 20; // decisión del 29-10-2026
const OFFLINE_URL = '/sin-conexion';   // Cloudflare sirve sin-conexion.html aquí (quita .html; con la extensión, redirige)
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

const LOCALES = '(es|en|fr)';
const PLACE_SEGMENTS = '(restaurantes)';        // inyectado: todos los tipos de local en los tres idiomas
const GUIDES_SEGMENTS = '(guias-gastronomicas)'; // inyectado
const MENU_SEGMENT = 'menu';
const GUIDES_HOME = new RegExp(`^/${LOCALES}/${GUIDES_SEGMENTS}/?$`);
const NETWORK_FIRST = [
  new RegExp(`^/${LOCALES}/${PLACE_SEGMENTS}/[^/]+/?$`),
  new RegExp(`^/${LOCALES}/${PLACE_SEGMENTS}/[^/]+/${MENU_SEGMENT}/?$`),
];
const STATIC_PATHS = [/^\/icons\//, /^\/_astro\//, /^\/fonts\//, /^\/manifest\.webmanifest$/, /^\/sin-conexion$/];
const EXCLUDED = [/^\/api\//, /^\/panel\//, new RegExp(`^/${LOCALES}/acceso/`), new RegExp(`^/${LOCALES}/mi-cuenta/`)];

/* ---------- IndexedDB ---------- */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PAGES)) db.createObjectStore(PAGES, { keyPath: 'url' });
      if (!db.objectStoreNames.contains(FAVORITOS)) db.createObjectStore(FAVORITOS, { keyPath: 'place_id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

/** Guarda una página y aplica LRU: como máximo MAX_PAGES, las usadas más recientemente. */
async function savePage(url, response) {
  const body = await response.text();
  const db = await openDb();
  try {
    const now = Date.now();
    await tx(db, PAGES, 'readwrite', (s) => s.put({
      url, body, version: VERSION, status: response.status,
      contentType: response.headers.get('content-type') || 'text/html; charset=utf-8', savedAt: now, lastAccess: now,
    }));
    const all = (await tx(db, PAGES, 'readonly', (s) => s.getAll())) || [];
    if (all.length > MAX_PAGES) {
      const evict = all.sort((a, b) => a.lastAccess - b.lastAccess).slice(0, all.length - MAX_PAGES);
      await tx(db, PAGES, 'readwrite', (s) => { evict.forEach((r) => s.delete(r.url)); });
    }
  } finally { db.close(); }
}

/** Lee una página guardada y la marca como usada (LRU). Ignora copias de otra versión. */
async function loadPage(url) {
  const db = await openDb();
  try {
    const rec = await tx(db, PAGES, 'readonly', (s) => s.get(url));
    if (!rec || rec.version !== VERSION) return null;
    await tx(db, PAGES, 'readwrite', (s) => s.put({ ...rec, lastAccess: Date.now() }));
    return new Response(rec.body, { status: rec.status, headers: { 'content-type': rec.contentType, 'x-tablemaroc-offline': String(rec.savedAt) } });
  } finally { db.close(); }
}

async function purgeOldPages() {
  const db = await openDb();
  try {
    const all = (await tx(db, PAGES, 'readonly', (s) => s.getAll())) || [];
    const old = all.filter((r) => r.version !== VERSION);
    if (old.length) await tx(db, PAGES, 'readwrite', (s) => { old.forEach((r) => s.delete(r.url)); });
  } finally { db.close(); }
}

/** Favoritos: se sustituye la lista entera por la recibida; solo los campos necesarios para verlos sin conexión. */
const CAMPOS_FAVORITO = ['place_id', 'slug', 'tipo', 'ciudad', 'nombre', 'address', 'indicaciones', 'lat', 'lng', 'open_status'];
async function guardarFavoritos(lista) {
  const db = await openDb();
  try {
    await tx(db, FAVORITOS, 'readwrite', (s) => {
      s.clear();
      for (const f of (Array.isArray(lista) ? lista : []).slice(0, 500)) {
        if (!f || typeof f.place_id !== 'string') continue;
        s.put(Object.fromEntries(CAMPOS_FAVORITO.map((k) => [k, f[k] ?? null])));
      }
    });
  } finally { db.close(); }
}

async function borrarDatosLocales() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k)));
  await new Promise((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = r.onerror = r.onblocked = () => res(); });
}

/* ---------- Criterios ---------- */
function isStorable(response) {
  if (!response || !response.ok || response.type === 'opaque') return false;
  if (response.headers.has('set-cookie')) return false;   // casi nunca visible aquí: ver punto 5
  const cc = (response.headers.get('cache-control') || '').toLowerCase();
  return !/(no-store|private)/.test(cc);
}
const matches = (list, path) => list.some((re) => re.test(path));

/* ---------- Estrategias ---------- */
async function offlineResponse() {
  const cached = await caches.open(STATIC_CACHE).then((c) => c.match(OFFLINE_URL)).catch(() => null);
  if (cached) return new Response(cached.body, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
  return new Response('Sin conexión / Offline / Hors ligne', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((res) => { if (isStorable(res)) cache.put(request, res.clone()); return res; }).catch(() => null);
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

/* ---------- Ciclo de vida ---------- */
self.addEventListener('install', (event) => {
  // Sin skipWaiting automático: la página decide (SKIP_WAITING).
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'GUARDAR_FAVORITOS') event.waitUntil(guardarFavoritos(d.favoritos).catch(() => {}));
  else if (d.type === 'BORRAR_DATOS_LOCALES') event.waitUntil(borrarDatosLocales().catch(() => {}));
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
  if (matches(STATIC_PATHS, path) || GUIDES_HOME.test(path) || request.destination === 'style' || request.destination === 'font') {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate' && matches(NETWORK_FIRST, path)) {
    event.respondWith(networkFirst(request));
  }
});
