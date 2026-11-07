-- Home (decisiones del titular, 07-11-2026; documento maestro de Claude Design, Bloque 4.10).

-- «Mejores restaurantes»: los elige el titular. Cada restaurante lleva una marca con su orden (nulo = no sale) y su
-- «Mejor plato», elegido de su propio menú (así el nombre sale en es/en/fr con las traducciones del menú).
-- Sin clave foránea a menu_items: al restaurar una copia, places va antes que el menú (lo comprueba la aplicación).
ALTER TABLE places ADD COLUMN home_best_position INTEGER CHECK (home_best_position IS NULL OR home_best_position >= 1);
ALTER TABLE places ADD COLUMN home_best_dish_item_id TEXT;
CREATE INDEX places_home_best ON places(home_best_position) WHERE home_best_position IS NOT NULL;

-- Ajustes de la web que rellena el titular desde el panel (Ajustes). Primero: los datos de contacto del administrador
-- («Crea tu página» y «Contacto del administrador»). Mientras estén vacíos, la web muestra el marcador.
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY CHECK (key IN ('admin_contact')),
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
