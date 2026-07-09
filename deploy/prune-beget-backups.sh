#!/usr/bin/env bash
set -euo pipefail

KEEP="${1:-2}"
BACKUP_ROOT="${BACKUP_ROOT:-/home/m/mrpuffch/deploy_backups/x-active-obuchenie}"

if [[ ! -d "$BACKUP_ROOT" ]]; then
  exit 0
fi

mapfile -t backups < <(ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null || true)
if ((${#backups[@]} <= KEEP)); then
  exit 0
fi

for path in "${backups[@]:KEEP}"; do
  rm -rf "$path"
done
