"""Draft and published packaging catalog (Упаковка)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from . import storage

ROOT = Path(__file__).resolve().parent
SITE_ROOT = ROOT.parent / "site"
DRAFTS_FILE = ROOT / "packaging-drafts.json"
PUBLISHED_FILE = SITE_ROOT / "published-packaging.json"
TYPES_FILE = ROOT / "packaging-types.json"
ASSETS_DIR = SITE_ROOT / "assets" / "packaging"
_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
DEFAULT_PACKAGING_TYPES = [
    "Курьер пакет",
    "Зип Пакет",
    "Коробка",
    "Заводская упаковка",
    "Другое",
]


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


def _normalize_string_list(raw: Any, *, legacy: Any = None) -> list[str]:
    values: list[str] = []
    if isinstance(raw, list):
        for entry in raw:
            text = str(entry or "").strip()
            if text and text not in values:
                values.append(text)
    elif isinstance(raw, str) and raw.strip():
        values.append(raw.strip())

    if not values and legacy is not None:
        legacy_text = str(legacy or "").strip()
        if legacy_text:
            values.append(legacy_text)
    return values


def list_types() -> list[str]:
    if not TYPES_FILE.is_file():
        return list(DEFAULT_PACKAGING_TYPES)
    raw = json.loads(TYPES_FILE.read_text(encoding="utf-8-sig"))
    if isinstance(raw, dict):
        raw = raw.get("types")
    values = _normalize_string_list(raw)
    return values or list(DEFAULT_PACKAGING_TYPES)


def save_types(payload: Any) -> list[str]:
    if isinstance(payload, dict):
        payload = payload.get("types")
    values = _normalize_string_list(payload)
    if not values:
        raise ValueError("Добавьте хотя бы один тип упаковки.")
    TYPES_FILE.parent.mkdir(parents=True, exist_ok=True)
    TYPES_FILE.write_text(
        json.dumps(values, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return values


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


def _normalize_images(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    images: list[dict[str, str]] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        image = str(entry.get("image") or "").strip()
        if not image:
            continue
        images.append(
            {
                "image": image,
                "caption": str(entry.get("caption") or "").strip(),
            }
        )
    return images


def _normalize_item(payload: dict[str, Any], *, existing_id: str = "") -> dict[str, Any]:
    name = str(payload.get("name") or payload.get("title") or "").strip()
    if not name:
        raise ValueError("Укажите название упаковки.")

    packaging_type = str(payload.get("packagingType") or payload.get("type") or "").strip()
    if not packaging_type or packaging_type == "Тип упаковки":
        raise ValueError("Выберите тип упаковки.")

    item_id = str(payload.get("id") or existing_id or "").strip()
    if not item_id:
        item_id = storage.slugify(name)
    if not item_id:
        item_id = f"pkg-{uuid.uuid4().hex[:8]}"

    articles = _normalize_string_list(payload.get("articles"), legacy=payload.get("article"))
    barcodes = _normalize_string_list(payload.get("barcodes"), legacy=payload.get("barcode"))

    return {
        "id": item_id,
        "name": name,
        "packagingType": packaging_type,
        "articles": articles,
        "barcodes": barcodes,
        "text": str(payload.get("text") or "").strip(),
        "images": _normalize_images(payload.get("images")),
    }


def _public_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "name": item.get("name", ""),
        "packagingType": item.get("packagingType", ""),
        "articles": _normalize_string_list(item.get("articles"), legacy=item.get("article")),
        "barcodes": _normalize_string_list(item.get("barcodes"), legacy=item.get("barcode")),
        "text": item.get("text", ""),
        "images": _normalize_images(item.get("images")),
    }


def _stamp_user(item: dict[str, Any], user: dict[str, Any], *, created: bool = False) -> dict[str, Any]:
    login = str(user.get("login") or "")
    if created or not item.get("createdBy"):
        item["createdBy"] = login
    item["updatedBy"] = login
    return item


def _find_draft(item_id: str) -> tuple[int | None, dict[str, Any] | None]:
    items = list_drafts()
    index = next((i for i, entry in enumerate(items) if entry.get("id") == item_id), None)
    if index is None:
        return None, None
    return index, items[index]


def _find_published(item_id: str) -> tuple[int | None, dict[str, Any] | None]:
    items = list_published()
    index = next((i for i, entry in enumerate(items) if entry.get("id") == item_id), None)
    if index is None:
        return None, None
    return index, items[index]


def is_published(item_id: str) -> bool:
    return _find_published(item_id)[1] is not None


def create_draft(payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    item = _stamp_user(_normalize_item(payload), user, created=True)
    items = list_drafts()
    if any(entry.get("id") == item["id"] for entry in items):
        raise ValueError(f"Упаковка с id «{item['id']}» уже существует.")
    items.append(item)
    _save_file(DRAFTS_FILE, items)
    item["status"] = "published" if is_published(item["id"]) else "draft"
    return item


def update_draft(item_id: str, payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    items = list_drafts()
    index, current = _find_draft(item_id)
    item = _stamp_user(_normalize_item(payload, existing_id=item_id), user)
    if item["id"] != item_id and any(entry.get("id") == item["id"] for entry in items):
        raise ValueError(f"Упаковка с id «{item['id']}» уже существует.")

    if index is None:
        item = _stamp_user(item, user, created=True)
        items.append(item)
    else:
        item["createdBy"] = current.get("createdBy") or user.get("login")
        items[index] = item

    _save_file(DRAFTS_FILE, items)
    item["status"] = "published" if is_published(item["id"]) else "draft"
    return item


def guard_draft_write(user: dict[str, Any], item_id: str) -> None:
    if user.get("role") == "admin":
        return
    if is_published(item_id) and _find_draft(item_id)[1] is None:
        raise PermissionError("Редактирование опубликованной упаковки доступно только администратору.")


def publish_draft(item_id: str, user: dict[str, Any]) -> dict[str, Any]:
    _ = user
    _index, draft = _find_draft(item_id)
    if draft is None:
        raise FileNotFoundError(f"Черновик упаковки не найден: {item_id}")

    published = list_published()
    public_item = _public_item(draft)
    pub_index, _ = _find_published(item_id)
    if pub_index is None:
        published.append(public_item)
    else:
        published[pub_index] = public_item
    _save_file(PUBLISHED_FILE, published)

    result = dict(draft)
    result["status"] = "published"
    return result


def update_published(item_id: str, payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    _ = user
    pub_index, current = _find_published(item_id)
    if current is None:
        raise FileNotFoundError(f"Опубликованная упаковка не найдена: {item_id}")

    item = _normalize_item(payload, existing_id=item_id)
    if item["id"] != item_id and any(entry.get("id") == item["id"] for entry in list_published()):
        raise ValueError(f"Упаковка с id «{item['id']}» уже существует.")

    published = list_published()
    published[pub_index] = item
    _save_file(PUBLISHED_FILE, published)

    draft_index, draft = _find_draft(item_id)
    if draft is not None:
        merged = dict(draft)
        merged.update(item)
        drafts = list_drafts()
        drafts[draft_index] = merged
        _save_file(DRAFTS_FILE, drafts)

    item["status"] = "published"
    return item


def delete_draft(item_id: str) -> dict[str, Any]:
    items = list_drafts()
    removed = next((entry for entry in items if entry.get("id") == item_id), None)
    if not removed:
        raise FileNotFoundError(f"Черновик упаковки не найден: {item_id}")
    _save_file(DRAFTS_FILE, [entry for entry in items if entry.get("id") != item_id])
    return removed


def delete_published(item_id: str) -> dict[str, Any]:
    items = list_published()
    removed = next((entry for entry in items if entry.get("id") == item_id), None)
    if not removed:
        raise FileNotFoundError(f"Опубликованная упаковка не найдена: {item_id}")
    _save_file(PUBLISHED_FILE, [entry for entry in items if entry.get("id") != item_id])
    return removed


def deploy_files_for(item: dict[str, Any] | None) -> list[str]:
    paths = ["published-packaging.json"]
    if not item:
        return paths
    for entry in _normalize_images(item.get("images")):
        rel = entry["image"]
        if rel.startswith("./"):
            rel = rel[2:]
        if rel and not rel.startswith("http"):
            paths.append(rel)
    return paths


def save_image(item_id: str, file_bytes: bytes, filename: str) -> dict[str, str]:
    suffix = Path(filename).suffix.lower()
    if suffix not in _IMAGE_SUFFIXES:
        raise ValueError("Поддерживаются изображения: PNG, JPG, WEBP, GIF, BMP.")
    if not item_id:
        raise ValueError("Сначала сохраните черновик упаковки.")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    existing = len(list(ASSETS_DIR.glob(f"{item_id}_*{suffix}")))
    safe_name = f"{item_id}_{stamp}_{existing + 1:02d}{suffix}"
    target = ASSETS_DIR / safe_name
    target.write_bytes(file_bytes)
    return {"image": f"./assets/packaging/{safe_name}", "caption": ""}
