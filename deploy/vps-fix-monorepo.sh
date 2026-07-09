#!/usr/bin/env bash
set -euo pipefail

cat > /srv/deploy/projects/x-active-obuchenie/deploy.env <<'ENV'
REPO_URL=https://github.com/misterpufik-ship-it/nostradamus.git
BRANCH=main

HOSTING_USER=mrpuffch
HOSTING_HOST=mrpuffch.beget.tech
HOSTING_PATH=/home/m/mrpuffch/nostradamus-1503.ru/public_html/obuchenie
BACKUP_PATH=/home/m/mrpuffch/deploy_backups/x-active-obuchenie

SOURCE_DIR=obuchenie/site
DELETE_REMOTE=false
BUILD_COMMAND=/srv/deploy/projects/x-active-obuchenie/bin/rebuild-published.sh
ENV

cat > /srv/deploy/projects/x-active-obuchenie/bin/rebuild-published.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
cd /srv/deploy/projects/x-active-obuchenie/repo/obuchenie
/srv/deploy/projects/x-active-obuchenie/venv/bin/python -m lesson_builder.rebuild_published
SH
chmod +x /srv/deploy/projects/x-active-obuchenie/bin/rebuild-published.sh

REPO=/srv/deploy/projects/x-active-obuchenie/repo
sudo -u deploy git -C "$REPO" remote set-url origin https://github.com/misterpufik-ship-it/nostradamus.git
sudo -u deploy git -C "$REPO" fetch origin main
sudo -u deploy git -C "$REPO" checkout -B main origin/main
sudo -u deploy /srv/deploy/bin/deploy-site x-active-obuchenie
