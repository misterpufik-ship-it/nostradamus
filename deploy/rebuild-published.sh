#!/usr/bin/env bash
set -euo pipefail
cd /srv/deploy/projects/x-active-obuchenie/repo/obuchenie
/srv/deploy/projects/x-active-obuchenie/venv/bin/python -m lesson_builder.rebuild_published --deploy
