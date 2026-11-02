# Protocolo de Fallback de Mapas y Geolocalización (Tablemaroc.com)

## 1. Contexto y Problema

En entornos urbanos densos de Marruecos (como las medinas históricas de Fez, Marrakech o Tetuán), la cobertura 4G/5G puede sufrir intermitencias o pérdida temporal de señal. Para evitar que la interfaz falle o se quede en blanco al intentar cargar mapas interactivos de proveedores externos (Google Maps / Mapbox), se establece un sistema de **Fallback Estructural**.

## 2. Directrices de Implementación

* **Carga del mapa interactivo al pulsar (decisión 30-10-2026, sustituye a la carga al llegar a la sección):**
  - El mapa se carga exclusivamente cuando el usuario pulsa «Ver mapa». Junto al botón se avisa de que se carga desde Google, que recibirá su dirección IP.
  - Hasta esa pulsación no se carga el SDK del mapa ni sus componentes pesados, y el navegador no contacta con Google (privacidad; criterio de implementación: ante la duda, no cargar nada pesado).
  - Sin red o sin coordenadas válidas no se carga el SDK: se muestra directamente el fallback.
* **Placeholder sin CLS:** el contenedor del mapa reserva su espacio (relación de aspecto fija) desde el primer render, y el fallback ocupa exactamente ese mismo espacio. La dirección, las indicaciones y los enlaces se muestran siempre bajo el mapa, para que el cambio de estado no desplace el contenido.
* **Caché Local de Coordenadas:** Toda ficha de restaurante o lugar debe almacenar en caché local de la base de datos las coordenadas geográficas exactas (`lat`, `lng`) junto con un mapa estático de respaldo.
* **Componente de Respaldo (`MapFallback.tsx`):**
  - El temporizador de `3000ms` **empieza únicamente cuando se inicia la carga del mapa** (no al montar la página ni al renderizar el placeholder). Si el mapa no responde en ese tiempo, el componente desmonta el mapa dinámico y muestra el mapa estático optimizado en el mismo espacio reservado.
  - Enlaces: "Abrir en aplicación de mapas externa" (`geo:`) y un enlace `https` universal de respaldo para iOS (`https://www.google.com/maps/search/?api=1&query=lat,lng`), porque `geo:` no funciona en iOS (aprobado 29-10-2026).
* **Indicador de Conectividad:** Mostrar un banner flotante sutil y no intrusivo si el dispositivo entra en modo offline, permitiendo al usuario ver la dirección postal completa y las indicaciones de llegada en texto sin depender de internet.
