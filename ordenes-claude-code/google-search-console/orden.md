# Orden: usar Google Search Console

## Objetivo
Analizar cómo ve y posiciona Google a Tablemaroc, detectar problemas de indexación y proponer acciones.

## Requisitos previos (los prepara el titular)
1. La web debe estar publicada en `https://tablemaroc.com`.
2. El titular verifica el dominio en Google Search Console como propiedad de dominio. Suele hacerse añadiendo un registro DNS en el panel de dominios de Hostinger; Claude Code le guiará paso a paso.
3. Los datos se entregan con informes descargados (CSV): el titular exporta los informes desde Search Console (rendimiento, páginas indexadas, sitemaps y Core Web Vitals) y los deja en la carpeta `resultados/`. Claude Code le indica qué informes descargar y cómo. Más adelante se podrá valorar un acceso automático por API; las credenciales nunca se guardan en el repositorio.
4. Si falta alguno de estos requisitos, dilo y detente.

## Pasos
1. **Rendimiento en búsqueda:** clics, impresiones, CTR y posición media. Analiza por página, consulta, país, dispositivo e idioma. Destaca las páginas que ganan o pierden tráfico.
2. **Indexación:** cuántas páginas están indexadas y cuáles no, con el motivo (rastreada pero no indexada, duplicada, bloqueada, noindex, error). Compara con el Quality Gate (`is_indexable`): lo indexado debe coincidir con lo permitido.
3. **Sitemaps:** comprueba que están enviados, sin errores y que contienen solo páginas indexables, por idioma.
4. **Experiencia y rendimiento:** revisa el informe de Core Web Vitals y los de usabilidad o experiencia que estén disponibles.
5. **Datos estructurados y resultados enriquecidos:** errores y advertencias.
6. **Internacionalización:** errores de `hreflang` (solo es/en/fr) y páginas en idioma equivocado.
7. **Seguridad y acciones manuales:** confirma que no hay avisos.
8. **Oportunidades:** consultas con muchas impresiones y poca posición o poco CTR; páginas a mejorar; contenido que falta.
9. Para páginas concretas con dudas, usa la inspección de URL.

## Límites
- No pidas indexación manual de páginas en masa. Deja que Google las descubra con los sitemaps; la petición manual solo se usa en casos puntuales que el titular apruebe. NUNCA uses las herramientas de eliminación de URL.
- No saques conclusiones con pocos datos: indica el periodo y el volumen.
- No compartas datos de Search Console fuera del proyecto.

## Entregable
Informe en `resultados/` con las métricas, los problemas por gravedad, las oportunidades y las acciones recomendadas. Compáralo con el informe anterior.

## Aprobación
Aplica cambios solo tras aprobación del titular.
