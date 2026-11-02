import { supabasePublicConfig } from '../supabase/env.ts';
import { demoSource } from './demo-source.ts';
import { supabaseSource } from './supabase-source.ts';
import type { ContentSource } from './types.ts';

export type * from './types.ts';

const emptySource: ContentSource = {
  isDemo: false,
  listPlaces: async () => [], getPlace: async () => null, getMenu: async () => null,
  listDishes: async () => [], getDish: async () => null, listGuides: async () => [], getGuide: async () => null,
  listCities: async () => [], getCity: async () => null, getNeighborhood: async () => null,
  seoInfo: async () => ({ indexableLocales: [], title: null, description: null }), listIndexable: async () => [],
};

/**
 * Origen de los datos públicos:
 * - TABLEMAROC_DEMO_DATA=1 (`npm run dev:demo`): datos ficticios de demostración. PROHIBIDO en producción: se lanza un error.
 * - Supabase configurado: datos reales (clave pública + RLS).
 * - Sin Supabase: vacío (la web arranca y muestra secciones vacías).
 */
export function contentSource(env: Record<string, string | undefined> = process.env): ContentSource {
  if (env.TABLEMAROC_DEMO_DATA === '1') {
    if (env.NODE_ENV === 'production') throw new Error('TABLEMAROC_DEMO_DATA=1 no está permitido en producción');
    return demoSource;
  }
  const config = supabasePublicConfig(env);
  return config ? supabaseSource(config) : emptySource;
}
