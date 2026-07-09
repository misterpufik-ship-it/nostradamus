"""Deploy published site files to BeGet hosting."""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

OBUCHENIE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = OBUCHENIE_ROOT.parent
SITE_DIR = OBUCHENIE_ROOT / "site"
SITE_GIT_PREFIX = SITE_DIR.relative_to(REPO_ROOT).as_posix()
DEPLOY_ENV = Path("/srv/deploy/projects/x-active-obuchenie/deploy.env")
DEPLOY_BIN = Path("/srv/deploy/bin/deploy-site")
DEPLOY_PROJECT = "x-active-obuchenie"


def _run(command: list[str], cwd: Path | None = None, timeout: int = 300) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def _load_deploy_env() -> dict[str, str]:
    if not DEPLOY_ENV.is_file():
        return {}
    values: dict[str, str] = {}
    for line in DEPLOY_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _ensure_remote_dirs(remote: str, hosting_path: str, relative_files: list[Path]) -> None:
    dirs = {hosting_path}
    for rel in relative_files:
        parent = rel.parent.as_posix()
        if parent and parent != ".":
            dirs.add(f"{hosting_path}/{parent}")
    for folder in sorted(dirs):
        _run(["ssh", remote, f"mkdir -p '{folder}'"], timeout=60)


def _rsync_publish_files(env: dict[str, str], files: list[Path]) -> subprocess.CompletedProcess[str]:
    hosting_user = env.get("HOSTING_USER", "")
    hosting_host = env.get("HOSTING_HOST", "")
    hosting_path = env.get("HOSTING_PATH", "")
    if not hosting_user or not hosting_host or not hosting_path:
        raise RuntimeError("В deploy.env не заданы HOSTING_USER/HOSTING_HOST/HOSTING_PATH.")

    remote = f"{hosting_user}@{hosting_host}"
    existing = [path for path in files if path.is_file()]
    if not existing:
        raise RuntimeError("Нет файлов для отправки на хостинг.")

    relative = [path.relative_to(SITE_DIR) for path in existing]
    _ensure_remote_dirs(remote, hosting_path, relative)

    last = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")
    for path, rel in zip(existing, relative, strict=True):
        target = f"{remote}:{hosting_path}/{rel.as_posix()}"
        last = _run(["rsync", "-az", str(path), target], timeout=300)
        if last.returncode != 0:
            return last
    return last


def _try_git_sync(material_id: str, paths_to_add: list[str]) -> str | None:
    _run(["git", "add", *paths_to_add], REPO_ROOT)

    status = _run(["git", "status", "--porcelain", f"{SITE_GIT_PREFIX}/"], REPO_ROOT)
    if not status.stdout.strip():
        return None

    commit = _run(["git", "commit", "-m", f"Publish lesson: {material_id}"], REPO_ROOT)
    if commit.returncode != 0:
        return None

    push = _run(["git", "push", "origin", "main"], REPO_ROOT, timeout=120)
    if push.returncode != 0:
        tail = (push.stderr or push.stdout or "").strip()
        if "could not read Username" in tail or "Authentication failed" in tail:
            return "GitHub push пропущен — урок уже на хостинге."
        return f"GitHub push не выполнен: {tail[:180]}"
    return None


SITE_SHELL_FILES = ["app.js", "index.html", "styles.css", "published-lessons.json"]


def auto_deploy(material_id: str, deploy_files: list[str] | None = None) -> dict[str, Any]:
    url = f"https://nostradamus-1503.ru/obuchenie/?lesson={material_id}"

    if not SITE_DIR.is_dir():
        return {"deployed": False, "message": "Папка site/ не найдена.", "url": url}

    rel_paths = list(deploy_files or ["published-lessons.json"])
    for shell_file in SITE_SHELL_FILES:
        if shell_file not in rel_paths:
            rel_paths.append(shell_file)
    abs_files = [(SITE_DIR / rel).resolve() for rel in rel_paths]
    abs_files = [path for path in abs_files if path.is_file() and str(path).startswith(str(SITE_DIR.resolve()))]

    if not abs_files and (SITE_DIR / "published-lessons.json").is_file():
        abs_files = [SITE_DIR / "published-lessons.json"]

    env = _load_deploy_env()
    if env:
        try:
            rsync = _rsync_publish_files(env, abs_files)
        except Exception as exc:  # noqa: BLE001
            return {"deployed": False, "message": str(exc), "url": url}

        if rsync.returncode != 0:
            tail = (rsync.stderr or rsync.stdout or "").strip()[-400:]
            if "Disk quota exceeded" in tail:
                return {
                    "deployed": False,
                    "message": "На хостинге закончилось место. Урок сохранён на сервере, но сайт не обновлён — освободите место на BeGet.",
                    "url": url,
                }
            return {"deployed": False, "message": f"Ошибка отправки на хостинг: {tail}", "url": url}

        git_paths = [f"{SITE_GIT_PREFIX}/{path.relative_to(SITE_DIR).as_posix()}" for path in abs_files]
        git_note = _try_git_sync(material_id, git_paths)
        message = "Урок опубликован и обновлён на сайте."
        if git_note:
            message = f"{message} {git_note}"
        return {"deployed": True, "message": message, "url": url}

    if DEPLOY_BIN.is_file():
        deploy = _run([str(DEPLOY_BIN), DEPLOY_PROJECT], REPO_ROOT, timeout=600)
        if deploy.returncode == 0:
            return {
                "deployed": True,
                "message": "Урок опубликован и сайт задеплоен на хостинг.",
                "url": url,
            }
        tail = (deploy.stderr or deploy.stdout or "").strip()[-400:]
        return {"deployed": False, "message": f"Ошибка деплоя: {tail}", "url": url}

    return {
        "deployed": False,
        "message": "Урок сохранён локально. Автодеплой доступен только на VPS.",
        "url": url,
    }
