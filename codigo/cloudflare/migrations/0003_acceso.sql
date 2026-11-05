-- Acceso sin contraseña (maestro §18): retos temporales de passkeys («huella o cara») y de «Continuar con Google»,
-- y marca de email verificado. Los retos caducan en minutos y se consumen una sola vez.

CREATE TABLE auth_challenges (
  id TEXT PRIMARY KEY,                                       -- en Google, el `state`; en passkeys, un id propio
  kind TEXT NOT NULL CHECK (kind IN ('passkey_registro','passkey_acceso','google_state','google_alta')),
  value TEXT NOT NULL,                                       -- reto WebAuthn o code_verifier PKCE
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  data TEXT CHECK (data IS NULL OR json_valid(data)),        -- datos de alta pendientes (nombre, idioma…)
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX auth_challenges_expires ON auth_challenges(expires_at);

-- Email verificado: con código por email o con Google. Con «huella o cara» el email se escribe y queda sin verificar.
ALTER TABLE users ADD COLUMN email_verified_at TEXT;
