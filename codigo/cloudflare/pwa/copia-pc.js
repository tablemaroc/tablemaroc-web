/* Copia externa en el PC del titular (maestro §9 y §20): botón «Crear copia» y «Restaurar desde archivo» del panel.
 * Completa (base de datos + fotos), CIFRADA en el propio navegador y guardada en una carpeta del PC elegida una vez.
 * Cada copia SUSTITUYE a la anterior: siempre el mismo archivo. El navegador lo escribe aparte y solo lo cambia por el
 * anterior al terminar bien, así que si algo falla a mitad la copia anterior sigue intacta.
 * Funciona en Chrome y Edge de escritorio (API de acceso a archivos). La interfaz la pone el diseño (§19): aquí solo la lógica.
 *
 * Cifrado: AES-GCM 256 con una clave derivada de la contraseña de copia (PBKDF2-SHA-256, 600 000 iteraciones, sal aleatoria).
 * La clave se guarda en el navegador como NO extraíble (no se puede leer ni copiar); la contraseña no se guarda nunca.
 * Formato del archivo: «TMCOPIA1» + sal (16 bytes) y después bloques [tipo (1) · longitud (4) · iv (12) · datos cifrados].
 * Cada bloque se cifra con su número de orden como dato autenticado: no se pueden quitar, cambiar ni reordenar sin que se note.
 *   tipo 1 = base de datos (JSON) · tipo 2 = una foto (clave + bytes) · tipo 0 = fin (lleva el número de fotos).
 */
(() => {
  const ARCHIVO = 'tablemaroc-copia.tmcopia';
  const MAGIA = new TextEncoder().encode('TMCOPIA1');
  const ITERACIONES = 600000;
  const MIN_CONTRASENA = 12;
  const BD = 'tablemaroc-copia';
  const ALMACEN = 'ajustes';

  // ---------- Ajustes guardados en este navegador (carpeta y clave no extraíble) ----------
  const abrir = () => new Promise((ok, mal) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
    r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
  });
  const leerAjustes = async () => { const db = await abrir(); try { return await new Promise((ok) => { const g = db.transaction(ALMACEN).objectStore(ALMACEN).get('ajustes'); g.onsuccess = () => ok(g.result || null); g.onerror = () => ok(null); }); } finally { db.close(); } };
  const guardarAjustes = async (v) => { const db = await abrir(); try { await new Promise((ok, mal) => { const t = db.transaction(ALMACEN, 'readwrite'); t.objectStore(ALMACEN).put(v, 'ajustes'); t.oncomplete = ok; t.onerror = () => mal(t.error); }); } finally { db.close(); } };

  async function derivarClave(contrasena, sal, extraible = false) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACIONES }, base,
      { name: 'AES-GCM', length: 256 }, extraible, ['encrypt', 'decrypt']);
  }
  const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };

  async function permisoCarpeta(carpeta) {
    if (!carpeta.queryPermission) return true;   // carpetas internas del navegador: no tienen permisos que pedir
    const opciones = { mode: 'readwrite' };
    if ((await carpeta.queryPermission?.(opciones)) === 'granted') return true;
    return (await carpeta.requestPermission?.(opciones)) === 'granted';
  }

  async function api(ruta, init) {
    const r = await fetch(ruta, { credentials: 'same-origin', ...init });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `Error ${r.status} en ${ruta}`); }
    return r;
  }

  /** Primera vez: elegir carpeta (o pasarla, p. ej. en pruebas) y poner la contraseña de copia. */
  async function configurar({ contrasena, carpeta } = {}) {
    if (typeof contrasena !== 'string' || contrasena.length < MIN_CONTRASENA) throw new Error(`La contraseña de copia debe tener al menos ${MIN_CONTRASENA} caracteres`);
    if (!carpeta) {
      if (!window.showDirectoryPicker) throw new Error('Este navegador no permite guardar en una carpeta: usa Chrome o Edge en el ordenador');
      carpeta = await window.showDirectoryPicker({ id: 'tablemaroc-copias', mode: 'readwrite', startIn: 'documents' });
    }
    if (!(await permisoCarpeta(carpeta))) throw new Error('Sin permiso para escribir en esa carpeta');
    const sal = crypto.getRandomValues(new Uint8Array(16));
    const clave = await derivarClave(contrasena, sal, false);   // no extraíble
    await guardarAjustes({ carpeta, clave, sal, configurada: new Date().toISOString() });
    return { carpeta: carpeta.name };
  }

  const estaConfigurada = async () => { const a = await leerAjustes(); return !!(a && a.carpeta && a.clave); };

  /** «Crear copia»: exporta, cifra y sustituye el archivo de la carpeta. `progreso(hechas, total)` para la barra. */
  async function crearCopia({ progreso } = {}) {
    const a = await leerAjustes();
    if (!a) throw new Error('Primero configura la carpeta y la contraseña de copia');
    if (!(await permisoCarpeta(a.carpeta))) throw new Error('Sin permiso para escribir en la carpeta de copias');
    const datos = await (await api('/api/panel/copias/exportar/')).json();
    const archivo = await a.carpeta.getFileHandle(ARCHIVO, { create: true });
    const w = await archivo.createWritable();   // se escribe aparte; el anterior solo se sustituye al cerrar bien
    let n = 0;
    const bloque = async (tipo, plano) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: u32(n) }, a.clave, plano));
      await w.write(new Uint8Array([tipo])); await w.write(u32(cifrado.length)); await w.write(iv); await w.write(cifrado);
      n++;
    };
    try {
      await w.write(MAGIA); await w.write(a.sal);
      await bloque(1, new TextEncoder().encode(JSON.stringify({ formato: 1, creada: new Date().toISOString(), volcado: datos.volcado })));
      let hechas = 0;
      const faltan = [];
      for (const key of datos.fotos) {
        const r = await fetch(`/api/panel/copias/foto/?key=${encodeURIComponent(key)}`, { credentials: 'same-origin' });
        if (r.ok) {
          const k = new TextEncoder().encode(key);
          const bytes = new Uint8Array(await r.arrayBuffer());
          const plano = new Uint8Array(2 + k.length + bytes.length);
          new DataView(plano.buffer).setUint16(0, k.length, true); plano.set(k, 2); plano.set(bytes, 2 + k.length);
          await bloque(2, plano);
        } else faltan.push(key);
        progreso?.(++hechas, datos.fotos.length);
      }
      await bloque(0, new TextEncoder().encode(JSON.stringify({ fotos: n - 1 })));
      await w.close();
      return { archivo: ARCHIVO, carpeta: a.carpeta.name, fotos: n - 2, fotosQueNoSeHanPodidoCopiar: faltan, fecha: new Date().toISOString() };
    } catch (e) {
      await w.abort?.().catch(() => {});   // no se toca la copia anterior
      throw e;
    }
  }

  /** Lee y descifra un archivo de copia. Cualquier cambio, recorte o contraseña errónea hace fallar la lectura. */
  async function leerCopia(archivo, contrasena) {
    const buf = new Uint8Array(await archivo.arrayBuffer());
    if (buf.length < 24 || MAGIA.some((b, i) => buf[i] !== b)) throw new Error('No es una copia de Tablemaroc');
    const clave = await derivarClave(contrasena, buf.slice(8, 24));
    let o = 24, n = 0, base = null, fin = null;
    const fotos = [];
    while (o < buf.length) {
      if (o + 17 > buf.length) throw new Error('La copia está incompleta');
      const tipo = buf[o];
      const largo = new DataView(buf.buffer, buf.byteOffset + o + 1, 4).getUint32(0, true);
      const iv = buf.slice(o + 5, o + 17);
      const cifrado = buf.slice(o + 17, o + 17 + largo);
      if (cifrado.length !== largo) throw new Error('La copia está incompleta');
      let plano;
      try { plano = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: u32(n) }, clave, cifrado)); }
      catch { throw new Error(n === 0 ? 'Contraseña de copia incorrecta' : 'La copia está dañada o se ha modificado'); }
      if (tipo === 1 && n === 0) base = JSON.parse(new TextDecoder().decode(plano));
      else if (tipo === 2) { const kl = new DataView(plano.buffer).getUint16(0, true); fotos.push({ key: new TextDecoder().decode(plano.slice(2, 2 + kl)), bytes: plano.slice(2 + kl) }); }
      else if (tipo === 0) { fin = JSON.parse(new TextDecoder().decode(plano)); o += 17 + largo; n++; break; }
      else throw new Error('La copia está dañada o se ha modificado');
      o += 17 + largo; n++;
    }
    if (!base || !fin || fin.fotos !== fotos.length || o !== buf.length) throw new Error('La copia está incompleta o se ha modificado');
    return { creada: base.creada, volcado: base.volcado, fotos };
  }

  /** «Restaurar desde archivo»: descifra en el PC, restaura la base (con RESTAURAR + código o huella) y repone fotos que falten. */
  async function restaurarDesdeArchivo(archivo, contrasena, confirmacion, { progreso } = {}) {
    const c = await leerCopia(archivo, contrasena);
    const r = await (await api('/api/panel/copias/restaurar-archivo/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...confirmacion, volcado: c.volcado }),
    })).json();
    let repuestas = 0, hechas = 0;
    for (const f of c.fotos) {
      const p = await fetch(`/api/panel/copias/foto/?key=${encodeURIComponent(f.key)}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'image/webp' }, body: f.bytes });
      if (p.status === 201) repuestas++;
      progreso?.(++hechas, c.fotos.length);
    }
    return { ...r, creada: c.creada, fotosEnLaCopia: c.fotos.length, fotosRepuestas: repuestas };
  }

  /** Olvidar la carpeta y la clave de este navegador (p. ej. al cambiar de PC). No borra el archivo de copia. */
  const olvidar = () => new Promise((ok) => { const r = indexedDB.deleteDatabase(BD); r.onsuccess = r.onerror = r.onblocked = () => ok(); });

  window.tablemarocCopia = { configurar, estaConfigurada, crearCopia, leerCopia, restaurarDesdeArchivo, olvidar, ARCHIVO, MIN_CONTRASENA };
})();
