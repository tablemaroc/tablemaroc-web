// Fotos (maestro §3, §10, §15): solo WebP, y SIN metadatos (EXIF/XMP, donde van la ubicación GPS y los datos de la cámara).
// La conversión y la reducción las hace el navegador antes de subir (isla «Escribir reseña», §18 ter); aquí se comprueba
// que el archivo es un WebP de verdad y se quitan los metadatos que pudieran quedar. Sin servicios de pago.

export const MAX_BYTES = 5 * 1024 * 1024;

export type ResultadoWebp = { ok: true; datos: Uint8Array<ArrayBuffer>; quitados: string[] } | { ok: false; error: string };

const fourcc = (b: Uint8Array, o: number) => String.fromCharCode(b[o]!, b[o + 1]!, b[o + 2]!, b[o + 3]!);
const u32 = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
const IMAGEN = new Set(['VP8 ', 'VP8L', 'ANMF']);
const METADATOS = new Set(['EXIF', 'XMP ']);

/** Valida el contenedor RIFF/WEBP y lo reconstruye sin los bloques EXIF y XMP (y sin sus marcas en VP8X). */
export function limpiarWebp(entrada: Uint8Array): ResultadoWebp {
  if (entrada.length < 20 || entrada.length > MAX_BYTES) return { ok: false, error: `La foto debe pesar menos de ${MAX_BYTES / 1024 / 1024} MB` };
  if (fourcc(entrada, 0) !== 'RIFF' || fourcc(entrada, 8) !== 'WEBP') return { ok: false, error: 'Solo se aceptan fotos WebP' };
  const declarado = u32(entrada, 4) + 8;
  if (declarado > entrada.length) return { ok: false, error: 'Archivo WebP incompleto' };

  const partes: Uint8Array[] = [];
  const quitados: string[] = [];
  let hayImagen = false;
  let o = 12;
  while (o + 8 <= declarado) {
    const id = fourcc(entrada, o);
    const tam = u32(entrada, o + 4);
    const fin = o + 8 + tam + (tam & 1);                 // los bloques se rellenan a tamaño par
    if (o + 8 + tam > declarado) return { ok: false, error: 'Archivo WebP dañado' };
    if (METADATOS.has(id)) { quitados.push(id.trim()); o = fin; continue; }
    const bloque = entrada.slice(o, Math.min(fin, declarado));
    if (id === 'VP8X' && tam >= 1) bloque[8] = bloque[8]! & ~0x0c;   // quita las marcas de EXIF (0x08) y XMP (0x04)
    if (IMAGEN.has(id)) hayImagen = true;
    partes.push(bloque);
    o = fin;
  }
  if (!hayImagen) return { ok: false, error: 'El WebP no contiene ninguna imagen' };

  const total = 12 + partes.reduce((s, p) => s + p.length, 0);
  const salida = new Uint8Array(new ArrayBuffer(total));
  salida.set([0x52, 0x49, 0x46, 0x46], 0);                           // RIFF
  new DataView(salida.buffer).setUint32(4, total - 8, true);
  salida.set([0x57, 0x45, 0x42, 0x50], 8);                           // WEBP
  let p = 12;
  for (const parte of partes) { salida.set(parte, p); p += parte.length; }
  return { ok: true, datos: salida, quitados };
}

/** Clave del objeto en R2: aleatoria (no revela nada) y con la carpeta del destino. */
export const claveFoto = (destino: string) => `fotos/${destino}/${crypto.randomUUID()}.webp`;

const RUTA_FOTO = /^\/fotos\/(locales|ciudades|platos|guias)\/[0-9a-f-]{36}\.webp$/;

/** GET /fotos/...: sirve desde R2 SOLO las fotos aprobadas (§3), con caché larga (la clave es única e inmutable).
 *  Mismo dominio: sin terceros (§16) y compatible con la política de seguridad (img-src 'self'). null = no es una foto. */
export async function servirFoto(url: URL, db: D1Database, r2: R2Bucket): Promise<Response | null> {
  if (!url.pathname.startsWith('/fotos/')) return null;
  const no = () => new Response('No encontrada', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  if (!RUTA_FOTO.test(url.pathname)) return no();
  const key = url.pathname.slice(1);
  if (!(await db.prepare(`SELECT 1 FROM photos WHERE r2_key = ? AND status = 'aprobada'`).bind(key).first())) return no();
  const obj = await r2.get(key);
  if (!obj) return no();
  return new Response(obj.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: obj.httpEtag } });
}
