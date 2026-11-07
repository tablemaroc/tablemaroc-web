# Pendientes de decisión del titular

## Prioridad alta
1. Formato de hoja de cálculo para carga inicial de lugares.
2. Proveedor de SMS para login por teléfono, si se mantiene ese método.

## Prioridad media
5. Recetas como entidad/contenido.
6. Analítica y política de cookies.
7. Ajuste final de los umbrales internos del Quality Gate.

## Añadidos al integrar el código (29-10-2026)
9. Fotos para platos, guías y ciudades: la función está hecha y aplicada al proyecto real (migración 0011 y políticas 0140, 30-10-2026). Falta que el titular suba las fotos cuando las tenga.

## Añadidos al revisar RLS (29-10-2026)
10. Nombre del bucket de Storage para fotos (propuesto: `fotos`, privado).

## Añadidos en el bloque 4c (30-10-2026)
11. Textos legales: política de privacidad (`/privacidad` está en borrador; borrador de trabajo y preguntas para el asesor en `docs/15-borrador-politica-privacidad.md`), y frases de consentimiento de reseña y fotos. Sin ellos y sin un servicio de envío de email, `PUBLIC_SIGNUP_ENABLED` no se activa en producción.

(Retirado el 29-10-2026: "si un usuario puede borrar su propia reseña" ya estaba decidido en `docs/modelo-de-datos.md`: sí puede.)

## Añadidos en la Fase 6 (30-10-2026)
12. Activar el segundo factor del titular en `/auth/mfa` (`0130` ya está aplicada al proyecto real, 30-10-2026).
13. Reloj del equipo del titular: va una hora atrasado y el servicio de hora de Windows está parado.

## Añadidos en la Fase 7 (30-10-2026)
Fase 7, parte 2 (instalar el servidor): APLAZADA por el titular (30-10-2026). No comprará dominio ni VPS hasta terminar el proyecto y el diseño. Los puntos 14 y 15 quedan aplazados con ella.
14. Proveedor de la copia externa de backups y de la copia semanal de fotos (`config/backups/README.md`).
15. Rol de solo lectura en la base para `backup-db.sh`.

## Acceso con Apple (30-10-2026)
16. El botón y la ruta están hechos, ocultos con `APPLE_LOGIN_ENABLED`. Exige Apple Developer Program (de pago, a confirmar precio en apple.com), crear las credenciales y poner en Supabase un secreto que caduca cada 6 meses. Decidir cuándo contratarlo.
17. Reactivar el proveedor Email en Supabase (el titular lo desactivó) y elegir servicio de envío antes de abrir altas: el de Supabase tiene un límite muy bajo.

## Dominios propios de restaurantes (30-10-2026)
18. El titular quiere, en el futuro, que el dominio de un restaurante muestre su página alojada en Tablemaroc (opción A), siempre con el dominio del propio restaurante y su permiso. Comprar dominios con nombres de negocios queda descartado. Necesita servidor en marcha, certificados por dominio, una canónica clara para no duplicar la ficha y revisar con el asesor el acuerdo con cada restaurante.

## Al lanzar la web (pedido por el titular, 30-10-2026)
- Antes de lanzar, cerrar las altas también en Supabase (**Allow new users to sign up**): primero en el proyecto de pruebas, luego en el real. Dos intentos del 30-10-2026 no se aplicaron (`disable_signup` siguió en `false`); causa sin averiguar, aplazado por el titular. Para abrir las altas después hay que encender esa opción además de `PUBLIC_SIGNUP_ENABLED`.
- Google Cloud: añadir `https://tablemaroc.com` a los orígenes del cliente.
- Supabase: `https://tablemaroc.com/**` en Redirect URLs y `https://tablemaroc.com` como Site URL.
- Publicar la app en Google Auth Platform (de pruebas a producción), con la política de privacidad ya publicada: si no, solo entran los usuarios de prueba.

## Ya decidido
- Sistema visual de Claude Design, arena y terracota con Fraunces y Manrope: sustituye a «Té a la menta». Se conservan barra inferior móvil, reseñas y pie completo. Referencia en `designo web/`, fuera de Git (30-10-2026).
- Sin pastelerías y panaderías como tipo de lugar: retirado de código, base y documentos vivos (30-10-2026).
- Sin reservas en la web: en Marruecos los restaurantes no las usan. Retiradas de código, base y documentos vivos (30-10-2026).
- Acceso sin contraseña con Google, email y Apple: el titular recuperó el email y pidió Apple tras haber retirado el email ese mismo día. Las reseñas de visitantes se mantienen; altas cerradas hasta abrirlas (30-10-2026). El titular activó sus dos pasos el mismo día.
- El mapa interactivo solo se carga al pulsar «Ver mapa», por privacidad; sustituye a la carga al llegar a la sección (30-10-2026).
- Responsable de los datos: el titular, como persona física en Marruecos (30-10-2026).
- Identidad visual: dirección «Té a la menta», verde, crema y dorado, con títulos en Fraunces; logo de plato con estrella (30-10-2026).
- Precios exclusivamente en MAD, sin conversiones (29-10-2026).
- Mapa con carga diferida; IndexedDB máx. 20 con LRU; cachés versionadas (29-10-2026).
- Enlace `https` de respaldo para iOS además de `geo:` (29-10-2026).
- Modelo de datos v2 aprobado; favoritos fuera del MVP; relación guía–barrio; datos de referencia en borrador (29-10-2026).
- Backend separado en el código, mismo proceso que la web; estilos con CSS Modules (29-10-2026).
- Rutas: secciones traducidas por idioma y mismo slug en los tres (`codigo/shared/routes.ts`); barra de navegación inferior (29-10-2026).
- Mapa estático de respaldo: texto y enlaces siempre + imagen opcional subida por la administración (29-10-2026).
- Datos de demostración solo en desarrollo, con prefijo `demo-` (29-10-2026).
- Migración 0010 aprobada y aplicada: dirección, indicaciones por idioma e imagen del mapa estático (29-10-2026).
- Fase 6: eliminar cuenta borra cuenta, perfil, reseñas, fotos y consentimientos; dos pasos obligatorios en el panel; límites de intentos en la aplicación; páginas de menú indexables (30-10-2026).
- SEO: interruptor SITE_INDEXING_ENABLED apagado hasta el lanzamiento; duplicidad interna automática; verificación máxima de 365 días; portada indexable, listados con 3 fichas indexables o más, `/` con noindex; favicon provisional (30-10-2026).
- Menú 4d: uno por lugar; publicar el menú completo con artículos ocultables; QR en el panel; avisos por email aplazados hasta tener SMTP; importación CSV en borrador con vista previa (30-10-2026).
- Reseñas 4c: nombre visible obligatorio; casilla de derechos en fotos de usuarios; alt obligatorio en el idioma de la reseña; reseñas en idioma original; máximo 5 reseñas en 24 h y 3 fotos por reseña (30-10-2026).
- Panel 4b: slug fijo al publicar; fotos procesadas con sharp; fotos del titular aprobadas si tienen origen, autor, licencia y alt; horario por días (30-10-2026).
- Idiomas: es/en/fr.
- Árabe retirado.
- Sin RTL.
- Sin `hreflang ar`.
- Menú digital en MVP.
- Quality Gate por entidad e idioma.
- Auditoría.
- Backups sin secretos.

## Regla
Este archivo contiene solo decisiones realmente pendientes. Una fecha de creación del
paquete no debe confundirse con una fecha límite o decisión del producto.