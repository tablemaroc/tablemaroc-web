import type { Locale } from '../codigo/shared/locales.ts';

export const SITE_URL = 'https://tablemaroc.com';
export const SITE_NAME = 'Tablemaroc';

/** Una versión de idioma de una página. */
export interface PageVersion {
  locale: Locale;
  /** Ruta sin idioma, p. ej. "restaurantes/cafe-hafa". Puede variar por idioma si el slug se traduce. */
  path: string;
  /** Resultado del Quality Gate para este idioma (maestro §4). */
  isIndexable: boolean;
  /** Traducción en estado `publicada` (maestro §3). */
  translationPublished: boolean;
  title: string;
  description: string;
}
