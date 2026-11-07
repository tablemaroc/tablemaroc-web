// Emails transaccionales con Brevo (decisión del titular, 05-11-2026; plan gratuito, 300 al día). Maestro §8, §18, §18 bis.
// API transaccional: solo se envía el correo; NO se guardan nuestros usuarios como contactos de Brevo (minimización, §10).
// Textos en es/en/fr, sin publicidad ni seguimiento (sin píxeles ni enlaces rastreados). Remitente: no-reply@tablemaroc.com.

export type Idioma = 'es' | 'en' | 'fr';
export const REMITENTE = { name: 'Tablemaroc', email: 'no-reply@tablemaroc.com' };
const BREVO = 'https://api.brevo.com/v3/smtp/email';

export class EmailPendiente extends Error {}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plantilla mínima, legible sin imágenes. El diseño definitivo lo da el diseño aprobado (§19). */
function html(titulo: string, parrafos: string[], idioma: Idioma): string {
  return `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(titulo)}</title></head>`
    + `<body style="font-family:Arial,sans-serif;color:#222;max-width:520px;margin:0 auto;padding:24px">`
    + `<p style="font-weight:bold;font-size:18px">Tablemaroc</p><h1 style="font-size:20px">${esc(titulo)}</h1>`
    + parrafos.map((p) => `<p style="line-height:1.5">${p}</p>`).join('')
    + `<p style="color:#666;font-size:12px;margin-top:32px">tablemaroc.com</p></body></html>`;
}

export type Mensaje = { asunto: string; texto: string; html: string };

const TEXTOS = {
  codigo: {
    es: { asunto: (c: string) => `Tu código de Tablemaroc: ${c}`, titulo: 'Tu código para entrar', cuerpo: (c: string) => [`Tu código es <strong style="font-size:24px;letter-spacing:4px">${c}</strong>`, 'Caduca en 10 minutos y solo sirve una vez.', 'Si no lo has pedido tú, ignora este correo: nadie puede entrar sin el código.'] },
    en: { asunto: (c: string) => `Your Tablemaroc code: ${c}`, titulo: 'Your sign-in code', cuerpo: (c: string) => [`Your code is <strong style="font-size:24px;letter-spacing:4px">${c}</strong>`, 'It expires in 10 minutes and can only be used once.', 'If you did not request it, ignore this email: nobody can sign in without the code.'] },
    fr: { asunto: (c: string) => `Votre code Tablemaroc : ${c}`, titulo: 'Votre code de connexion', cuerpo: (c: string) => [`Votre code est <strong style="font-size:24px;letter-spacing:4px">${c}</strong>`, 'Il expire dans 10 minutes et ne peut servir qu’une seule fois.', 'Si vous ne l’avez pas demandé, ignorez cet e-mail : personne ne peut se connecter sans le code.'] },
  },
} as const;

export function mensajeCodigo(codigo: string, idioma: Idioma): Mensaje {
  const t = TEXTOS.codigo[idioma];
  const cuerpo = t.cuerpo(codigo);
  return { asunto: t.asunto(codigo), html: html(t.titulo, cuerpo, idioma), texto: cuerpo.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n') };
}

const ESTADOS: Record<string, Record<Idioma, string>> = {
  pendiente: { es: 'recibida: el local la confirmará pronto', en: 'received: the restaurant will confirm it soon', fr: 'reçue : l’établissement la confirmera bientôt' },
  confirmada: { es: 'confirmada', en: 'confirmed', fr: 'confirmée' },
  no_disponible: { es: 'no disponible: el local no tiene sitio a esa hora', en: 'not available: the restaurant has no table at that time', fr: 'non disponible : l’établissement n’a pas de place à cette heure' },
  cancelada: { es: 'cancelada', en: 'cancelled', fr: 'annulée' },
};
const RESERVA = {
  es: { asunto: (l: string, e: string) => `Tu reserva en ${l}: ${e}`, titulo: 'Tu reserva', linea: (l: string, f: string, p: number) => `${esc(l)} · ${esc(f)} · ${p} ${p === 1 ? 'persona' : 'personas'}`, cuenta: 'Puedes verla o cancelarla en Mi cuenta → Mis reservas.' },
  en: { asunto: (l: string, e: string) => `Your booking at ${l}: ${e}`, titulo: 'Your booking', linea: (l: string, f: string, p: number) => `${esc(l)} · ${esc(f)} · ${p} ${p === 1 ? 'person' : 'people'}`, cuenta: 'You can view or cancel it in My account → My bookings.' },
  fr: { asunto: (l: string, e: string) => `Votre réservation chez ${l} : ${e}`, titulo: 'Votre réservation', linea: (l: string, f: string, p: number) => `${esc(l)} · ${esc(f)} · ${p} ${p === 1 ? 'personne' : 'personnes'}`, cuenta: 'Vous pouvez la consulter ou l’annuler dans Mon compte → Mes réservations.' },
};

/** Aviso al cliente del estado de su reserva (§18 bis). `cuando` = fecha y hora local de Marruecos. */
export function mensajeReserva(estado: string, local: string, cuando: string, personas: number, idioma: Idioma): Mensaje {
  const t = RESERVA[idioma];
  const e = ESTADOS[estado]?.[idioma] ?? estado;
  const fecha = cuando.replace('T', ' ');
  const cuerpo = [`${t.titulo}: <strong>${esc(e)}</strong>`, t.linea(local, fecha, personas), t.cuenta];
  return { asunto: t.asunto(local, e.split(':')[0]!), html: html(t.titulo, cuerpo, idioma), texto: cuerpo.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n') };
}

/** Envía por la API transaccional de Brevo. Sin clave: solo en local escribe en la consola; en producción, error claro. */
export async function enviar(env: Env, para: string, m: Mensaje, etiqueta: string): Promise<void> {
  if (!env.EMAIL_API_KEY) {
    if (env.DEV_MOSTRAR_CODIGOS === '1' && !env.SITE_URL.startsWith('https://tablemaroc.com')) {
      console.log(`[solo local] email a ${para}: ${m.asunto}`);
      return;
    }
    throw new EmailPendiente('Falta la clave de Brevo (EMAIL_API_KEY)');
  }
  const r = await fetch(BREVO, {
    method: 'POST',
    headers: { 'api-key': env.EMAIL_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: REMITENTE, to: [{ email: para }], subject: m.asunto, htmlContent: m.html, textContent: m.texto, tags: [etiqueta],
    }),
  });
  if (!r.ok) throw new Error(`Brevo respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/** Aviso al cliente de su reserva, en su idioma. Nunca hace fallar la reserva: si el envío falla, se registra y sigue. */
export async function avisarReserva(env: Env, reservaId: string): Promise<boolean> {
  try {
    const r = await env.DB.prepare(
      `SELECT r.status, r.requested_for, r.party_size, u.email, u.preferred_locale,
              coalesce((SELECT title FROM translations WHERE entity_type = 'place' AND entity_id = p.id AND locale = coalesce(u.preferred_locale, 'es') AND status = 'publicada'),
                       (SELECT title FROM translations WHERE entity_type = 'place' AND entity_id = p.id AND locale = 'es' AND status = 'publicada'), p.slug) AS local
       FROM reservations r JOIN places p ON p.id = r.place_id JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
    ).bind(reservaId).first<{ status: string; requested_for: string; party_size: number; email: string; preferred_locale: Idioma | null; local: string }>();
    if (!r) return false;
    await enviar(env, r.email, mensajeReserva(r.status, r.local, r.requested_for, r.party_size, r.preferred_locale ?? 'es'), `reserva-${r.status}`);
    return true;
  } catch (e) {
    console.error(`Aviso de reserva ${reservaId} no enviado: ${String(e).slice(0, 200)}`);
    return false;
  }
}
