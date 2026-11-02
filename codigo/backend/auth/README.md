# auth/
Supabase Auth. Fase 4a (29-10-2026): acceso por email con enlace o código, sin contraseña (`codigo/frontend/app/auth/`).
- Solo pueden entrar cuentas ya creadas (`shouldCreateUser: false`) hasta que existan el consentimiento y la política de privacidad (bloque 4c).
- El rol de administración se lee de `app_metadata.role` (`session.ts`), nunca de `user_metadata`.
- `safeNextPath` impide redirecciones abiertas tras entrar.
- Google: pendiente de que el titular cree las credenciales OAuth. Teléfono: bloqueado hasta elegir proveedor de SMS (`docs/08`).

Configuración en el panel de Supabase (la hace el titular): *Authentication → URL Configuration* → Site URL `https://tablemaroc.com`
y Redirect URLs `http://localhost:3000/auth/callback` y `https://tablemaroc.com/auth/callback`. Para producción, SMTP propio
(*Authentication → Emails → SMTP Settings*): el correo de serie de Supabase solo envía unos pocos emails por hora.
