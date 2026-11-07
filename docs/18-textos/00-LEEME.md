# Textos de Tablemaroc (es · en · fr) y palabras clave

**Fecha:** 06-11-2026 · **Estado:** borrador para revisión del titular · **Autoridad:** `docs/01-documento-maestro-operacion.md` manda.

Textos preparados mientras se hace el diseño, para que cada plantilla tenga su texto real (y no relleno) cuando lleguen las pantallas.

| Archivo | Contenido |
|---|---|
| `01-palabras-clave.md` | Investigación de palabras clave en es/en/fr y a qué página va cada una |
| `02-metadatos-seo.md` | Títulos, descripciones y H1 de cada plantilla, con variables |
| `03-home-listados-esqueleto.md` | Portada, listados, cabecera, pie y barra inferior |
| `04-interfaz.md` | Textos de la interfaz: info del local, menú, reseñas, reserva, acceso, Mi cuenta, errores y correos |
| `05-tanger.md` | Texto de la ciudad de Tánger (primera ciudad) |
| `06-platos-tipicos.md` | 8 platos típicos con su texto «Qué es» |
| `07-paginas-de-texto.md` | Sobre nosotros, cómo funcionan las reseñas y contacto |

## Reglas que siguen todos los textos

- **No se inventan datos** (§1.4): ningún texto nombra un local concreto, precio, horario ni premio. Los textos de ciudad y platos
  son conocimiento general y van como **borrador** hasta que se revisen.
- Sin alcohol, sin barrios ni zonas como función (la palabra «medina» solo aparece en textos descriptivos, nunca como filtro ni página),
  sin «€», sin publicidad. «Info del local», nunca «ficha». Nunca «invitar».
- Las palabras clave se usan de forma natural: una principal por página en el título, el H1 y el primer párrafo; las secundarias
  en subtítulos y texto. Nada de repetir por repetir (los mínimos del Quality Gate no se rellenan, §4.3).
- Las traducciones en/fr son mías y las tiene que revisar un nativo antes de publicarse (`ordenes-claude-code/revisar-traducciones`).
- El francés ocupa más: los textos de botones están pensados cortos.

## Decisiones que necesito del titular

1. **Slugs de los platos** (el slug es el mismo en los tres idiomas): propongo `tajine`, `cuscus`, `pastela`, `harira`,
   `bissara`, `msemen`, `rfissa` y `te-a-la-menta` (alternativa neutral: `atay`). `cuscus` y `pastela` son la forma española;
   en/fr buscan «couscous» y «pastilla», pero el título y el texto ya las llevan.
2. **Grafía en español:** propongo «tajín» en el texto con «tajine» entre paréntesis la primera vez (la gente busca las dos),
   «cuscús» y «pastela».
3. Las búsquedas piden mucho **pescado y marisco**, **vistas al mar** y **barato**. No son filtros aprobados: propongo cubrirlas
   con **guías** (p. ej. «Dónde comer pescado en Tánger») y con el rango de precio (●○○○), sin añadir campos. ¿De acuerdo?
4. **Filtros del listado:** «Pago con tarjeta», «Terraza», «Acepta reservas», «Idiomas del personal» y el selector «Ordenar»
   son datos aprobados pero no están escritos como filtros. ¿Cuáles van?
5. **Slugs de las páginas de texto:** propongo `sobre-nosotros`/`about`/`a-propos`,
   `como-funcionan-las-resenas`/`how-reviews-work`/`comment-fonctionnent-les-avis` y `contacto`/`contact`/`contact`.
