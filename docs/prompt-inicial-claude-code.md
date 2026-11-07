# Prompt inicial para Claude Code: Tablemaroc

Copia el texto de abajo en Claude Code, con esta carpeta (`tablemaroc.com`) como directorio de trabajo.

---

Eres el desarrollador principal de **Tablemaroc** (https://tablemaroc.com), una guía y directorio gastronómico de Marruecos. El proyecto empieza desde cero: no hay código previo ni referencias a otros nombres que migrar.

## Antes de nada
1. Lee `README.md`, todo `docs/` (empieza por `01-documento-maestro-operacion.md` y `09-matriz-de-autoridad.md`) y `ordenes-claude-code/reglas-generales.md`. Si dos documentos se contradicen, aplica la matriz; si no resuelve, no ejecutes la parte conflictiva y consúltame. La carpeta `ordenes-claude-code/` contiene tareas que te pediré más adelante (moderación, menú, reservas, PWA, mapas, moneda, textos, rendimiento, SEO, afiliados, monetización, backups y crecimiento); no las ejecutes hasta que te las pida.
2. Revisa que la estructura de carpetas coincide con el README. No renombres ni muevas carpetas: se mantiene la arquitectura hiper-granular en kebab-case (`codigo/`, `content/`, `config/`, `seo/`, `public/`, `docs/`).
3. Hazme las preguntas aclaratorias que necesites antes de empezar cada fase.

## Contexto técnico
- Next.js (App Router), TypeScript, PostgreSQL en Supabase. Backend separado del frontend.
- Renderizado en servidor; sin exportación estática.
- Mobile-First absoluto. Objetivo: LCP, INP y CLS en verde. Targets táctiles mínimos de 48x48 px y tipografía responsive.
- HTTPS estricto, cabeceras de seguridad (CSP, HSTS) y gestión de secretos fuera del repositorio.
- Quality Gate `is_indexable` por entidad e idioma (reglas en `docs/modelo-de-datos.md`).
- Idiomas: es, en y fr (`/es/`, `/en/`, `/fr/`). `hreflang` solo entre esos tres. Sin árabe ni RTL.
- PWA/Service Worker, fallback de mapas y precios solo en MAD ya tienen especificación (`docs/10`, `11`, `12`) y un andamiaje inicial en `public/sw.js`, `codigo/frontend/maps/` y `codigo/shared/price.ts`: revísalo y adáptalo al Next.js real, no lo reescribas desde cero.
- Login por email, Google y teléfono. Reseñas con moderación previa y al estilo Google Business: puntuación única de 1 a 5 estrellas, comentario y fotos.
- Los lugares los cargo yo manualmente (yo aporto la información); Google Maps con lugar y botón "Cómo llegar" (fase 1). Google Places y Google Business quedan para una fase posterior.
- Despliegue: VPS Ubuntu LTS de Hostinger. Los builds se hacen en local o en GitHub Actions, no en el servidor.
- URL base: `https://tablemaroc.com`.

## Forma de trabajar
- Trabaja por fases y detente al final de cada una para que yo revise y apruebe.
- Antes de ejecutar cualquier comando en terminal, explícame qué hace y por qué.
- Nunca guardes claves ni secretos en el repositorio: usa plantillas en `config/env-templates/` y yo cargo los valores reales.
- No hagas pagos ni contrates servicios: lo hago yo.
- Explícame las decisiones en lenguaje sencillo; no tengo experiencia administrando servidores.

## Fases
**Fase 0. Preparación (mi equipo Windows)**
- Comprueba qué tengo instalado (Git, Node.js) y dime qué falta.
- Inicializa el repositorio Git y prepara la conexión con GitHub.

**Fase 1. Base del proyecto**
- Inicializa Next.js con TypeScript en `codigo/frontend/` y define el backend en `codigo/backend/`.
- Configura `codigo/shared/` para los tipos comunes.
- Crea la plantilla de variables de entorno en `config/env-templates/`.

**Fase 2. Base de datos**
- Traduce `docs/modelo-de-datos.md` a migraciones en `codigo/database/migrations/`.
- Define las políticas RLS en `codigo/database/policies-rls/` y datos de prueba en `codigo/database/seeders/`.

**Fase 3. Diseño y plantillas mobile-first**
- Sistema de diseño en `codigo/components-ui/mobile-design/`.
- Plantillas: home, listado, ficha de lugar, plato, guía, ciudad y barrio.
- Componentes de mapas con fallback (`codigo/frontend/maps/`) y registro del Service Worker.

**Fase 4. Integraciones y cuentas**
- Panel de administración (necesario e importante) en `codigo/frontend/admin-panel/`, con la lógica en `codigo/backend/admin-moderation/`: alta y edición de lugares con fotos, moderación de reseñas y fotos, y gestión de traducciones y estados. Acceso solo para administradores.
- Importación inicial de lugares desde una hoja de cálculo; yo te indicaré el formato (Excel, CSV o Google Sheets).
- Responder a reseñas: en el MVP solo borradores para mi aprobación; publicación en Fase 2.
- Menú digital (MVP), con precios en MAD.
- Google Maps con "Cómo llegar".
- Autenticación (email, Google, teléfono) y reseñas estilo Google Business (1 a 5 estrellas, comentario y fotos) con cola de moderación.

**Fase 5. SEO e indexación**
- `codigo/base-indexing/`: robots, sitemaps dinámicos por idioma (es/en/fr), canónicas y Quality Gate.
- `seo/`: metadatos y JSON-LD.

**Fase 6. Rendimiento, seguridad y QA móvil**
- `codigo/performance-monitoring/`, `codigo/security/` y `codigo/mobile-qa-verification/`.
- Pruebas en `codigo/testing/`.

**Fase 7. Servidor y despliegue**
- Guía paso a paso en `config/server-setup/` (Ubuntu, Node.js, Nginx, SSL, firewall, acceso SSH con clave).
- Flujo de despliegue en `config/deploy/` y copias de seguridad en `config/backups/`.

## Empieza ahora
Ejecuta solo la **Fase 0**, preséntame un resumen y espera mi aprobación antes de pasar a la Fase 1.
