#!/bin/bash
set -euo pipefail

CONTAINER="stock-lan-postgres"
DB_USER="stock"
DB_NAME="stock_lan"
BACKUP_DIR="/var/backups/stock-lan"
RCLONE_REMOTE="gdrive:stock-lan-backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE="stock_lan_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILE"

rclone copy "$BACKUP_DIR/$FILE" "$RCLONE_REMOTE" --create-empty-src-dirs

# mantem só os ultimos 30 dias localmente
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
