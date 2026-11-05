// Cabeceras de seguridad de todas las respuestas (maestro §5, §10, §16, §18 ter).
// Política estricta: solo nuestro dominio, más Turnstile (antispam) y el inicio de sesión con Google.
// Sin terceros de analítica en el navegador: Web Analytics de Cloudflare se inyecta en el borde y no usa cookies.

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",                       // Astro incrusta los estilos críticos
  "img-src 'self' data: blob:",                              // fotos y teselas OSM servidas desde nuestro dominio (R2)
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",                                       // Service Worker (§15)
  "manifest-src 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** Devuelve una copia de la respuesta con las cabeceras de seguridad (no pisa las que ya traiga). */
export function withSecurityHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  out.headers.delete('X-Powered-By');
  // Una respuesta que pone una cookie (sesión) nunca se guarda en cachés ni en el móvil. Hace falta aquí, en el servidor:
  // el navegador no deja que el Service Worker vea Set-Cookie, así que él solo puede respetar «private, no-store».
  if (out.headers.has('Set-Cookie')) out.headers.set('Cache-Control', 'private, no-store');
  return out;
}

/** Peticiones que cambian datos: solo desde nuestro propio origen (defensa CSRF además de la cookie SameSite=Lax). */
export function isSameOrigin(req: Request, siteUrl: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const origin = req.headers.get('Origin');
  if (!origin) return false;
  const self = new URL(req.url).origin;
  return origin === self || origin === new URL(siteUrl).origin;
}
