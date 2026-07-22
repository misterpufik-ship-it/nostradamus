"""Publish lesson project into the training site."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from PIL import Image

from . import paths, storage
from .deploy_site import auto_deploy

SITE_ROOT = paths.site_data_root()
PUBLISHED_FILE = paths.published_lessons_file()
ASSETS_DIR = paths.lesson_assets_dir()
VIDEOS_DIR = paths.videos_dir()


def _looks_mojibake(text: str) -> bool:
    return "╨" in text or "╤" in text


def _load_published() -> list[dict[str, Any]]:
    if not PUBLISHED_FILE.is_file():
        return []
    items = json.loads(PUBLISHED_FILE.read_text(encoding="utf-8-sig"))
    return [item for item in items if not _looks_mojibake(str(item.get("topic", "")))]


def _save_published(items: list[dict[str, Any]]) -> None:
    PUBLISHED_FILE.parent.mkdir(parents=True, exist_ok=True)
    PUBLISHED_FILE.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def publish_to_site(project_id: str, *, skip_deploy: bool = False) -> dict[str, Any]:
    data = storage.load_project(project_id)
    if not data.get("steps"):
        raise RuntimeError("Добавьте хотя бы один шаг перед публикацией.")

    existing = _load_published()
    material_id = data.get("publishedId") or storage.slugify(data.get("title", "urok"))
    if not data.get("publishedId") and any(item.get("id") == material_id for item in existing):
        material_id = f"{material_id}-{project_id[-6:]}"

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

    video_rel = ""
    video_name = data.get("videoFile")
    if video_name:
        source_video = storage.project_dir(project_id) / video_name
        if source_video.is_file():
            target_video = VIDEOS_DIR / f"{material_id}.mp4"
            shutil.copy2(source_video, target_video)
            video_rel = f"./videos/{target_video.name}"
            # Видео не отправляем при каждой публикации — на хостинге мало места.
            # Если нужно видео на сайте, загрузите его отдельным деплоем.

    material_steps: list[dict[str, Any]] = []
    deploy_files = ["published-lessons.json", "published-regulations.json"]
    for index, step in enumerate(data.get("steps", []), start=1):
        step_images: list[dict[str, str]] = []
        for frame_index, frame in enumerate(storage.get_step_frames(step), start=1):
            asset_name = f"{material_id}_step_{index:02d}_{frame_index:02d}.png"
            source = storage.project_dir(project_id) / frame["frameFile"]
            if not source.is_file():
                raise FileNotFoundError(source)
            # Keep PNG clean for the site — interactive markers are rendered in app.js.
            shutil.copy2(source, ASSETS_DIR / asset_name)
            deploy_files.append(f"assets/{asset_name}")
            with Image.open(source) as img:
                image_width, image_height = img.size
            annotations = frame.get("annotations") or []
            interactive_annotations = [
                item
                for item in annotations
                if item.get("label") and item.get("type") in {"rect", "circle"}
            ]
            step_images.append(
                {
                    "image": f"./assets/{asset_name}",
                    "caption": step.get("comment", "") or step.get("title", ""),
                    "width": image_width,
                    "height": image_height,
                    "annotations": interactive_annotations,
                }
            )
        material_steps.append(
            {
                "title": step.get("title", f"Шаг {index}"),
                "why": step.get("why", ""),
                "action": step.get("action", ""),
                "result": step.get("result", ""),
                "image": step_images[0]["image"] if step_images else "",
                "images": step_images,
                "caption": step.get("comment", "") or step.get("title", ""),
            }
        )

    checklist = data.get("checklist") or [step.get("result", "") for step in data.get("steps", []) if step.get("result")]
    issues = data.get("issues") or []
    keywords = data.get("keywords") or ["инструкция", data.get("topic", "")]

    regulation_ids = [str(item).strip() for item in (data.get("regulationIds") or []) if str(item).strip()]

    material = {
        "id": material_id,
        "builderProjectId": project_id,
        "topic": data.get("topic", "Без темы"),
        "title": data.get("title", "Новый урок"),
        "description": data.get("description", ""),
        "role": data.get("role", "Склад / оператор"),
        "duration": data.get("duration", ""),
        "sourceVideo": video_rel,
        "videoNote": data.get("videoNote", "Исходное видео приложено к материалу."),
        "keywords": keywords,
        "steps": material_steps,
        "checklist": checklist,
        "issues": issues,
        "regulationIds": regulation_ids,
    }

    updated = [
        item
        for item in existing
        if item.get("id") != material_id and item.get("builderProjectId") != project_id
    ]
    updated.append(material)
    _save_published(updated)

    data["status"] = "published"
    data["statusMessage"] = f"Опубликовано в учебной базе: {material_id}"
    data["publishedId"] = material_id
    storage.save_project(data)

    if skip_deploy:
        return {
            "materialId": material_id,
            "sitePath": str(PUBLISHED_FILE.relative_to(SITE_ROOT.parent)),
            "steps": len(material_steps),
            "url": f"https://nostradamus-1503.ru/obuchenie/?lesson={material_id}",
            "deployed": False,
            "message": f"Каталог обновлён локально: {material_id}",
        }

    deploy_result = auto_deploy(material_id, deploy_files)
    status_message = deploy_result.get("message") or f"Опубликовано: {material_id}"
    data["statusMessage"] = status_message
    storage.save_project(data)

    return {
        "materialId": material_id,
        "sitePath": str(PUBLISHED_FILE.relative_to(SITE_ROOT.parent)),
        "steps": len(material_steps),
        "url": deploy_result.get("url") or f"https://nostradamus-1503.ru/obuchenie/?lesson={material_id}",
        "deployed": deploy_result.get("deployed", False),
        "message": status_message,
    }


def _remove_material_assets(material_id: str) -> None:
    if not material_id:
        return
    for path in ASSETS_DIR.glob(f"{material_id}_step_*.png"):
        path.unlink(missing_ok=True)


def unpublish_from_site(project_id: str) -> dict[str, Any]:
    data = storage.load_project(project_id)
    material_id = data.get("publishedId") or ""
    items = _load_published()
    removed: dict[str, Any] | None = None
    updated: list[dict[str, Any]] = []
    for item in items:
        same_project = item.get("builderProjectId") == project_id
        same_id = material_id and item.get("id") == material_id
        if same_project or same_id:
            removed = item
            continue
        updated.append(item)

    if not removed:
        raise RuntimeError("Этот проект не найден в учебной базе.")

    resolved_id = str(removed.get("id") or material_id or project_id)
    _save_published(updated)
    _remove_material_assets(resolved_id)

    data["status"] = "draft"
    data["statusMessage"] = f"Удалено из учебной базы: {resolved_id}"
    storage.save_project(data)

    deploy_result = auto_deploy(resolved_id, ["published-lessons.json"])
    return {
        "materialId": resolved_id,
        "removed": True,
        "deployed": deploy_result.get("deployed", False),
        "message": deploy_result.get("message") or f"Урок «{resolved_id}» удалён из учебной базы.",
        "url": f"https://nostradamus-1503.ru/obuchenie/",
    }


def update_published_lesson(material_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    items = _load_published()
    index = next((i for i, item in enumerate(items) if item.get("id") == material_id), None)
    if index is None:
        raise FileNotFoundError(f"Урок не найден: {material_id}")

    current = items[index]
    for key in ("topic", "title", "description", "role", "duration", "videoNote", "keywords", "steps", "checklist", "issues", "regulationIds"):
        if key in payload:
            current[key] = payload[key]
    items[index] = current
    _save_published(items)

    project_id = current.get("builderProjectId")
    if project_id:
        try:
            _sync_material_to_builder(project_id, current)
        except FileNotFoundError:
            pass

    deploy_result = auto_deploy(material_id, ["published-lessons.json"])
    return {
        "ok": True,
        "deployed": deploy_result.get("deployed", False),
        "message": deploy_result.get("message") or "Урок сохранён.",
    }


def _sync_material_to_builder(project_id: str, material: dict[str, Any]) -> None:
    data = storage.load_project(project_id)
    data["title"] = material.get("title", data.get("title", ""))
    data["topic"] = material.get("topic", data.get("topic", ""))
    data["description"] = material.get("description", data.get("description", ""))
    data["regulationIds"] = material.get("regulationIds", data.get("regulationIds", []))

    builder_steps = data.get("steps") or []
    for index, mat_step in enumerate(material.get("steps") or []):
        if index >= len(builder_steps):
            break
        builder_steps[index]["title"] = mat_step.get("title", builder_steps[index].get("title", ""))
        builder_steps[index]["why"] = mat_step.get("why", builder_steps[index].get("why", ""))
        builder_steps[index]["action"] = mat_step.get("action", builder_steps[index].get("action", ""))
        builder_steps[index]["result"] = mat_step.get("result", builder_steps[index].get("result", ""))
        caption = mat_step.get("caption") or mat_step.get("comment") or ""
        builder_steps[index]["comment"] = caption

    storage.save_project(data)
