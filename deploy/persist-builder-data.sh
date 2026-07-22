#!/usr/bin/env bash
# Migrate mutable training data outside the git tree WITHOUT wiping richer copies.
# Also protect BeGet catalogs from code-deploy overwrite via RSYNC_EXCLUDES.
set -euo pipefail

PROJECT_DIR=/srv/deploy/projects/x-active-obuchenie
DATA_DIR="$PROJECT_DIR/data"
REPO_OBUCHENIE="$PROJECT_DIR/repo/obuchenie"
REPO_SITE="$REPO_OBUCHENIE/site"
LB="$REPO_OBUCHENIE/lesson_builder"
DEPLOY_ENV="$PROJECT_DIR/deploy.env"

mkdir -p "$DATA_DIR/projects" "$DATA_DIR/site/assets/regulations" "$DATA_DIR/site/assets/packaging" "$DATA_DIR/site/videos" "$DATA_DIR/site/from-beget"

prefer_file() {
  local src="$1"
  local dst="$2"
  if [[ ! -e "$src" ]]; then
    return 0
  fi
  if [[ ! -e "$dst" ]]; then
    cp -a "$src" "$dst"
    echo "Copied: $src -> $dst"
    return 0
  fi
  if [[ -f "$src" && -f "$dst" ]]; then
    local src_size dst_size
    src_size=$(wc -c <"$src")
    dst_size=$(wc -c <"$dst")
    if (( src_size > dst_size )); then
      cp -a "$src" "$dst"
      echo "Updated (larger): $src -> $dst ($src_size > $dst_size)"
    else
      echo "Kept existing: $dst (size $dst_size >= $src_size)"
    fi
  fi
}

# 1) Prefer live BeGet catalogs if reachable (never lose hosting data)
if [[ -f "$DEPLOY_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$DEPLOY_ENV"
  set +a
  if [[ -n "${HOSTING_USER:-}" && -n "${HOSTING_HOST:-}" && -n "${HOSTING_PATH:-}" ]]; then
    echo "Fetching catalogs from BeGet (read-only)..."
    rsync -az \
      "$HOSTING_USER@$HOSTING_HOST:$HOSTING_PATH/published-lessons.json" \
      "$HOSTING_USER@$HOSTING_HOST:$HOSTING_PATH/published-regulations.json" \
      "$HOSTING_USER@$HOSTING_HOST:$HOSTING_PATH/published-packaging.json" \
      "$DATA_DIR/site/from-beget/" 2>/dev/null || echo "BeGet catalog fetch skipped/failed (ok if offline)"
    for name in published-lessons.json published-regulations.json published-packaging.json; do
      prefer_file "$DATA_DIR/site/from-beget/$name" "$DATA_DIR/site/$name"
    done
    # Pull packaging/regulation assets from BeGet without deleting local extras
    rsync -az \
      "$HOSTING_USER@$HOSTING_HOST:$HOSTING_PATH/assets/" \
      "$DATA_DIR/site/assets/" 2>/dev/null || echo "BeGet assets fetch skipped/failed"
  fi
fi

# 2) Merge from current repo working copies (prefer larger)
prefer_file "$LB/regulation-drafts.json" "$DATA_DIR/regulation-drafts.json"
prefer_file "$LB/packaging-drafts.json" "$DATA_DIR/packaging-drafts.json"
prefer_file "$LB/packaging-types.json" "$DATA_DIR/packaging-types.json"
for name in published-lessons.json published-regulations.json published-packaging.json; do
  prefer_file "$REPO_SITE/$name" "$DATA_DIR/site/$name"
done

# 3) Sync dirs without --delete (never remove existing data files)
if [[ -d "$REPO_SITE/assets" ]]; then
  rsync -a "$REPO_SITE/assets/" "$DATA_DIR/site/assets/"
fi
if [[ -d "$REPO_SITE/videos" ]]; then
  rsync -a "$REPO_SITE/videos/" "$DATA_DIR/site/videos/"
fi
if [[ -d "$LB/projects" ]]; then
  rsync -a "$LB/projects/" "$DATA_DIR/projects/"
fi

# 4) Seed empty catalogs ONLY if still missing
for name in published-lessons.json published-regulations.json published-packaging.json; do
  if [[ ! -f "$DATA_DIR/site/$name" ]]; then
    echo '[]' >"$DATA_DIR/site/$name"
    echo "Seeded empty: $name"
  fi
done
for name in regulation-drafts.json packaging-drafts.json; do
  if [[ ! -f "$DATA_DIR/$name" ]]; then
    echo '[]' >"$DATA_DIR/$name"
    echo "Seeded empty: $name"
  fi
done

chown -R deploy:deploy "$DATA_DIR"

# 5) Patch shared deploy-site for RSYNC_EXCLUDES (idempotent)
DEPLOY_SITE=/srv/deploy/bin/deploy-site
if [[ -f "$DEPLOY_SITE" ]] && ! grep -q 'RSYNC_EXCLUDES' "$DEPLOY_SITE"; then
  python3 - <<'PY'
from pathlib import Path
path = Path("/srv/deploy/bin/deploy-site")
text = path.read_text(encoding="utf-8")
needle = 'rsync -az "${RSYNC_DELETE[@]}" "${DEFAULT_EXCLUDES[@]}" "$REPO_DIR/$SOURCE_DIR/" "$REMOTE:$HOSTING_PATH/"'
insert = '''EXTRA_EXCLUDES=()
if [[ -n "${RSYNC_EXCLUDES:-}" ]]; then
  IFS=',' read -ra _rsync_items <<< "$RSYNC_EXCLUDES"
  for item in "${_rsync_items[@]}"; do
    item="${item#"${item%%[![:space:]]*}"}"
    item="${item%"${item##*[![:space:]]}"}"
    [[ -n "$item" ]] && EXTRA_EXCLUDES+=("--exclude=$item")
  done
fi

rsync -az "${RSYNC_DELETE[@]}" "${DEFAULT_EXCLUDES[@]}" "${EXTRA_EXCLUDES[@]}" "$REPO_DIR/$SOURCE_DIR/" "$REMOTE:$HOSTING_PATH/"'''
if needle not in text:
    raise SystemExit("deploy-site rsync line not found; patch skipped")
path.write_text(text.replace(needle, insert, 1), encoding="utf-8")
print("Patched deploy-site for RSYNC_EXCLUDES")
PY
fi

# 6) Update deploy.env — protect live catalogs on BeGet
python3 - <<'PY'
from pathlib import Path
path = Path("/srv/deploy/projects/x-active-obuchenie/deploy.env")
lines = path.read_text(encoding="utf-8").splitlines()
wanted = {
    "DELETE_REMOTE": "false",
    "RSYNC_EXCLUDES": "published-lessons.json,published-regulations.json,published-packaging.json,assets/,videos/",
    "BUILD_COMMAND": "/srv/deploy/projects/x-active-obuchenie/bin/rebuild-published.sh",
}
out = []
seen = set()
for line in lines:
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    key = line.split("=", 1)[0].strip()
    if key in wanted:
        out.append(f"{key}={wanted[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in wanted.items():
    if key not in seen:
        out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print("Updated deploy.env")
PY

# 7) rebuild-published: never force-clear catalogs
cat > "$PROJECT_DIR/bin/rebuild-published.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
export BUILDER_DATA_DIR=/srv/deploy/projects/x-active-obuchenie/data
export BUILDER_USERS_FILE=/srv/deploy/projects/x-active-obuchenie/users.json
cd /srv/deploy/projects/x-active-obuchenie/repo/obuchenie
/srv/deploy/projects/x-active-obuchenie/venv/bin/python - <<'PY'
from lesson_builder import paths, rebuild_published
paths.ensure_runtime_files()
n = rebuild_published.rebuild_published_catalog(force=False)
print(f"Published catalog ensure done (rebuilt={n}).")
for label, fn in [
    ("lessons", paths.published_lessons_file),
    ("regulations", paths.published_regulations_file),
    ("packaging", paths.published_packaging_file),
]:
    p = fn()
    try:
        import json
        items = json.loads(p.read_text(encoding="utf-8-sig")) if p.is_file() else []
        count = len(items) if isinstance(items, list) else "?"
    except Exception:
        count = "?"
    print(f"{label}: {p} items={count}")
print(f"projects={paths.projects_dir()}")
PY
SH
chmod +x "$PROJECT_DIR/bin/rebuild-published.sh"

# 8) systemd drop-in for BUILDER_DATA_DIR
mkdir -p /etc/systemd/system/x-active-lesson-builder.service.d
cat > /etc/systemd/system/x-active-lesson-builder.service.d/data-dir.conf <<'EOF'
[Service]
Environment=BUILDER_DATA_DIR=/srv/deploy/projects/x-active-obuchenie/data
EOF

echo "=== DATA SUMMARY ==="
python3 - <<'PY'
import json
from pathlib import Path
data = Path("/srv/deploy/projects/x-active-obuchenie/data")
for rel in [
    "site/published-lessons.json",
    "site/published-regulations.json",
    "site/published-packaging.json",
    "regulation-drafts.json",
    "packaging-drafts.json",
]:
    p = data / rel
    if not p.is_file():
        print(rel, "MISSING")
        continue
    raw = p.read_text(encoding="utf-8-sig")
    try:
        obj = json.loads(raw)
        n = len(obj) if isinstance(obj, list) else type(obj).__name__
    except Exception as exc:
        n = f"parse-error:{exc}"
    print(f"{rel}: bytes={p.stat().st_size} items={n}")
projects = data / "projects"
print("projects dirs:", len([p for p in projects.iterdir() if p.is_dir()]) if projects.is_dir() else 0)
PY

echo "Persistent data ready at $DATA_DIR"
echo "Run: systemctl daemon-reload && systemctl restart x-active-lesson-builder"
