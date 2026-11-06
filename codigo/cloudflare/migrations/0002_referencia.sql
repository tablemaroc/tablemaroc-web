-- Datos de referencia reales aprobados por el titular el 29-10-2026 (paso de codigo/database/seeders a D1).
-- Sin «pastelerías y panaderías» (retirado el 30-10-2026). Todo en BORRADOR; coordenadas vacías hasta tener fuente citada.
-- IDs fijos y legibles para que la migración sea reproducible. Los nombres visibles van en `translations`.

INSERT OR IGNORE INTO place_types (id, slug) VALUES
  ('pt-restaurantes', 'restaurantes'),
  ('pt-cafes-y-teterias', 'cafes-y-teterias'),
  ('pt-comida-callejera', 'comida-callejera'),
  ('pt-mercados-y-zocos', 'mercados-y-zocos');

INSERT OR IGNORE INTO specialties (id, slug) VALUES ('sp-vegetariano', 'vegetariano');   -- dato aprobado (§20)

-- Las 12 regiones de la división administrativa de Marruecos de 2015 (decreto n.º 2-15-40, de 20-02-2015).
INSERT OR IGNORE INTO regions (id, slug) VALUES
  ('rg-tanger-tetouan-al-hoceima', 'tanger-tetouan-al-hoceima'),
  ('rg-oriental', 'oriental'),
  ('rg-fes-meknes', 'fes-meknes'),
  ('rg-rabat-sale-kenitra', 'rabat-sale-kenitra'),
  ('rg-beni-mellal-khenifra', 'beni-mellal-khenifra'),
  ('rg-casablanca-settat', 'casablanca-settat'),
  ('rg-marrakech-safi', 'marrakech-safi'),
  ('rg-draa-tafilalet', 'draa-tafilalet'),
  ('rg-souss-massa', 'souss-massa'),
  ('rg-guelmim-oued-noun', 'guelmim-oued-noun'),
  ('rg-laayoune-sakia-el-hamra', 'laayoune-sakia-el-hamra'),
  ('rg-dakhla-oued-ed-dahab', 'dakhla-oued-ed-dahab');

-- Primera ciudad (modelo: «se empieza por Tánger»).
INSERT OR IGNORE INTO cities (id, region_id, slug) VALUES ('ct-tanger', 'rg-tanger-tetouan-al-hoceima', 'tanger');
