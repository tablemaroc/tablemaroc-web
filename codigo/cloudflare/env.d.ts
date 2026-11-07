// Bindings y secretos del Worker (wrangler.jsonc). Los secretos los crea el titular con `wrangler secret put` (§2).
declare namespace Cloudflare {
interface Env {
  DB: D1Database;
  FOTOS: R2Bucket;
  COPIAS: R2Bucket;
  ASSETS: Fetcher;
  SITE_URL: string;
  DEFAULT_LOCALE: 'es' | 'en' | 'fr';
  ENTORNO: 'prueba' | 'produccion';   // fuera de producción: noindex y robots.txt cerrado
  GOOGLE_CLIENT_ID: string;        // ID PÚBLICO del cliente OAuth de Google («Continuar con Google»)
  TURNSTILE_SITE_KEY: string;      // clave PÚBLICA de Turnstile (widget «Tablemaroc», modo administrado, sin preautorización)
  // Secretos (nunca en Git):
  SESSION_PEPPER: string;          // sal para los hash de códigos y sesiones
  TURNSTILE_SECRET: string;        // antispam
  GOOGLE_CLIENT_SECRET?: string;   // secreto del cliente OAuth de Google
  TOTP_KEY?: string;               // cifra el secreto del segundo factor de administración
  EMAIL_API_KEY?: string;          // clave API de Brevo (email transaccional)
  ADMIN_EMAILS?: string;           // cuentas de Google de administración (secreto de Cloudflare para no dejar emails en Git)
  DEV_MOSTRAR_CODIGOS?: string;    // solo en local: "1" escribe los códigos en la consola
}
}
interface Env extends Cloudflare.Env {}

declare namespace App {
  interface Locals {
    usuario?: import('./src/lib/sesion').Usuario | null;
  }
}
