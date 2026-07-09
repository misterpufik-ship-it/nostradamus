"""Rebuild site/published-lessons.json from published builder projects."""

from __future__ import annotations

import json
import sys

from . import publish, storage


def list_published_projects() -> list[str]:
    project_ids: list[str] = []
    if not storage.PROJECTS_DIR.is_dir():
        return project_ids

    for path in sorted(storage.PROJECTS_DIR.iterdir()):
        if not path.is_dir():
            continue
        project_file = path / "project.json"
        if not project_file.is_file():
            continue
        data = json.loads(project_file.read_text(encoding="utf-8"))
        if data.get("status") == "published" and data.get("steps"):
            project_ids.append(path.name)
    return project_ids


def catalog_is_complete() -> bool:
    items = publish._load_published()
    project_ids = list_published_projects()
    if not project_ids:
        return bool(items)
    if not items:
        return False
    linked = {item.get("builderProjectId") for item in items}
    return all(project_id in linked for project_id in project_ids)


def rebuild_published_catalog(*, force: bool = False) -> int:
    project_ids = list_published_projects()
    if not project_ids:
        return 0
    if not force and catalog_is_complete():
        return 0

    if force:
        publish._save_published([])

    for project_id in project_ids:
        publish.publish_to_site(project_id, skip_deploy=True)
    return len(project_ids)


def main() -> int:
    force = "--force" in sys.argv[1:] or "--deploy" in sys.argv[1:]
    rebuilt = rebuild_published_catalog(force=force)
    if rebuilt:
        print(f"Rebuilt published catalog for {rebuilt} lesson(s).")
    else:
        print("Published catalog is up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
