"""Local project storage for lesson builder."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
PROJECTS_DIR = ROOT / "projects"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = value.strip().lower().replace("ё", "е")
    value = re.sub(r"[^a-z0-9а-я\-_\s]", "", value)
    value = re.sub(r"\s+", "-", value)
    return value[:60] or "urok"


def project_dir(project_id: str) -> Path:
    return PROJECTS_DIR / project_id


def project_file(project_id: str) -> Path:
    return project_dir(project_id) / "project.json"


def ensure_dirs(project_id: str) -> dict[str, Path]:
    base = project_dir(project_id)
    paths = {
        "root": base,
        "frames": base / "frames",
        "frames_unique": base / "frames_unique",
        "uploads": base / "uploads",
        "annotated": base / "annotated",
        "audio": base / "audio",
        "export": base / "export",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def new_project(title: str = "Новый урок", topic: str = "Без темы") -> dict[str, Any]:
    project_id = f"{slugify(title)}-{uuid.uuid4().hex[:8]}"
    ensure_dirs(project_id)
    data = {
        "id": project_id,
        "title": title,
        "topic": topic,
        "description": "",
        "role": "Склад / оператор",
        "duration": "",
        "videoNote": "",
        "keywords": [],
        "checklist": [],
        "issues": [],
        "regulationIds": [],
        "createdAt": _now(),
        "updatedAt": _now(),
        "videoFile": "",
        "status": "draft",
        "statusMessage": "Добавьте шаги и скриншоты (+ Скриншот или Ctrl+V). Видео необязательно.",
        "whisperModel": "base",
        "transcript": {"language": "ru", "fullText": "", "segments": []},
        "availableFrames": [],
        "steps": [],
    }
    save_project(data)
    return data


def load_project(project_id: str) -> dict[str, Any]:
    path = project_file(project_id)
    if not path.is_file():
        raise FileNotFoundError(f"Проект не найден: {project_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_project(data: dict[str, Any]) -> dict[str, Any]:
    data["updatedAt"] = _now()
    path = project_file(data["id"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data


def list_projects() -> list[dict[str, Any]]:
    if not PROJECTS_DIR.is_dir():
        return []
    items: list[dict[str, Any]] = []
    for folder in sorted(PROJECTS_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not folder.is_dir():
            continue
        meta = folder / "project.json"
        if not meta.is_file():
            continue
        try:
            data = json.loads(meta.read_text(encoding="utf-8"))
            items.append(
                {
                    "id": data.get("id", folder.name),
                    "title": data.get("title", folder.name),
                    "topic": data.get("topic", ""),
                    "updatedAt": data.get("updatedAt", ""),
                    "status": data.get("status", "draft"),
                    "stepsCount": len(data.get("steps", [])),
                }
            )
        except json.JSONDecodeError:
            continue
    return items


def update_status(project_id: str, status: str, message: str) -> None:
    data = load_project(project_id)
    data["status"] = status
    data["statusMessage"] = message
    save_project(data)


def rel_path(project_id: str, path: Path) -> str:
    return str(path.relative_to(project_dir(project_id))).replace("\\", "/")


def get_step_frames(step: dict[str, Any], *, migrate: bool = True) -> list[dict[str, Any]]:
    """Return screenshots for a step, migrating legacy single-frame fields when needed."""
    frames = step.get("frames")
    if isinstance(frames, list) and frames:
        return frames
    if migrate and step.get("frameFile"):
        migrated = [
            {
                "id": f"frame-{step.get('id', 'legacy')}-1",
                "frameFile": step["frameFile"],
                "annotations": step.get("annotations") or [],
            }
        ]
        step["frames"] = migrated
        return migrated
    if migrate and "frames" not in step:
        step["frames"] = []
    return step.get("frames") or []
