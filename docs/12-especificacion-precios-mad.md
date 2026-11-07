# Especificación de precios (solo MAD)

**Decisión técnica del 29-10-2026** (paquete `tablemaroc-ajustes-tecnicos-2026-10-29`). Sustituye a la
antigua especificación de moneda dual (MAD/EUR/USD), que queda anulada.

## 1. Regla

- Tablemaroc utiliza **exclusivamente dírhams marroquíes (MAD)** para los precios.
- No existen conversiones a EUR, USD ni a ninguna otra moneda; tampoco tipos de cambio, selectores
  de moneda ni precios aproximados.
- `menu_items` guarda el importe en una columna `price_mad` (numérico, no negativo, nulo si el precio
  está pendiente). No hay campo genérico de moneda.

## 2. Presentación

- Formato: `120 MAD` (con decimales solo cuando existen, p. ej. `12,5 MAD`).
- Si el precio no existe o no está verificado, se muestra "Precio pendiente"; nunca se inventa un importe.
- Un precio no verificado debe estar claramente marcado como pendiente (maestro §4.2, Menú).

## 3. Implementación de referencia

`codigo/shared/price.ts` (`formatPriceMad`) y `codigo/testing/price.test.ts`.
