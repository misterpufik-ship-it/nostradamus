"""Runtime paths for lesson builder data.

When BUILDER_DATA_DIR is set (production VPS), mutable data lives outside the
git working tree so `git reset --hard` / code deploys cannot wipe lessons,
regulations, packaging drafts or published catalogs.
"""

from __future__ import annotations

import os
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent
OBUCHENIE_ROOT = PACKAGE_ROOT.parent
REPO_SITE_ROOT = OBUCHENIE_ROOT / "site"


def data_dir() -> Path | None:
    raw = os.environ.get("BUILDER_DATA_DIR", "").strip()
    if not raw:
        return None
    path = Path(raw)
    path.mkdir(parents=True, exist_ok=True)
    return path


def projects_dir() -> Path:
    root = data_dir()
    path = (root / "projects") if root else (PACKAGE_ROOT / "projects")
    path.mkdir(parents=True, exist_ok=True)
    return path


def site_data_root() -> Path:
    """Published catalogs, assets and videos (mutable site content)."""
    root = data_dir()
    path = (root / "site") if root else REPO_SITE_ROOT
    path.mkdir(parents=True, exist_ok=True)
    return path


def repo_site_root() -> Path:
    """Static shell of the training site (HTML/CSS/JS from git)."""
    return REPO_SITE_ROOT


def regulation_drafts_file() -> Path:
    root = data_dir()
    return (root / "regulation-drafts.json") if root else (PACKAGE_ROOT / "regulation-drafts.json")


def packaging_drafts_file() -> Path:
    root = data_dir()
    return (root / "packaging-drafts.json") if root else (PACKAGE_ROOT / "packaging-drafts.json")


def packaging_types_file() -> Path:
    root = data_dir()
    return (root / "packaging-types.json") if root else (PACKAGE_ROOT / "packaging-types.json")


def published_lessons_file() -> Path:
    return site_data_root() / "published-lessons.json"


def published_regulations_file() -> Path:
    return site_data_root() / "published-regulations.json"


def published_packaging_file() -> Path:
    return site_data_root() / "published-packaging.json"


def lesson_assets_dir() -> Path:
    path = site_data_root() / "assets"
    path.mkdir(parents=True, exist_ok=True)
    return path


def regulation_assets_dir() -> Path:
    path = lesson_assets_dir() / "regulations"
    path.mkdir(parents=True, exist_ok=True)
    return path


def packaging_assets_dir() -> Path:
    path = lesson_assets_dir() / "packaging"
    path.mkdir(parents=True, exist_ok=True)
    return path


def videos_dir() -> Path:
    path = site_data_root() / "videos"
    path.mkdir(parents=True, exist_ok=True)
    return path


def is_mutable_site_rel(rel: str) -> bool:
    rel = rel.replace("\\", "/").lstrip("./")
    if rel in {
        "published-lessons.json",
        "published-regulations.json",
        "published-packaging.json",
    }:
        return True
    return rel.startswith("assets/") or rel.startswith("videos/")


def resolve_site_file(rel: str) -> Path:
    rel = rel.replace("\\", "/").lstrip("./")
    root = site_data_root() if is_mutable_site_rel(rel) else repo_site_root()
    return (root / rel).resolve()


def site_rel_for(path: Path) -> Path:
    resolved = path.resolve()
    for root in (site_data_root(), repo_site_root()):
        try:
            return resolved.relative_to(root.resolve())
        except ValueError:
            continue
    raise ValueError(f"Path is outside site roots: {path}")


def ensure_runtime_files() -> None:
    """Create empty catalogs if missing (fresh DATA_DIR)."""
    for path in (
        published_lessons_file(),
        published_regulations_file(),
        published_packaging_file(),
        regulation_drafts_file(),
        packaging_drafts_file(),
    ):
        if not path.is_file():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("[]\n", encoding="utf-8", newline="\n")
    projects_dir()
    lesson_assets_dir()
    regulation_assets_dir()
    packaging_assets_dir()
    videos_dir()
