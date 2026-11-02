# Tablemaroc

Directorio y guía gastronómica de Marruecos. Dominio: https://tablemaroc.com

Estado: **web construida, sin publicar.** Fases 0 a 6 hechas y Fase 7 preparada en el repositorio. Ya existen plantillas en `/es/`, `/en/` y `/fr/`, panel con dos pasos, reseñas moderadas, menú digital, Quality Gate, buscador, identidad visual «Té a la menta» y modo sin conexión.

Falta, por decisión del titular: instalar el servidor, comprar el dominio y cargar contenido real y fotos (la base real está casi vacía). La política de privacidad es un borrador pendiente de un asesor (`docs/15-borrador-politica-privacidad.md`). El detalle está en `docs/08-pendientes-decidir.md` y `docs/13-codigo-integrado.md`.

## Uso en local

Requisitos: Node.js 26 (versión de `.nvmrc`; mínimo 22.18) y Git. Las claves van en `codigo/frontend/.env.local` (copia de `config/env-templates/.env.example`, fuera de Git).

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias de todo el proyecto |
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 (datos reales de Supabase) |
| `npm run dev:demo` | Igual, con datos de DEMOSTRACIÓN ficticios (`demo-…`) para ver las plantillas. Prohibido en producción |
| `npm run build` y `npm run start` | Build de producción y servidor de producción en local |
| `npm run release` | Build y carpeta `build-output/` para desplegar (el real se hace en GitHub Actions: `config/deploy/README.md`) |
| `npm run typecheck` | Comprueba los tipos de TypeScript |
| `npm test` | Pruebas unitarias |
| `npm run test:e2e` | Pruebas en Chromium real: Service Worker, mapa y plantillas (antes, una vez: `npx playwright install chromium`) |
| `npm run test:e2e:admin` | Panel de contenido en Chromium contra el proyecto Supabase de PRUEBAS (`codigo/frontend/.env.test.local`); se niega a usar el real |
| `npm run test:db` | Migraciones y RLS en un PostgreSQL temporal (en Windows: `PGBIN=/c/Users/pc/tools/pgsql-16/pgsql/bin npm run test:db`) |
| `npm run scan:secrets` | Busca secretos antes de un commit |

## Visión

- Enfoque nacional: gastronomía de Marruecos (restaurantes, cafés y teterías, comida callejera, mercados y zocos, platos típicos y guías).
- Mobile-First absoluto, Core Web Vitals (LCP, INP, CLS) y HTTPS estricto.
- Control automatizado de indexabilidad con Quality Gate (`is_indexable`).
- Idiomas oficiales: español (`es`), inglés (`en`) y francés (`fr`), con URLs `/es/`, `/en/`, `/fr/`. El árabe y el RTL están retirados. Cada idioma se indexa solo cuando su traducción está realmente preparada.
- Menú digital en el MVP. Reservas recuperadas el 01-11-2026 (gestionadas: solicita el usuario y confirma el propietario; ver `docs/01-documento-maestro-operacion.md` §18 bis).
- PWA y mobile-first para redes inestables, fallback de mapas con carga diferida y precios exclusivamente en MAD.

## Stack y servicios

- Next.js (App Router) y TypeScript.
- PostgreSQL en Supabase (seguridad con RLS). Acceso sin contraseña: Google, email con enlace y Apple (preparado, sin activar). Dos pasos en el panel.
- Backend separado del frontend.
- Google Maps (mapa y "Cómo llegar"). Carga de lugares manual; Google Places y Google Business en una fase posterior (las carpetas de integración quedan reservadas).
- Reseñas al estilo Google Business: puntuación de 1 a 5 estrellas, comentario y fotos, con moderación previa.
- Alojamiento: **todo en Cloudflare** (decisión del 02-11-2026; ver `docs/01-documento-maestro-operacion.md` §18 ter). El código actual (Next.js + Supabase) se sustituirá en la fase de desarrollo.
- Desarrollo con Claude Code desde Windows y repositorio en GitHub.

## Estructura

```
tablemaroc.com/
├── codigo/
│   ├── backend/            api, auth, reviews, admin-moderation, integrations (google-places, google-business, google-maps)
│   ├── frontend/           app, components, maps, i18n, admin-panel
│   ├── shared/             tipos TypeScript comunes
│   ├── database/           migrations, policies-rls, seeders
│   ├── components-ui/      mobile-design, mobile-experience
│   ├── base-indexing/      robots, sitemaps, canónicas, Quality Gate
│   ├── security/           SSL/TLS, cabeceras, secretos, seguridad del servidor
│   ├── performance-monitoring/
│   ├── mobile-qa-verification/
│   └── testing/
├── content/                es, en, fr (mismas subcarpetas en cada idioma)
├── config/                 env-templates, server-setup, deploy, backups
├── ordenes-claude-code/    tareas listas para pedir a Claude Code (moderación, menú, PWA, mapas, precios, SEO, backups, etc.)
├── public/                 sw.js (Service Worker)
├── seo/                    metadatos, hreflang y JSON-LD
└── docs/                   documento maestro, matriz de autoridad, especificaciones 10-12, modelo de datos, decisiones y prompt inicial
```

Todas las carpetas siguen kebab-case, sin espacios. Los archivos `.gitkeep` solo sirven para que Git conserve las carpetas vacías; se pueden borrar cuando haya contenido real.

## Documentos clave

- `docs/01-documento-maestro-operacion.md`: fuente operativa principal.
- `docs/09-matriz-de-autoridad.md`: qué documento manda por tema.
- `docs/08-pendientes-decidir.md`: decisiones abiertas del titular.
- `docs/13-codigo-integrado.md`: qué código hay, qué cubre y qué falta.
- `docs/14-ajustes-tecnicos-2026-10-29.md`: decisiones técnicas recientes (prioridad sobre especificaciones anteriores).
- `docs/15-borrador-politica-privacidad.md`: borrador legal y preguntas para el asesor.
- `docs/00-LEEME-paquete-integracion.md`: contenido y checklist del paquete de congelación.

- `docs/decisiones.md`: decisiones tomadas hasta ahora.
- `docs/modelo-de-datos.md`: entidades, relaciones y reglas del Quality Gate.
- `docs/prompt-inicial-claude-code.md`: instrucciones para empezar con Claude Code.
