-- Esquema de Tablemaroc en D1 (SQLite), maestro §18 ter. Sustituye a codigo/database (PostgreSQL/Supabase).
-- Paso del modelo v2 (aprobado el 29-10-2026) con las decisiones del titular posteriores:
--   sin barrios ni árabe (§12, §13); sin alcohol (§1); precios solo en MAD (§17); login sin contraseña (§18);
--   reservas recuperadas (§18 bis); propietarios y empleados (§18, §20); favoritos (§12); respuestas del
--   propietario sin moderación (§3); platos agotados archivados (§3); modo Automático / Manual del panel (§20).
-- Sin RLS en SQLite: los permisos se comprueban en el Worker (src/lib/permisos.ts). IDs: UUID generados en el Worker.
-- Fechas: texto ISO 8601 en UTC.

-- ───────────── Geografía y contenido ─────────────
CREATE TABLE regions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  lat REAL CHECK (lat BETWEEN -90 AND 90),
  lng REAL CHECK (lng BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE cities (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES regions(id),
  slug TEXT NOT NULL UNIQUE,
  lat REAL CHECK (lat BETWEEN -90 AND 90),
  lng REAL CHECK (lng BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX cities_region ON cities(region_id);

CREATE TABLE place_types (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE);
CREATE TABLE specialties (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE);   -- p. ej. vegetariano

CREATE TABLE places (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  city_id TEXT NOT NULL REFERENCES cities(id),
  place_type_id TEXT NOT NULL REFERENCES place_types(id),
  price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
  lat REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),          -- obligatorias (§16)
  lng REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  address TEXT,
  opening_hours TEXT CHECK (opening_hours IS NULL OR json_valid(opening_hours)),
  phone TEXT, website TEXT,
  -- Datos aprobados de la info del local (§20). Nulo = no verificado (se muestra como pendiente).
  accepts_card INTEGER CHECK (accepts_card IN (0,1)),
  has_terrace INTEGER CHECK (has_terrace IN (0,1)),
  staff_languages TEXT CHECK (staff_languages IS NULL OR json_valid(staff_languages)),  -- ["es","en","fr"]
  static_map_path TEXT,                                      -- imagen del mapa estático en R2 (§16)
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  open_status TEXT NOT NULL DEFAULT 'abierto'
    CHECK (open_status IN ('abierto','cerrado_temporalmente','cerrado_definitivamente')),  -- §3, no despublica
  accepts_reservations INTEGER NOT NULL DEFAULT 0 CHECK (accepts_reservations IN (0,1)),   -- «Acepto reservas» (§18 bis)
  verification_status TEXT NOT NULL DEFAULT 'sin_verificar' CHECK (verification_status IN ('sin_verificar','verificado','caducado')),
  verified_at TEXT, verified_by TEXT, verification_source TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (verification_status = 'sin_verificar' OR verified_at IS NOT NULL)
);
CREATE INDEX places_city ON places(city_id, place_type_id);

CREATE TABLE dishes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  origin_region_id TEXT REFERENCES regions(id),
  main_ingredients TEXT CHECK (main_ingredients IS NULL OR json_valid(main_ingredients)),
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE guides (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  author_name TEXT,                                          -- autoría declarada (Quality Gate)
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE place_specialties (place_id TEXT NOT NULL REFERENCES places(id), specialty_id TEXT NOT NULL REFERENCES specialties(id), PRIMARY KEY (place_id, specialty_id));
CREATE TABLE place_dishes (place_id TEXT NOT NULL REFERENCES places(id), dish_id TEXT NOT NULL REFERENCES dishes(id), PRIMARY KEY (place_id, dish_id));
CREATE TABLE guide_places (guide_id TEXT NOT NULL REFERENCES guides(id), place_id TEXT NOT NULL REFERENCES places(id), PRIMARY KEY (guide_id, place_id));
CREATE TABLE guide_dishes (guide_id TEXT NOT NULL REFERENCES guides(id), dish_id TEXT NOT NULL REFERENCES dishes(id), PRIMARY KEY (guide_id, dish_id));
CREATE TABLE guide_cities (guide_id TEXT NOT NULL REFERENCES guides(id), city_id TEXT NOT NULL REFERENCES cities(id), PRIMARY KEY (guide_id, city_id));
CREATE INDEX place_dishes_dish ON place_dishes(dish_id);

-- Una fila por entidad e idioma (solo es, en, fr).
CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('region','city','place','dish','guide')),
  entity_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('es','en','fr')),
  title TEXT, description TEXT, content TEXT, seo_title TEXT, seo_description TEXT,
  directions TEXT,                                           -- indicaciones en texto (solo lugares, §16)
  ramadan_notice TEXT,                                       -- aviso de horario de Ramadán (solo lugares, §20)
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisada','publicada')),
  is_indexable INTEGER NOT NULL DEFAULT 0 CHECK (is_indexable IN (0,1)),   -- resultado del Quality Gate (§4)
  indexable_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (entity_type, entity_id, locale),
  CHECK (is_indexable = 0 OR status = 'publicada')
);

-- ───────────── Cuentas sin contraseña (§18) ─────────────
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,                 -- nunca público
  google_sub TEXT UNIQUE,
  display_name TEXT,                                         -- nombre visible elegido por el usuario
  preferred_locale TEXT CHECK (preferred_locale IN ('es','en','fr')),
  role TEXT NOT NULL DEFAULT 'usuario' CHECK (role IN ('usuario','propietario','empleado','admin')),
  totp_secret_enc TEXT,                                      -- solo admin con Google: secreto cifrado con TOTP_KEY
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE passkeys (                                      -- «Continuar con huella o cara»
  id TEXT PRIMARY KEY,                                       -- credential ID (base64url)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT
);
CREATE INDEX passkeys_user ON passkeys(user_id);
CREATE TABLE email_codes (                                   -- código de 6 cifras, un solo uso, caducidad corta
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  code_hash TEXT NOT NULL,                                   -- nunca el código en claro
  purpose TEXT NOT NULL CHECK (purpose IN ('entrar','activar_empleado')),
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX email_codes_email ON email_codes(email, created_at);
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,                                  -- hash del token de la cookie
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  second_factor_ok INTEGER NOT NULL DEFAULT 0 CHECK (second_factor_ok IN (0,1)),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE rate_limits (                                   -- límites de intentos y envíos (§18)
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_ends_at TEXT NOT NULL
);
CREATE TABLE consents (                                      -- base legal con versión y fecha (§10)
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL, version TEXT NOT NULL,
  granted INTEGER NOT NULL CHECK (granted IN (0,1)),
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ───────────── Propietarios y empleados (§18, §20) ─────────────
CREATE TABLE place_owners (
  place_id TEXT PRIMARY KEY REFERENCES places(id),           -- un propietario por local
  user_id TEXT NOT NULL REFERENCES users(id),
  verified_at TEXT NOT NULL,
  verification_method TEXT NOT NULL                          -- vía sin coste (§12)
);
CREATE TABLE business_claims (                               -- reclamación del local: vía de alta del propietario (§18 bis)
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobada','rechazada')),
  method TEXT, evidence TEXT CHECK (evidence IS NULL OR json_valid(evidence)),
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (status <> 'rechazada' OR length(trim(coalesce(rejection_reason,''))) > 0)
);
CREATE TABLE place_staff (                                   -- los añade el propietario por email
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  email TEXT NOT NULL COLLATE NOCASE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendiente_activar' CHECK (status IN ('pendiente_activar','activo','anulado','sin_acceso')),
  added_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (place_id, email)
);

-- ───────────── Reseñas, respuestas y fotos ─────────────
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- borrar cuenta borra sus reseñas (§3.2)
  place_id TEXT NOT NULL REFERENCES places(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  locale TEXT CHECK (locale IN ('es','en','fr')),
  visited_on TEXT,
  trip_type TEXT CHECK (trip_type IN ('pareja','familia','amigos','solo')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobada','rechazada')),
  rejection_reason TEXT,
  moderated_by TEXT, moderated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (status <> 'rechazada' OR length(trim(coalesce(rejection_reason,''))) > 0)
);
CREATE INDEX reviews_place ON reviews(place_id, status);
CREATE INDEX reviews_user ON reviews(user_id, created_at);   -- límite de 5 cada 24 h; sin límite total ni por local (06-11-2026)
CREATE TABLE review_replies (                                -- del propietario, sin moderación (§3, 06-11-2026)
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,  -- una respuesta por reseña
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','publicada')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  place_id TEXT REFERENCES places(id),
  review_id TEXT REFERENCES reviews(id) ON DELETE CASCADE,
  dish_id TEXT REFERENCES dishes(id),
  guide_id TEXT REFERENCES guides(id),
  city_id TEXT REFERENCES cities(id),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  r2_key TEXT NOT NULL UNIQUE,                               -- objeto en el bucket FOTOS, sin metadatos GPS (§10)
  is_entrance INTEGER NOT NULL DEFAULT 0 CHECK (is_entrance IN (0,1)),   -- foto de la entrada del local (§20)
  source TEXT, author TEXT, license TEXT,                    -- origen, autoría y licencia (§3)
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobada','rechazada')),
  rejection_reason TEXT,
  moderated_by TEXT, moderated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((place_id IS NOT NULL) + (review_id IS NOT NULL) + (dish_id IS NOT NULL) + (guide_id IS NOT NULL) + (city_id IS NOT NULL) >= 1),
  CHECK (status <> 'rechazada' OR length(trim(coalesce(rejection_reason,''))) > 0)
);
CREATE INDEX photos_place ON photos(place_id, status);
CREATE INDEX photos_pending ON photos(status, created_at);
CREATE TABLE photo_translations (                            -- alt localizado
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('es','en','fr')),
  alt TEXT NOT NULL,
  PRIMARY KEY (photo_id, locale)
);

-- ───────────── Menú digital (§3, §17) ─────────────
CREATE TABLE menus (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL UNIQUE REFERENCES places(id),
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE menu_categories (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menus(id),
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES menu_categories(id),
  position INTEGER NOT NULL DEFAULT 0,
  price_mad REAL CHECK (price_mad >= 0),                     -- único importe; nulo = pendiente. SIN moneda.
  price_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (price_status IN ('verificado','pendiente')),
  allergens TEXT CHECK (allergens IS NULL OR json_valid(allergens)),
  photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisado','publicado')),
  archived_at TEXT,                                          -- plato agotado: archivado, no se muestra, se reactiva (§3)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (price_status <> 'verificado' OR price_mad IS NOT NULL)
);
CREATE INDEX menu_items_category ON menu_items(category_id, position);
CREATE TABLE menu_translations (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('menu','category','item')),
  target_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('es','en','fr')),
  name TEXT, description TEXT,
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','revisada','publicada')),
  is_indexable INTEGER NOT NULL DEFAULT 0 CHECK (is_indexable IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (target_type, target_id, locale),
  CHECK (is_indexable = 0 OR status = 'publicada')
);

-- ───────────── Reservas gestionadas (§18 bis) ─────────────
CREATE TABLE reservation_settings (
  place_id TEXT PRIMARY KEY REFERENCES places(id),
  slots TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(slots)),            -- franjas: [{"dia":1,"desde":"13:00","hasta":"15:30"}]
  max_party INTEGER NOT NULL DEFAULT 8 CHECK (max_party > 0),
  capacity_per_slot INTEGER CHECK (capacity_per_slot IS NULL OR capacity_per_slot > 0),
  closed_days TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(closed_days)), -- fechas cerradas ["2026-12-25"]
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE reservations (                                  -- nunca se borran (historial)
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  requested_for TEXT NOT NULL,                               -- fecha y hora local de Marruecos (ISO)
  special_request TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmada','no_disponible','cancelada')),
  decided_by TEXT, decided_at TEXT, decided_mode TEXT CHECK (decided_mode IN ('automatico','manual')),
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX reservations_place ON reservations(place_id, requested_for);
CREATE INDEX reservations_user ON reservations(user_id, created_at);
-- Transiciones permitidas: pendiente -> confirmada | no_disponible | cancelada; confirmada -> cancelada.
CREATE TRIGGER reservations_transitions BEFORE UPDATE OF status ON reservations
WHEN NOT (OLD.status = NEW.status
  OR (OLD.status = 'pendiente' AND NEW.status IN ('confirmada','no_disponible','cancelada'))
  OR (OLD.status = 'confirmada' AND NEW.status = 'cancelada'))
BEGIN SELECT RAISE(ABORT, 'transición de reserva no permitida'); END;
CREATE TRIGGER reservations_no_delete BEFORE DELETE ON reservations
BEGIN SELECT RAISE(ABORT, 'las reservas no se borran'); END;

-- ───────────── Favoritos (§12) ─────────────
CREATE TABLE favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, place_id)
);

-- ───────────── Operación: redirecciones, auditoría, modos, tareas y copias ─────────────
CREATE TABLE redirects (                                     -- siempre 301 (§2)
  id TEXT PRIMARY KEY,
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code = 301),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (from_path <> to_path)
);
CREATE TABLE audit_log (                                     -- campos mínimos §7; solo inserción
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  actor TEXT NOT NULL,
  origen TEXT NOT NULL CHECK (origen IN ('panel','claude_code','sistema')),
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('place','dish','guide','city','translation','review','photo','menu','redirect','account','config','reservation')),
  entidad_id TEXT NOT NULL,
  accion TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT CHECK (valor_anterior IS NULL OR json_valid(valor_anterior)),
  valor_nuevo TEXT CHECK (valor_nuevo IS NULL OR json_valid(valor_nuevo)),
  motivo TEXT
);
CREATE INDEX audit_entity ON audit_log(entidad_tipo, entidad_id, fecha);
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log es de solo inserción'); END;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log es de solo inserción'); END;

CREATE TABLE panel_modes (                                   -- interruptor «Automático / Manual» (§20)
  section TEXT PRIMARY KEY CHECK (section IN ('escritorio','locales','fotos','redirecciones','usuarios','auditoria','copias','reservas')),
  mode TEXT NOT NULL DEFAULT 'automatico' CHECK (mode IN ('automatico','manual')),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO panel_modes (section) VALUES ('escritorio'),('locales'),('fotos'),('redirecciones'),('usuarios'),('auditoria'),('copias'),('reservas');

CREATE TABLE job_runs (                                      -- historial de las tareas automáticas (§20, pestaña Automático)
  id TEXT PRIMARY KEY,
  job TEXT NOT NULL CHECK (job IN ('moderacion','copia_diaria','copia_semanal','revision_mensual')),
  cron TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('en_curso','ok','error','omitida')),
  summary TEXT
);
CREATE INDEX job_runs_job ON job_runs(job, started_at);

CREATE TABLE backups (                                       -- sección «Copias de seguridad» (§20)
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('automatica_diaria','automatica_semanal','manual','previa_restauracion')),
  contents TEXT NOT NULL CHECK (contents IN ('base_de_datos','fotos_y_configuracion','completa')),
  r2_key TEXT,
  size_bytes INTEGER,
  external_copy INTEGER NOT NULL DEFAULT 0 CHECK (external_copy IN (0,1)),   -- copia fuera de Cloudflare (pendiente del titular)
  status TEXT NOT NULL CHECK (status IN ('en_curso','ok','error')),
  error TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
