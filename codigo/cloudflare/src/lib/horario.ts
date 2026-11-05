// «Abierto ahora» (isla, maestro §18 ter) con la hora de Marruecos, y «Cerca de aquí» (§20). Lógica pura y probada.
// Horario por días (shared/week.ts): { mon: '9:00–13:00, 16:00–20:00', … }; día ausente = cerrado. Un tramo puede pasar
// de medianoche (20:00–02:00). Durante el Ramadán los horarios cambian: si el local tiene aviso de Ramadán, no se afirma
// nada («consultar»), porque no tenemos el horario real de esos días (no se inventan datos, §1).

import { WEEK, isWeekHours, type WeekHours } from '../../../shared/week.ts';

export type EstadoApertura = 'abierto' | 'cerrado' | 'sin_horario' | 'consultar_ramadan' | 'cerrado_temporalmente' | 'cerrado_definitivamente';

const min = (h: string) => { const [a, b] = h.split(':'); return Number(a) * 60 + Number(b); };
const tramos = (s: string | undefined) => (s ?? '').split(',').map((t) => t.trim().split(/[–-]/)).filter((p) => p.length === 2)
  .map(([a, b]) => [min(a!.trim()), min(b!.trim())] as const).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

/** ¿Es Ramadán en esta fecha? Calendario islámico de Intl (mes 9), sin servicios externos. */
export function esRamadan(fecha: Date): boolean {
  try {
    const mes = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: 'Africa/Casablanca' }).format(fecha);
    return Number(mes.replace(/\D/g, '')) === 9;
  } catch { return false; }
}

/** `marruecos`: fecha con la hora local de Marruecos expresada como UTC (ver ahoraEnMarruecos en reservas.ts). */
export function abiertoAhora(
  horario: unknown, marruecos: Date,
  opciones: { aperturaLocal?: string; avisoRamadan?: boolean; ramadan?: boolean } = {},
): EstadoApertura {
  if (opciones.aperturaLocal === 'cerrado_temporalmente') return 'cerrado_temporalmente';
  if (opciones.aperturaLocal === 'cerrado_definitivamente') return 'cerrado_definitivamente';
  const h: WeekHours | null = typeof horario === 'string' ? (() => { try { return JSON.parse(horario); } catch { return null; } })() : (horario as WeekHours);
  if (!isWeekHours(h)) return 'sin_horario';
  if (opciones.avisoRamadan && (opciones.ramadan ?? esRamadan(marruecos))) return 'consultar_ramadan';
  const dia = (marruecos.getUTCDay() + 6) % 7;                 // 0 = lunes, como WEEK
  const ahora = marruecos.getUTCHours() * 60 + marruecos.getUTCMinutes();
  for (const [a, b] of tramos(h[WEEK[dia]!])) {
    if (b > a ? ahora >= a && ahora < b : ahora >= a) return 'abierto';     // tramo normal o que pasa de medianoche (parte de hoy)
  }
  for (const [a, b] of tramos(h[WEEK[(dia + 6) % 7]!])) {
    if (b <= a && ahora < b) return 'abierto';                                // tramo de ayer que sigue tras la medianoche
  }
  return 'cerrado';
}

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000, rad = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** «Cerca de aquí»: los más cercanos, sin el propio local, hasta `max` y dentro de `radio` metros. */
export function masCercanos<T extends { id: string; lat: number; lng: number }>(origen: { id: string; lat: number; lng: number }, candidatos: T[], max = 6, radio = 3000) {
  return candidatos.filter((c) => c.id !== origen.id)
    .map((c) => ({ ...c, metros: distancia(origen.lat, origen.lng, c.lat, c.lng) }))
    .filter((c) => c.metros <= radio).sort((a, b) => a.metros - b.metros).slice(0, max);
}
