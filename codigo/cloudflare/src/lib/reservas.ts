// Reservas gestionadas (maestro §18 bis, §20). Lógica pura: se prueba sin base de datos.
// En modo Automático, una solicitud se confirma sola si encaja en los ajustes del local; si no, queda pendiente.

export type Franja = { dia: number; desde: string; hasta: string };   // dia: 0 = domingo … 6 = sábado
export type AjustesReserva = {
  accepts: boolean;
  slots: Franja[];
  maxParty: number;
  capacityPerSlot: number | null;   // personas por franja; nulo = sin límite de aforo configurado
  closedDays: string[];             // fechas YYYY-MM-DD
};
export type Solicitud = { fecha: string; hora: string; personas: number };   // hora local de Marruecos

export type Decision =
  | { estado: 'confirmada'; motivo: 'encaja' }
  | { estado: 'pendiente'; motivo: 'modo_manual' | 'fuera_de_franja' | 'dia_cerrado' | 'demasiadas_personas' | 'sin_aforo' };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Valida la solicitud del usuario. Devuelve el error o null. */
export function validarSolicitud(s: Solicitud, ajustes: AjustesReserva, ahoraMarruecos: Date): string | null {
  if (!ajustes.accepts) return 'El local no acepta reservas';
  if (!FECHA.test(s.fecha) || Number.isNaN(Date.parse(s.fecha))) return 'Fecha no válida';
  if (!HHMM.test(s.hora)) return 'Hora no válida';
  if (!Number.isInteger(s.personas) || s.personas < 1) return 'Número de personas no válido';
  const pedido = new Date(`${s.fecha}T${s.hora}:00Z`);       // las dos fechas en «hora de Marruecos como UTC»
  if (pedido.getTime() <= ahoraMarruecos.getTime()) return 'La fecha ya ha pasado';
  return null;
}

/** Decide si una solicitud válida se confirma sola. `ocupadas` = personas ya confirmadas en esa franja. */
export function decidir(s: Solicitud, ajustes: AjustesReserva, modo: 'automatico' | 'manual', ocupadas: number): Decision {
  if (modo === 'manual') return { estado: 'pendiente', motivo: 'modo_manual' };
  if (ajustes.closedDays.includes(s.fecha)) return { estado: 'pendiente', motivo: 'dia_cerrado' };
  if (s.personas > ajustes.maxParty) return { estado: 'pendiente', motivo: 'demasiadas_personas' };
  const dia = new Date(`${s.fecha}T12:00:00Z`).getUTCDay();
  const m = minutos(s.hora);
  const franja = ajustes.slots.find((f) => f.dia === dia && m >= minutos(f.desde) && m <= minutos(f.hasta));
  if (!franja) return { estado: 'pendiente', motivo: 'fuera_de_franja' };
  if (ajustes.capacityPerSlot !== null && ocupadas + s.personas > ajustes.capacityPerSlot) {
    return { estado: 'pendiente', motivo: 'sin_aforo' };
  }
  return { estado: 'confirmada', motivo: 'encaja' };
}

/** Transiciones permitidas (también las impone un trigger en D1). El usuario puede cancelar cuando quiera. */
export function transicionPermitida(de: string, a: string): boolean {
  if (de === 'pendiente') return ['confirmada', 'no_disponible', 'cancelada'].includes(a);
  if (de === 'confirmada') return a === 'cancelada';
  return false;
}

/** Hora actual en Marruecos expresada como Date «UTC» (Marruecos usa UTC+1 todo el año salvo en Ramadán, UTC+0). */
export function ahoraEnMarruecos(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
}

// Ajustes de reservas del propietario (§18 bis), validados antes de guardarlos.

export function validarAjustes(b: Record<string, unknown>): { error: string } | {
  acepta: boolean; franjas: Franja[]; maxPersonas: number; aforo: number | null; diasCerrados: string[];
} {
  if (typeof b.acepta !== 'boolean') return { error: '«Acepto reservas» debe ser sí o no' };
  const franjas = Array.isArray(b.franjas) ? b.franjas : null;
  if (!franjas || franjas.length > 50) return { error: 'Franjas no válidas' };
  for (const f of franjas as Franja[]) {
    if (!Number.isInteger(f?.dia) || f.dia < 0 || f.dia > 6 || !HHMM.test(f.desde) || !HHMM.test(f.hasta) || f.desde >= f.hasta) {
      return { error: 'Cada franja necesita día (0-6), desde y hasta (HH:MM), con desde < hasta' };
    }
  }
  const maxPersonas = Number(b.maxPersonas);
  if (!Number.isInteger(maxPersonas) || maxPersonas < 1 || maxPersonas > 100) return { error: 'Máximo de personas no válido' };
  const aforo = b.aforo === null || b.aforo === undefined ? null : Number(b.aforo);
  if (aforo !== null && (!Number.isInteger(aforo) || aforo < 1 || aforo > 1000)) return { error: 'Aforo no válido' };
  const dias = Array.isArray(b.diasCerrados) ? b.diasCerrados : [];
  if (dias.length > 366 || !dias.every((d) => typeof d === 'string' && FECHA.test(d))) return { error: 'Días cerrados no válidos (AAAA-MM-DD)' };
  if (b.acepta && !franjas.length) return { error: 'Para aceptar reservas hace falta al menos una franja' };
  return { acepta: b.acepta, franjas: franjas as Franja[], maxPersonas, aforo, diasCerrados: [...new Set(dias as string[])].sort() };
}

