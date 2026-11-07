/**
 * Caché en memoria de los datos PÚBLICOS (Fase 6): evita repetir decenas de consultas a Supabase en cada visita.
 * Solo para contenido público, nunca datos de un usuario. Dura 60 s y se vacía al guardar algo en el panel o en una reseña,
 * así que un cambio se ve al momento. Vale para un único proceso, que es como se despliega la web.
 * Se guarda en globalThis porque Next.js puede cargar este módulo más de una vez en el mismo proceso.
 */
export const TTL_MS = 60_000;
const MAX_ENTRIES = 5000;

interface Entry { at: number; value: Promise<unknown> }
const store = ((globalThis as unknown as { __tablemarocCache?: Map<string, Entry> }).__tablemarocCache ??= new Map<string, Entry>());

export function cached<T>(key: string, load: () => Promise<T>, now = Date.now()): Promise<T> {
  const hit = store.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.value as Promise<T>;
  if (store.size >= MAX_ENTRIES) store.clear();
  const value = load();
  store.set(key, { at: now, value });
  // Un error no se guarda: la siguiente visita lo reintenta.
  value.catch(() => { if (store.get(key)?.value === value) store.delete(key); });
  return value;
}

export const clearContentCache = () => store.clear();
