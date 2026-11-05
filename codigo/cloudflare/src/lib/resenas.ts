// Reseñas de usuarios (maestro §3, §18, §20). Reglas ya aprobadas y probadas del código anterior
// (backend/reviews/validate.ts y rating.ts): valoración 1-5, comentario ≤ 2000, fecha de visita no futura,
// 5 reseñas cada 24 h, 3 fotos por reseña y media SOLO con reseñas aprobadas. Más el tipo de viaje (01-11-2026).

import { checkReview, MAX_REVIEW_PHOTOS } from '../../../backend/reviews/validate.ts';
import { summarizeApproved } from '../../../backend/reviews/rating.ts';

export { MAX_REVIEW_PHOTOS, summarizeApproved };
export const RESENAS_POR_DIA = 5;
export const TIPOS_DE_VIAJE = ['pareja', 'familia', 'amigos', 'solo'] as const;

export type DatosResena = { rating: number; comment: string | null; locale: 'es' | 'en' | 'fr'; visited_on: string | null; trip_type: string | null };

export function validarResena(b: Record<string, unknown>, hoy = new Date()): { ok: true; datos: DatosResena } | { ok: false; campos: string[] } {
  const r = checkReview((k) => (k === 'rating' ? b.puntuacion : k === 'comment' ? b.comentario : k === 'visited_on' ? b.fechaVisita : b.idioma), hoy);
  const campos: string[] = [...r.errors];
  const tipo = b.tipoViaje === undefined || b.tipoViaje === null || b.tipoViaje === '' ? null : String(b.tipoViaje);
  if (tipo !== null && !(TIPOS_DE_VIAJE as readonly string[]).includes(tipo)) campos.push('trip_type');
  if (campos.length || !r.value) return { ok: false, campos };
  return { ok: true, datos: { ...r.value, trip_type: tipo } };
}

export const MENSAJES: Record<string, string> = {
  rating: 'Elige de 1 a 5 estrellas',
  comment: 'El comentario puede tener hasta 2000 caracteres',
  visited_on: 'La fecha de visita no puede ser futura',
  trip_type: 'Tipo de viaje: pareja, familia, amigos o solo',
};
