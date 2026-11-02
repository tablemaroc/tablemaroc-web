#!/usr/bin/env bash
# Valida el BORRADOR de migraciones y RLS en un PostgreSQL temporal (no toca ninguna base real).
# Requiere binarios de PostgreSQL (initdb, pg_ctl, psql) y ejecutarse como un usuario que no sea root.
# Linux y Windows (Git Bash). En Windows con los binarios portátiles: PGBIN=/c/Users/pc/tools/pgsql-16/pgsql/bin
# Conexión solo por TCP en 127.0.0.1 (los sockets Unix no funcionan con Git Bash); la BD temporal no acepta conexiones externas.
set -euo pipefail
PGBIN="${PGBIN:-$(dirname "$(command -v initdb || echo /usr/lib/postgresql/16/bin/initdb)")}"
export PATH="$PGBIN:$PATH" PGCLIENTENCODING=UTF8
HERE="$(cd "$(dirname "$0")/.." && pwd)"; D="$(mktemp -d)"; PORT="${PGPORT:-54329}"
trap 'pg_ctl -D "$D/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$D"' EXIT
initdb -D "$D/data" -A trust -U postgres -E UTF8 --locale=C >/dev/null
printf "port = %s\nlisten_addresses = '127.0.0.1'\nunix_socket_directories = ''\n" "$PORT" >> "$D/data/postgresql.conf"
pg_ctl -D "$D/data" -l "$D/log" start -w >/dev/null
P="psql -h 127.0.0.1 -p $PORT -U postgres -q"
$P -d postgres -c "create database t"
$P -v ON_ERROR_STOP=1 -d t -f "$HERE/tests/stub-supabase.sql"
for f in "$HERE"/migrations/propuesta-v2/*.sql "$HERE"/policies-rls/*.sql; do $P -v ON_ERROR_STOP=1 -d t -f "$f"; done
$P -d t -c "grant usage on schema public, auth to anon, authenticated" \
  -c "grant select,insert,update,delete on all tables in schema public to anon, authenticated" \
  -c "grant execute on all functions in schema public to anon, authenticated" \
  -c "revoke all on audit_log from anon, authenticated" -c "grant select on audit_log to authenticated"
echo "Migraciones y RLS aplicados en BD temporal. Resultado de las pruebas de humo (cada ERROR marcado como esperado es correcto):"
$P -d t -f "$HERE/tests/rls-smoke.sql" 2>&1 | grep -vE "^\(|^-+$|^$|rows?\)" | cut -c1-170

echo "Ensayo de apply.sh en otra BD temporal (como se aplicará a Supabase):"
$P -d postgres -c "create database a"
$P -v ON_ERROR_STOP=1 -d a -f "$HERE/tests/stub-supabase.sql"
export DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/a"
echo "--- A1. primera vez: 19 aplicado(s) (11 migraciones, 6 de RLS y 2 de datos de referencia)"; bash "$HERE/apply.sh" --seed | tail -1
echo "--- A2. segunda vez: Nada pendiente"; bash "$HERE/apply.sh" --seed | tail -1
echo "--- A3. datos de referencia: esperado 4 tipos, 12 regiones, 1 ciudad, todo en borrador"
$P -d a -At -c "select (select count(*) from place_types) || ' tipos, ' || (select count(*) from regions) || ' regiones, ' || (select count(*) from cities) || ' ciudad, publicados: ' || (select count(*) from regions where status <> 'borrador') + (select count(*) from cities where status <> 'borrador')"
echo "--- A4. un archivo ya aplicado que cambia: ERROR esperado"
$P -d a -c "update tablemaroc_meta.applied_files set sha256 = 'x' where file like '%0001_tipos.sql'"
bash "$HERE/apply.sh" --seed 2>&1 | tail -1 || true
echo "--- A5. simulación en BD vacía: lista pendientes y no aplica nada"
$P -d postgres -c "create database b"
DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/b" bash "$HERE/apply.sh" --dry-run | tail -1
$P -d b -At -c "select 'tablas creadas en b: ' || count(*) from information_schema.tables where table_schema = 'public'"
