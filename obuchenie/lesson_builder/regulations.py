"""Draft and published regulations catalogs."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from . import storage

ROOT = Path(__file__).resolve().parent
SITE_ROOT = ROOT.parent / "site"
DRAFTS_FILE = ROOT / "regulation-drafts.json"
PUBLISHED_FILE = SITE_ROOT / "published-regulations.json"


def _load_file(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    items = json.loads(path.read_text(encoding="utf-8-sig"))
    return items if isinstance(items, list) else []


def _save_file(path: Path, items: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def list_published() -> list[dict[str, Any]]:
    return _load_file(PUBLISHED_FILE)


def list_drafts() -> list[dict[str, Any]]:
    return _load_file(DRAFTS_FILE)


def list_catalog() -> list[dict[str, Any]]:
    published_ids = {item.get("id") for item in list_published()}
    catalog: list[dict[str, Any]] = []

    for item in list_drafts():
        entry = dict(item)
        entry["status"] = "published" if entry.get("id") in published_ids else "draft"
        catalog.append(entry)

    draft_ids = {item.get("id") for item in list_drafts()}
    for item in list_published():
        if item.get("id") in draft_ids:
            continue
        entry = dict(item)
        entry["status"] = "published"
        catalog.append(entry)

    return catalog


def _normalize_item(payload: dict[str, Any], *, existing_id: str = "") -> dict[str, Any]:
    title = str(payload.get("title") or "").strip()
    if not title:
        raise ValueError("Укажите название регламента.")

    reg_id = str(payload.get("id") or existing_id or "").strip()
    if not reg_id:
        reg_id = storage.slugify(title)
    if not reg_id:
        reg_id = f"reg-{uuid.uuid4().hex[:8]}"

    return {
        "id": reg_id,
        "title": title,
        "text": str(payload.get("text") or "").strip(),
        "url": str(payload.get("url") or "").strip(),
    }


def _stamp_user(item: dict[str, Any], user: dict[str, Any], *, created: bool = False) -> dict[str, Any]:
    login = str(user.get("login") or "")
    if created or not item.get("createdBy"):
        item["createdBy"] = login
    item["updatedBy"] = login
    return item


def _find_draft(regulation_id: str) -> tuple[int | None, dict[str, Any] | None]:
    items = list_drafts()
    index = next((i for i, entry in enumerate(items) if entry.get("id") == regulation_id), None)
    if index is None:
        return None, None
    return index, items[index]


def _find_published(regulation_id: str) -> tuple[int | None, dict[str, Any] | None]:
    items = list_published()
    index = next((i for i, entry in enumerate(items) if entry.get("id") == regulation_id), None)
    if index is None:
        return None, None
    return index, items[index]


def is_published(regulation_id: str) -> bool:
    return _find_published(regulation_id)[1] is not None


def create_draft(payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    item = _stamp_user(_normalize_item(payload), user, created=True)
    items = list_drafts()
    if any(entry.get("id") == item["id"] for entry in items):
        raise ValueError(f"Регламент с id «{item['id']}» уже существует.")
    items.append(item)
    _save_file(DRAFTS_FILE, items)
    item["status"] = "published" if is_published(item["id"]) else "draft"
    return item


def update_draft(regulation_id: str, payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    items = list_drafts()
    index, current = _find_draft(regulation_id)
    item = _stamp_user(_normalize_item(payload, existing_id=regulation_id), user)
    if item["id"] != regulation_id and any(entry.get("id") == item["id"] for entry in items):
        raise ValueError(f"Регламент с id «{item['id']}» уже существует.")

    if index is None:
        item = _stamp_user(item, user, created=True)
        items.append(item)
    else:
        item["createdBy"] = current.get("createdBy") or user.get("login")
        items[index] = item

    _save_file(DRAFTS_FILE, items)
    item["status"] = "published" if is_published(item["id"]) else "draft"
    return item


def guard_draft_write(user: dict[str, Any], regulation_id: str) -> None:
    if user.get("role") == "admin":
        return
    if is_published(regulation_id) and _find_draft(regulation_id)[1] is None:
        raise PermissionError("Редактирование опубликованного регламента доступно только администратору.")


def publish_draft(regulation_id: str, user: dict[str, Any]) -> dict[str, Any]:
    _ = user
    index, draft = _find_draft(regulation_id)
    if draft is None:
        raise FileNotFoundError(f"Черновик регламента не найден: {regulation_id}")

    published = list_published()
    public_item = {
        "id": draft["id"],
        "title": draft.get("title", ""),
        "text": draft.get("text", ""),
        "url": draft.get("url", ""),
    }
    pub_index, _ = _find_published(regulation_id)
    if pub_index is None:
        published.append(public_item)
    else:
        published[pub_index] = public_item
    _save_file(PUBLISHED_FILE, published)

    result = dict(draft)
    result["status"] = "published"
    return result


def update_published(regulation_id: str, payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    _ = user
    pub_index, current = _find_published(regulation_id)
    if current is None:
        raise FileNotFoundError(f"Опубликованный регламент не найден: {regulation_id}")

    item = _normalize_item(payload, existing_id=regulation_id)
    if item["id"] != regulation_id and any(entry.get("id") == item["id"] for entry in list_published()):
        raise ValueError(f"Регламент с id «{item['id']}» уже существует.")

    published = list_published()
    published[pub_index] = item
    _save_file(PUBLISHED_FILE, published)

    draft_index, draft = _find_draft(regulation_id)
    if draft is not None:
        merged = dict(draft)
        merged.update(item)
        drafts = list_drafts()
        drafts[draft_index] = merged
        _save_file(DRAFTS_FILE, drafts)

    item["status"] = "published"
    return item


def delete_draft(regulation_id: str) -> dict[str, Any]:
    items = list_drafts()
    removed = next((entry for entry in items if entry.get("id") == regulation_id), None)
    if not removed:
        raise FileNotFoundError(f"Черновик регламента не найден: {regulation_id}")
    _save_file(DRAFTS_FILE, [entry for entry in items if entry.get("id") != regulation_id])
    return removed


def delete_published(regulation_id: str) -> dict[str, Any]:
    items = list_published()
    removed = next((entry for entry in items if entry.get("id") == regulation_id), None)
    if not removed:
        raise FileNotFoundError(f"Опубликованный регламент не найден: {regulation_id}")
    _save_file(PUBLISHED_FILE, [entry for entry in items if entry.get("id") != regulation_id])
    return removed


# Backward-compatible aliases used by server imports during transition.
list_regulations = list_published
delete_regulation = delete_published
