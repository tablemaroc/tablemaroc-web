# Borrador de la política de privacidad

**Estado: BORRADOR DE TRABAJO, no publicado.** Lo redactó Claude Code el 30-10-2026 a partir de lo que hace el código. No es asesoramiento legal: debe revisarlo un asesor antes de publicarse (maestro §10).
Los huecos `[PENDIENTE: ...]` solo puede rellenarlos el titular. No se inventan.
Cuando esté aprobado, se traduce a inglés y francés, se publica en `/privacidad` y se cambia `CONSENT_VERSION` en `codigo/backend/reviews/validate.ts`.

---

## Política de privacidad de Tablemaroc

Última actualización: [PENDIENTE: fecha de publicación]

### 1. Quién es el responsable

Responsable de tus datos: Raki Ahmed, persona física.
Dirección: 33 rue Chiekh Ben Seddik, Tánger, Marruecos.
Contacto para privacidad: moradvisor@gmail.com.
[PENDIENTE: representante en la Unión Europea, si el asesor confirma que hace falta (RGPD, art. 27)].

### 2. Qué datos tratamos y para qué

| Situación | Datos | Para qué | Base legal |
|---|---|---|---|
| Visitas la web | Ninguna cuenta. El servidor recibe tu dirección IP y datos técnicos del navegador | Servir la página, seguridad y límite de intentos | [PENDIENTE: confirmar con asesor: interés legítimo] |
| Creas una cuenta o entras con email, Google o Apple | Email y, con Google o Apple, los datos básicos de perfil que facilitan | Identificarte y mantener tu sesión | Ejecución del servicio que pides |
| Escribes una reseña | Nombre visible, puntuación, comentario, fecha y lugar reseñado | Moderarla y publicarla | Consentimiento |
| Subes fotos | Las fotos y su texto descriptivo | Moderarlas y mostrarlas con tu reseña | Consentimiento |
| Das tu consentimiento | Finalidad, versión del texto y fecha | Poder demostrar que lo diste | Obligación de responsabilidad proactiva |

Tu nombre visible y tus reseñas aprobadas son públicos. Tu email no se publica nunca.
No uses en tu reseña datos de otras personas ni datos sensibles.

### 3. Lo que no hacemos

No vendemos tus datos. No usamos publicidad ni analítica. [PENDIENTE: revisar si se añade analítica, docs/08 punto 6.]
No usamos tu ubicación: el mapa muestra la del lugar, no la tuya.

### 4. Con quién se comparten

Solo con proveedores que hacen funcionar la web:

| Proveedor | Función | Ubicación |
|---|---|---|
| Supabase | Base de datos, cuentas y almacenamiento de fotos | Unión Europea (Fráncfort) |
| Hostinger | Servidor de la web | [PENDIENTE: país del VPS] |
| [PENDIENTE: proveedor de email] | Envío del enlace de acceso | [PENDIENTE] |
| Apple, si se activa | Acceso con «Entrar con Apple» | [PENDIENTE: confirmar con asesor] |
| Google | Acceso a tu cuenta con «Entrar con Google» | [PENDIENTE: confirmar con asesor: puede implicar transferencia fuera de la UE y de Marruecos] |
| Google | Mapa de cada ficha. Solo se carga si pulsas «Ver mapa»; entonces Google recibe tu dirección IP | [PENDIENTE: confirmar con asesor: puede implicar transferencia fuera de la UE y de Marruecos] |

[PENDIENTE: transferencias internacionales. El responsable está en Marruecos y los datos se alojan en la Unión Europea. Confirmar con asesor los trámites ante la CNDP.]

### 5. Cuánto tiempo los guardamos

- Cuenta, perfil, reseñas, fotos y consentimientos: hasta que elimines tu cuenta. [PENDIENTE: confirmar]
- Reseñas rechazadas: [PENDIENTE: plazo]
- Registros técnicos del servidor: [PENDIENTE: plazo]
- Copias de seguridad: hasta 3 meses aproximadamente, por rotación automática; lo que borres puede seguir en ellas hasta entonces. [PENDIENTE: confirmar al instalar las copias]

Tras eliminar tu cuenta conservamos un registro interno de que se eliminó, sin tu email.

### 6. Tus derechos

Puedes acceder a tus datos, corregirlos, borrarlos, pedir su portabilidad, oponerte al tratamiento o limitarlo, y retirar tu consentimiento en cualquier momento. Retirarlo no afecta a lo ya hecho antes.

Desde **Mi cuenta** puedes cambiar tu nombre, borrar tus reseñas, descargar tus datos y eliminar tu cuenta. Para lo demás, escribe a moradvisor@gmail.com.

Si no estás conforme, puedes reclamar ante la Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP) de Marruecos o, si vives en la Unión Europea, ante tu autoridad de protección de datos.

### 7. Cookies y almacenamiento en tu dispositivo

- **Cookie de sesión:** solo si entras en tu cuenta. Es necesaria para mantenerte identificado.
- **Copia sin conexión:** tu navegador guarda los archivos de la web y hasta 20 páginas visitadas, para que funcione con mala cobertura. Se queda en tu dispositivo; no nos llega. Puedes borrarla desde los ajustes del navegador.
- **Google Maps:** solo si pulsas «Ver mapa». Al cargarse puede usar sus propias cookies o almacenamiento. Sin pulsar, la web no contacta con Google. Los enlaces para abrir el lugar en una app de mapas llevan a Google u otra app solo si los pulsas.

### 8. Edad mínima

[PENDIENTE: edad mínima para crear una cuenta, a confirmar con asesor.]

### 9. Cambios

Si cambia esta política, publicaremos la nueva versión aquí con su fecha. Si el cambio afecta a lo que aceptaste, te pediremos de nuevo tu consentimiento.

---

## Notas para el titular y su asesor (no se publican)

### Qué dice el código hoy
- **Sí existe:** exportar datos, eliminar cuenta, registro de consentimiento con versión y fecha, moderación previa.
- **Mapa:** desde el 30-10-2026, Google Maps solo se carga al pulsar «Ver mapa», con un aviso breve junto al botón. Sin esa pulsación no hay contacto con Google; podría no hacer falta aviso de cookies (pregunta 4). La dirección y los enlaces se ven siempre.
- **Copias de seguridad:** el plazo sale de la rotación prevista en `config/backups/` (7 diarias, 4 semanales y 3 mensuales), aún sin instalar.
- **Registros de Nginx:** guardan la IP y aún no tienen plazo fijado.

### Preguntas para el asesor
1. ¿Se aplica el RGPD, además de la Ley 09-08? La web se dirige a visitantes en español, inglés y francés; si se considera dirigida a personas en la UE, podría aplicarse (art. 3.2) y exigir representante (art. 27).
2. ¿Qué trámites hacen falta ante la CNDP (declaración o autorización), incluida la transferencia a proveedores en la UE y Google?
3. ¿Es correcta la base legal de cada fila de la sección 2?
4. ¿Hace falta aviso de cookies si el mapa solo se carga al pulsar?
5. ¿Qué plazos de conservación recomienda?
6. ¿Qué edad mínima corresponde?
7. ¿Hacen falta además aviso legal y condiciones de uso? Hoy la web no tiene ninguno de los dos.

### Fuentes consultadas el 30-10-2026
Son en su mayoría secundarias: confirmar siempre con el texto oficial.
- CNDP: comunicado sobre la obligación de declarar, https://www.cndp.ma/wp-content/uploads/2023/11/CNDP-DEC-Communiqu_Version_franaise_20221220.pdf
- CMS, resumen de la Ley 09-08: https://cms.law/fr/mar/legal-updates/flash-info-maroc-etat-des-lieux-de-la-protection-des-donnees-a-caractere-personnel-au-maroc-loi-n-09-08
- Directrices 3/2018 del CEPD sobre ámbito territorial (copia): https://gdpr-text.com/en/guidelines/territorialscope/
- Google, condiciones de Maps para el EEE: https://cloud.google.com/terms/maps-platform/eea
- Google, política de consentimiento de usuarios de la UE: https://www.google.hu/about/company/user-consent-policy-help/
- AEPD, guía de cookies: https://www.aepd.es/documento/guia-cookies.pdf
