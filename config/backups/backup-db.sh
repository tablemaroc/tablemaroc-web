#!/usr/bin/env bash
# Backup diario de la base de datos (maestro §9): volcado -> cifrado con clave PÚBLICA (age) -> rotación 7 diarias / 4 semanales / 3 mensuales
# -> copia externa opcional. Sin secretos en el repo: la configuración se lee de un archivo del servidor.
# Uso: backup-db.sh [archivo_de_entorno]   (por defecto /etc/tablemaroc/backup.env)
set -euo pipefail

ENV_FILE="${1:-/etc/tablemaroc/backup.env}"
[ -r "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a
: "${DATABASE_URL:?falta DATABASE_URL}" "${AGE_RECIPIENT:?falta AGE_RECIPIENT}" "${BACKUP_DIR:?falta BACKUP_DIR}"
# La contraseña va aparte, como en codigo/database/apply.sh: así no hay que codificar símbolos dentro de la URL.
[ -n "${DATABASE_PASSWORD:-}" ] && export PGPASSWORD="$DATABASE_PASSWORD"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"; AGE_BIN="${AGE_BIN:-age}"
KEEP_DAILY="${KEEP_DAILY:-7}"; KEEP_WEEKLY="${KEEP_WEEKLY:-4}"; KEEP_MONTHLY="${KEEP_MONTHLY:-3}"

fail() { rm -f -- "${TMP:-}"; echo "BACKUP FALLIDO: $1" >&2; [ -n "${ALERT_CMD:-}" ] && printf 'Backup de Tablemaroc fallido: %s\n' "$1" | sh -c "$ALERT_CMD" || true; exit 1; }
trap 'fail "error en la línea $LINENO"' ERR

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}
OUT="$BACKUP_DIR/daily/db-$STAMP.dump.age"; TMP="$OUT.partial"

"$PG_DUMP_BIN" --format=custom --no-owner --dbname="$DATABASE_URL" | "$AGE_BIN" -r "$AGE_RECIPIENT" > "$TMP"
[ -s "$TMP" ] || fail "volcado vacío"
mv "$TMP" "$OUT"

[ "$(date -u +%u)" = 7 ]  && cp "$OUT" "$BACKUP_DIR/weekly/"
[ "$(date -u +%d)" = 01 ] && cp "$OUT" "$BACKUP_DIR/monthly/"

# Rotación (solo ficheros de backup): conserva los N más recientes por nombre (el nombre lleva la fecha)
prune() { ls -1 "$1" | sort | head -n -"$2" | while read -r f; do rm -f -- "$1/$f"; done; }
prune "$BACKUP_DIR/daily" "$KEEP_DAILY"; prune "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"; prune "$BACKUP_DIR/monthly" "$KEEP_MONTHLY"

# Copia externa (maestro §9: copias externas y cifradas)
if [ -n "${OFFSITE_REMOTE:-}" ]; then rclone sync "$BACKUP_DIR" "$OFFSITE_REMOTE" || fail "fallo en la copia externa"; fi
echo "Backup OK: $OUT"
