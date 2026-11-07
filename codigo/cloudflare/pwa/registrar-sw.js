/* Registro del Service Worker (maestro §15). Archivo propio: la política de seguridad no admite scripts en línea.
 * Expone window.tablemarocPwa para las islas (favoritos, login) y avisa con eventos, sin interfaz propia
 * (la pondrá el diseño): 'tablemaroc:actualizacion' (hay versión nueva en espera) y 'tablemaroc:conexion' (en línea / sin red).
 */
(() => {
  if (!('serviceWorker' in navigator)) return;
  const avisar = (nombre, detalle) => window.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
  const enviar = async (msg) => { const r = await navigator.serviceWorker.ready; r.active && r.active.postMessage(msg); };

  window.tablemarocPwa = {
    /** Aplica la versión nueva en espera (tras avisar al usuario) y recarga una sola vez. */
    actualizar: async () => {
      const r = await navigator.serviceWorker.getRegistration();
      if (!r || !r.waiting) return false;
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      r.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    },
    /** Guarda en el dispositivo la lista de favoritos (GET /api/cuenta/favoritos) para verla sin conexión (§12). */
    guardarFavoritos: (favoritos) => enviar({ type: 'GUARDAR_FAVORITOS', favoritos }),
    /** Al salir o borrar la cuenta: borra todo lo guardado en este dispositivo (privacidad, §10). */
    borrarDatosLocales: () => enviar({ type: 'BORRAR_DATOS_LOCALES' }),
    /** Lee los favoritos guardados en el dispositivo (para «Mi cuenta → Favoritos» sin conexión). */
    favoritosSinConexion: () => new Promise((resolve) => {
      const req = indexedDB.open('tablemaroc-offline');
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('favoritos')) { db.close(); return resolve([]); }
        const g = db.transaction('favoritos', 'readonly').objectStore('favoritos').getAll();
        g.onsuccess = () => { db.close(); resolve(g.result || []); };
        g.onerror = () => { db.close(); resolve([]); };
      };
    }),
  };

  window.addEventListener('online', () => avisar('tablemaroc:conexion', { enLinea: true }));
  window.addEventListener('offline', () => avisar('tablemaroc:conexion', { enLinea: false }));

  window.addEventListener('load', async () => {
    try {
      const r = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const vigilar = (w) => w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) avisar('tablemaroc:actualizacion', {});
      });
      if (r.waiting && navigator.serviceWorker.controller) avisar('tablemaroc:actualizacion', {});
      vigilar(r.installing);
      r.addEventListener('updatefound', () => vigilar(r.installing));
    } catch (_) { /* sin Service Worker la web sigue funcionando con red */ }
  });
})();
