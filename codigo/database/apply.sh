#!/usr/bin/env bash
# Aplica a una base REAL (Supabase) las migraciones, las políticas RLS y, con --seed, los datos de referencia.
# Ejecutar solo con confirmación del titular (maestro §5). Ensayar antes con tests/run.sh.
# Cada archivo se aplica una sola vez, en su propia transacción, y queda registrado con su huella SHA-256.
# Si un archivo ya aplicado ha cambiado, se detiene: los cambios posteriores van siempre en un archivo nuevo.
# Uso: bash codigo/database/apply.sh [--seed] [--dry-run] [--env=codigo/frontend/.env.test.local]
# DATABASE_URL (SECRETA) se lee del entorno o de codigo/frontend/.env.local, y nunca se muestra.
set -euo pipefail
PGBIN="${PGBIN:-$(dirname "$(command -v psql || echo /usr/lib/postgresql/16/bin/psql)")}"
export PATH="$PGBIN:$PATH" PGCLIENTENCODING=UTF8
HERE="$(cd "$(dirname "$0")" && pwd)"

SEED=0; DRY=0; ENV_FILE="$HERE/../frontend/.env.local"
for a in "$@"; do
  case "$a" in --seed) SEED=1 ;; --dry-run) DRY=1 ;; --env=*) ENV_FILE="${a#--env=}" ;; *) echo "Opción desconocida: $a" >&2; exit 2 ;; esac
done

if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE" | tail -1 | tr -d '\r')"
  DATABASE_PASSWORD="${DATABASE_PASSWORD:-$(sed -n 's/^DATABASE_PASSWORD=//p' "$ENV_FILE" | tail -1 | tr -d '\r')}"
fi
[ -n "${DATABASE_URL:-}" ] || { echo "Falta DATABASE_URL (ver config/env-templates/.env.example)" >&2; exit 2; }
case "$DATABASE_URL" in *YOUR-PASSWORD*) echo "DATABASE_URL aún contiene [YOUR-PASSWORD]: quítalo y pon la contraseña en DATABASE_PASSWORD" >&2; exit 2 ;; esac
# La contraseña va aparte (PGPASSWORD): así no hay que codificar símbolos como @ o # dentro de la URL.
[ -n "${DATABASE_PASSWORD:-}" ] && export PGPASSWORD="$DATABASE_PASSWORD"
P=(psql -X -q -v ON_ERROR_STOP=1 -d "$DATABASE_URL")

FILES=("$HERE"/migrations/propuesta-v2/*.sql "$HERE"/policies-rls/*.sql)
[ "$SEED" = 1 ] && FILES+=("$HERE"/seeders/*.sql)

if [ "$DRY" = 0 ]; then
  "${P[@]}" -c "set client_min_messages = warning" -c "create schema if not exists tablemaroc_meta" -c "revoke all on schema tablemaroc_meta from public" \
    -c "create table if not exists tablemaroc_meta.applied_files (file text primary key, sha256 text not null, applied_at timestamptz not null default now())"
fi
HAS_LOG="$("${P[@]}" -At -c "select to_regclass('tablemaroc_meta.applied_files') is not null")"

pending=0
for f in "${FILES[@]}"; do
  rel="${f#"$HERE"/}"; sum="$(sha256sum "$f" | cut -d' ' -f1)"
  done_sum=""
  [ "$HAS_LOG" = t ] && done_sum="$("${P[@]}" -At -c "select sha256 from tablemaroc_meta.applied_files where file = '$rel'")"
  if [ "$done_sum" = "$sum" ]; then echo "ya aplicado  $rel"; continue; fi
  if [ -n "$done_sum" ]; then echo "ERROR: $rel cambió después de aplicarse. Crea un archivo nuevo con el cambio." >&2; exit 1; fi
  pending=$((pending + 1))
  if [ "$DRY" = 1 ]; then echo "pendiente    $rel"; continue; fi
  { cat "$f"; printf "\ninsert into tablemaroc_meta.applied_files (file, sha256) values ('%s', '%s');\n" "$rel" "$sum"; } \
    | "${P[@]}" --single-transaction -f -
  echo "aplicado     $rel"
done
[ "$pending" = 0 ] && echo "Nada pendiente." || { [ "$DRY" = 1 ] && echo "$pending pendiente(s) (simulación: no se ha aplicado nada)." || echo "$pending aplicado(s)."; }
