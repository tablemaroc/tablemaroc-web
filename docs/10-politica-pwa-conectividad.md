# Política de Conectividad Móvil y PWA (Service Worker)

*Actualizada el 29-10-2026 con las decisiones técnicas del paquete `tablemaroc-ajustes-tecnicos-2026-10-29`.*

## 1. Enfoque Mobile-First para Conectividad Inestable

Tablemaroc.com está optimizado para funcionar en dispositivos móviles bajo condiciones de red variables en Marruecos.

## 2. Configuración de Service Worker y Caché Crítica

* **Estrategia Cache-First para Activos Estáticos:**
  - Los iconos, estilos CSS críticos, fuentes y la página principal de guías gastronómicas se sirven mediante un Service Worker con estrategia de caché previa.
* **Estrategia Network-First con Fallback para Fichas:**
  - Las consultas a fichas de restaurantes y menús digitales intentan conectar con el servidor; si falla o no hay red, se sirven los últimos datos almacenados en el `IndexedDB` local del navegador del usuario.
* **Límite y política LRU de IndexedDB:**
  - Se almacenan como máximo **20** fichas/páginas. Al superarse, se elimina la menos recientemente usada (LRU): cada lectura offline o escritura actualiza su marca de uso.
* **Cachés versionadas y actualización:**
  - Los nombres de caché incluyen la versión del Service Worker. Al activarse una versión nueva se eliminan las cachés de versiones anteriores y las copias de `IndexedDB` guardadas con otra versión.
  - Una versión nueva queda en espera hasta que la página lo permita (mensaje `SKIP_WAITING`), para poder avisar al usuario o aplicarla en la siguiente visita sin recargas inesperadas.
* **Optimización de Imágenes:**
  - Todas las fotografías de platos y restaurantes se sirven en formatos comprimidos y modernos (WebP / AVIF) con carga diferida (`lazy-loading`) para minimizar el consumo de datos móviles del usuario.
