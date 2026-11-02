-- Modelo v2 (docs/07-cambios-propuestos/modelo-de-datos-v2.md) APROBADO por el titular el 29-10-2026. Se aplica con apply.sh
-- y solo con su confirmación (maestro §5). Nombres de tabla en inglés/snake_case; la correspondencia con
-- las entidades en español está en README.md. Precios solo en MAD: no existe columna de moneda (docs/12).

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_path text, preferred_locale locale_code,
  created_at timestamptz not null default now()
);
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  place_id uuid not null references places(id),
  rating smallint not null check (rating between 1 and 5),
  comment text, locale locale_code, visited_on date,
  status moderation_status not null default 'pendiente',
  rejection_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, place_id),
  check (status <> 'rechazada' or nullif(btrim(rejection_reason), '') is not null)  -- el rechazo conserva su motivo
);
create table review_replies (                              -- MVP: solo borradores; publicación en Fase 2
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references reviews(id) on delete cascade,
  body text not null,
  author_kind text not null default 'tablemaroc' check (author_kind in ('tablemaroc', 'owner')),
  status reply_status not null default 'borrador',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id),
  review_id uuid references reviews(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  storage_path text not null,
  source text, author text, license text,                 -- origen, autoría y licencia
  status moderation_status not null default 'pendiente',
  rejection_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (place_id is not null or review_id is not null),
  check (status <> 'rechazada' or nullif(btrim(rejection_reason), '') is not null)
);
create table photo_translations (                          -- alt localizado por idioma
  photo_id uuid references photos(id) on delete cascade,
  locale locale_code,
  alt text not null,
  primary key (photo_id, locale)
);
create index on reviews (place_id, status);
create index on photos (place_id, status);
