// Bindings y secretos del Worker (wrangler.jsonc). Los secretos los crea el titular con `wrangler secret put` (§2).
declare namespace Cloudflare {
interface Env {
  DB: D1Database;
  FOTOS: R2Bucket;
  COPIAS: R2Bucket;
  ASSETS: Fetcher;
  SITE_URL: string;
  DEFAULT_LOCALE: 'es' | 'en' | 'fr';
  // Secretos (nunca en Git):
  SESSION_PEPPER: string;          // sal para los hash de códigos y sesiones
  TURNSTILE_SECRET: string;        // antispam
  GOOGLE_CLIENT_ID?: string;       // «Continuar con Google»
  GOOGLE_CLIENT_SECRET?: string;
  TOTP_KEY?: string;               // cifra el secreto del segundo factor de administración
  EMAIL_API_KEY?: string;          // proveedor de email transaccional (pendiente del titular)
  ADMIN_EMAILS?: string;           // cuentas de Google autorizadas para administración (no secreto)
  DEV_MOSTRAR_CODIGOS?: string;    // solo en local: "1" escribe los códigos en la consola
}
}
interface Env extends Cloudflare.Env {}

declare namespace App {
  interface Locals {
    usuario?: import('./src/lib/sesion').Usuario | null;
  }
}
