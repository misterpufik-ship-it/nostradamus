"""Flask server for the local lesson builder."""

from __future__ import annotations

import mimetypes
import threading
import traceback
import uuid
from datetime import datetime
from datetime import timedelta
from pathlib import Path

from flask import Flask, jsonify, redirect, request, send_file, send_from_directory, session

from . import auth, export, packaging, pipeline, publish, regulations, storage
from .deploy_site import auto_deploy
from .ffmpeg_util import find_binary

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

app = Flask(__name__, static_folder=str(STATIC), static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # 1 GB
app.config["SECRET_KEY"] = auth.secret_key()
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=14)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

_CORS_ORIGINS = (
    "https://nostradamus-1503.ru",
    "http://nostradamus-1503.ru",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:8765",
    "http://localhost:8765",
)


@app.after_request
def _cors_headers(response):
    origin = request.headers.get("Origin", "")
    if origin in _CORS_ORIGINS or origin.endswith(".beget.app"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    if request.path == "/" or request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.route("/api/login", methods=["OPTIONS"])
def api_login_options():
    return ("", 204)


@app.route("/api/logout", methods=["OPTIONS"])
def api_logout_options():
    return ("", 204)


@app.route("/api/me", methods=["OPTIONS"])
def api_me_options():
    return ("", 204)


@app.post("/api/login")
def api_login():
    payload = request.get_json(silent=True) or {}
    login = str(payload.get("login") or "").strip()
    password = str(payload.get("password") or "")
    if not login or not password:
        return jsonify({"error": "Введите логин и пароль."}), 400

    user = auth.find_user(login)
    if not user or not auth.verify_password(user, password):
        return jsonify({"error": "Неверный логин или пароль."}), 401

    public = auth.login_user(user)
    return jsonify({"user": public})


@app.post("/api/logout")
@auth.require_login
def api_logout():
    auth.logout_user()
    return jsonify({"ok": True})


@app.get("/api/me")
def api_me():
    user = auth.current_user()
    if not user:
        return jsonify({"user": None}), 401
    return jsonify({"user": auth.public_user(user)})


@app.get("/api/auth/status")
def api_auth_status():
    user = auth.current_user()
    return jsonify(
        {
            "hasUsers": auth.users_exist(),
            "user": auth.public_user(user),
        }
    )


@app.post("/api/setup")
def api_setup():
    if auth.users_exist():
        return jsonify({"error": "Пользователи уже настроены."}), 403

    payload = request.get_json(silent=True) or {}
    login = str(payload.get("login") or "").strip()
    password = str(payload.get("password") or "")
    display_name = str(payload.get("displayName") or "").strip()
    confirm = str(payload.get("confirmPassword") or "")

    if password != confirm:
        return jsonify({"error": "Пароли не совпадают."}), 400

    try:
        user = auth.setup_initial_admin(login, password, display_name)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    public = auth.login_user(auth.find_user(user["login"]) or user)
    return jsonify({"user": public, "message": "Администратор создан. Можно добавить сотрудников в разделе «Пользователи»."})


@app.get("/api/users")
@auth.require_admin
def api_users_list():
    return jsonify(auth.list_public_users())


@app.post("/api/users")
@auth.require_admin
def api_users_create():
    payload = request.get_json(silent=True) or {}
    login = str(payload.get("login") or "").strip()
    password = str(payload.get("password") or "")
    role = str(payload.get("role") or "employee").strip()
    display_name = str(payload.get("displayName") or "").strip()

    try:
        user = auth.create_user(login, password, role=role, display_name=display_name)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify({"user": user, "message": f"Пользователь «{user['login']}» создан."})


@app.put("/api/users/<login>")
@auth.require_admin
def api_users_update(login: str):
    payload = request.get_json(silent=True) or {}
    password = str(payload.get("password") or "")
    role = payload.get("role")
    display_name = payload.get("displayName")

    try:
        user = auth.update_user(
            login,
            password=password,
            role=str(role).strip() if role is not None else None,
            display_name=str(display_name).strip() if display_name is not None else None,
            actor=auth.current_user(),
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    current = auth.current_user()
    if current and current.get("login") == user["login"]:
        auth.login_user(auth.find_user(user["login"]) or user)

    return jsonify({"user": user, "message": f"Пользователь «{user['login']}» обновлён."})


@app.delete("/api/users/<login>")
@auth.require_admin
def api_users_delete(login: str):
    try:
        auth.delete_user(login, actor=auth.current_user())
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify({"ok": True, "message": f"Пользователь «{login}» удалён."})


@app.route("/api/published-lessons", methods=["OPTIONS"])
def api_published_options_list():
    return ("", 204)


@app.route("/api/published-lessons/<material_id>", methods=["OPTIONS"])
def api_published_options_item(material_id: str):
    return ("", 204)


@app.route("/api/published-regulations", methods=["OPTIONS"])
def api_regulations_options_list():
    return ("", 204)


@app.route("/api/published-regulations/<regulation_id>", methods=["OPTIONS"])
def api_regulations_options_item(regulation_id: str):
    return ("", 204)


@app.route("/api/regulation-drafts", methods=["OPTIONS"])
def api_regulation_drafts_options_list():
    return ("", 204)


@app.route("/api/regulation-drafts/<regulation_id>", methods=["OPTIONS"])
def api_regulation_drafts_options_item(regulation_id: str):
    return ("", 204)


@app.route("/api/regulation-drafts/<regulation_id>/publish", methods=["OPTIONS"])
def api_regulation_publish_options(regulation_id: str):
    return ("", 204)


@app.get("/api/regulations/catalog")
@auth.require_login
def api_regulations_catalog():
    return jsonify(regulations.list_catalog())


@app.get("/api/regulation-drafts")
@auth.require_login
def api_list_regulation_drafts():
    return jsonify(regulations.list_drafts())


@app.get("/api/published-regulations")
@auth.require_login
def api_list_regulations():
    return jsonify(regulations.list_published())


@app.post("/api/regulation-drafts")
@auth.require_login
def api_create_regulation_draft():
    payload = request.get_json(silent=True) or {}
    user = auth.current_user()
    try:
        item = regulations.create_draft(payload, user)
        return jsonify({**item, "message": "Черновик регламента сохранён."}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.put("/api/regulation-drafts/<regulation_id>")
@auth.require_login
def api_update_regulation_draft(regulation_id: str):
    payload = request.get_json(silent=True) or {}
    user = auth.current_user()
    try:
        regulations.guard_draft_write(user, regulation_id)
        item = regulations.update_draft(regulation_id, payload, user)
        return jsonify({**item, "message": "Черновик регламента сохранён."})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except FileNotFoundError:
        return jsonify({"error": "Черновик регламента не найден"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.post("/api/regulation-drafts/<regulation_id>/publish")
@auth.require_admin
def api_publish_regulation_draft(regulation_id: str):
    user = auth.current_user()
    try:
        item = regulations.publish_draft(regulation_id, user)
        deploy_result = auto_deploy(regulation_id, ["published-regulations.json"])
        return jsonify(
            {
                **item,
                "deployed": deploy_result.get("deployed", False),
                "message": deploy_result.get("message") or "Регламент опубликован.",
            }
        )
    except FileNotFoundError:
        return jsonify({"error": "Черновик регламента не найден"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.put("/api/published-regulations/<regulation_id>")
@auth.require_admin
def api_update_regulation(regulation_id: str):
    payload = request.get_json(silent=True) or {}
    user = auth.current_user()
    try:
        item = regulations.update_published(regulation_id, payload, user)
        deploy_result = auto_deploy(regulation_id, ["published-regulations.json"])
        return jsonify(
            {
                **item,
                "deployed": deploy_result.get("deployed", False),
                "message": deploy_result.get("message") or "Регламент обновлён.",
            }
        )
    except FileNotFoundError:
        return jsonify({"error": "Опубликованный регламент не найден"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.delete("/api/regulation-drafts/<regulation_id>")
@auth.require_admin
def api_delete_regulation_draft(regulation_id: str):
    try:
        item = regulations.delete_draft(regulation_id)
        return jsonify({**item, "message": "Черновик регламента удалён."})
    except FileNotFoundError:
        return jsonify({"error": "Черновик регламента не найден"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.delete("/api/published-regulations/<regulation_id>")
@auth.require_admin
def api_delete_regulation(regulation_id: str):
    try:
        item = regulations.delete_published(regulation_id)
        deploy_result = auto_deploy(regulation_id, ["published-regulations.json"])
        return jsonify(
            {
                **item,
                "deployed": deploy_result.get("deployed", False),
                "message": deploy_result.get("message") or "Регламент удалён из базы.",
            }
        )
    except FileNotFoundError:
        return jsonify({"error": "Опубликованный регламент не найден"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/api/published-packaging", methods=["OPTIONS"])
def api_packaging_options_list():
    return ("", 204)


@app.route("/api/published-packaging/<item_id>", methods=["OPTIONS"])
def api_packaging_options_item(item_id: str):
    return ("", 204)


@app.route("/api/packaging-drafts", methods=["OPTIONS"])
def api_packaging_drafts_options_list():
    return ("", 204)


@app.route("/api/packaging-drafts/<item_id>", methods=["OPTIONS"])
def api_packaging_drafts_options_item(item_id: str):
    return ("", 204)


@app.route("/api/packaging-drafts/<item_id>/publish", methods=["OPTIONS"])
def api_packaging_publish_options(item_id: str):
    return ("", 204)


@app.route("/api/packaging-drafts/<item_id>/upload-image", methods=["OPTIONS"])
def api_packaging_upload_options(item_id: str):
    return ("", 204)


@app.route("/api/packaging-types", methods=["OPTIONS"])
def api_packaging_types_options():
    return ("", 204)


@app.get("/api/packaging/catalog")
@auth.require_login
def api_packaging_catalog():
    return jsonify(packaging.list_catalog())


@app.get("/api/packaging-types")
@auth.require_login
def api_list_packaging_types():
    return jsonify({"types": packaging.list_types()})


@app.put("/api/packaging-types")
@auth.require_login
def api_save_packaging_types():
    payload = request.get_json(silent=True) or {}
    try:
        types = packaging.save_types(payload)
        return jsonify({"types": types, "message": "Типы упаковки сохранены."})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.get("/api/packaging-drafts")
@auth.require_login
def api_list_packaging_drafts():
    return jsonify(packaging.list_drafts())


@app.get("/api/published-packaging")
@auth.require_login
def api_list_packaging():
    return jsonify(packaging.list_published())


@app.post("/api/packaging-drafts")
@auth.require_login
def api_create_packaging_draft():
    payload = request.get_json(silent=True) or {}
    user = auth.current_user()
    try:
        item = packaging.create_draft(payload, user)
        return jsonify({**item, "message": "Черновик упаковки сохранён."}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.put("/api/packaging-drafts/<item_id>")
@auth.require_login
def api_update_packaging_draft(item_id: str):
    payload = request.get_json(silent=True) or {}
    user = auth.current_user()
    try:
        packaging.guard_draft_write(user, item_id)
        item = packaging.update_draft(item_id, payload, user)
        return jsonify({**item, "message": "Черновик упаковки сохранён."})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except FileNotFoundError:
        return jsonify({"error": "Черновик упаковки не найден"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.post("/api/packaging-drafts/<item_id>/publish")
@auth.require_admin
def api_publish_packaging_draft(item_id: str):
    user = auth.current_user()
    try:
        item = packaging.publish_draft(item_id, user)
        deploy_result = auto_deploy(item_id, packaging.deploy_files_for(item))
        return jsonify(
            {
                **item,
                "deployed": deploy_result.get("deployed", False),
                "message": deploy_result.get("message") or "Упаковка опубликована.",
            }
        )
    except FileNotFoundError:
        return jsonify({"error": "Черновик упаковки не найден"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.put("/api/published-packaging/<item_id>")
@auth.require_admin
def api_update_packaging(item_id: str):
    payload = request.get_json(silent=True) or {}
    user = auth.current_user()
    try:
        item = packaging.update_published(item_id, payload, user)
        deploy_result = auto_deploy(item_id, packaging.deploy_files_for(item))
        return jsonify(
            {
                **item,
                "deployed": deploy_result.get("deployed", False),
                "message": deploy_result.get("message") or "Упаковка обновлена.",
            }
        )
    except FileNotFoundError:
        return jsonify({"error": "Опубликованная упаковка не найдена"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.delete("/api/packaging-drafts/<item_id>")
@auth.require_admin
def api_delete_packaging_draft(item_id: str):
    try:
        item = packaging.delete_draft(item_id)
        return jsonify({**item, "message": "Черновик упаковки удалён."})
    except FileNotFoundError:
        return jsonify({"error": "Черновик упаковки не найден"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.delete("/api/published-packaging/<item_id>")
@auth.require_admin
def api_delete_packaging(item_id: str):
    try:
        item = packaging.delete_published(item_id)
        deploy_result = auto_deploy(item_id, ["published-packaging.json"])
        return jsonify(
            {
                **item,
                "deployed": deploy_result.get("deployed", False),
                "message": deploy_result.get("message") or "Упаковка удалена из базы.",
            }
        )
    except FileNotFoundError:
        return jsonify({"error": "Опубликованная упаковка не найдена"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.post("/api/packaging-drafts/<item_id>/upload-image")
@auth.require_login
def api_upload_packaging_image(item_id: str):
    user = auth.current_user()
    try:
        packaging.guard_draft_write(user, item_id)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "Файл изображения не передан."}), 400

    try:
        saved = packaging.save_image(item_id, file.read(), file.filename)
        drafts = packaging.list_drafts()
        draft = next((entry for entry in drafts if entry.get("id") == item_id), None)
        if draft is None:
            raise FileNotFoundError(f"Черновик упаковки не найден: {item_id}")
        images = list(draft.get("images") or [])
        images.append(saved)
        updated = packaging.update_draft(item_id, {**draft, "images": images}, user)
        return jsonify({**saved, "item": updated, "message": "Фото добавлено."})
    except FileNotFoundError:
        return jsonify({"error": "Сначала сохраните черновик упаковки."}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.get("/api/published-lessons")
@auth.require_login
def api_list_published_lessons():
    return jsonify(publish._load_published())


@app.put("/api/published-lessons/<material_id>")
@auth.require_admin
def api_update_published_lesson(material_id: str):
    payload = request.get_json(silent=True) or {}
    try:
        result = publish.update_published_lesson(material_id, payload)
        return jsonify(result)
    except FileNotFoundError:
        return jsonify({"error": "Урок не найден в published-lessons.json"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.get("/login")
def login_page():
    if auth.current_user():
        return redirect("/")
    return send_from_directory(STATIC, "login.html")


@app.get("/")
def index():
    if not auth.current_user():
        return redirect("/login")
    return send_from_directory(STATIC, "index.html")


@app.get("/api/health")
def api_health():
    ffmpeg = find_binary("ffmpeg")
    ffprobe = find_binary("ffprobe")
    whisper_ok = False
    try:
        import faster_whisper  # noqa: F401

        whisper_ok = True
    except ImportError:
        whisper_ok = False

    return jsonify(
        {
            "localOnly": True,
            "ffmpeg": ffmpeg,
            "ffprobe": ffprobe,
            "ffmpegReady": bool(ffmpeg and ffprobe),
            "whisperReady": whisper_ok,
            "whisperModels": [
                {"id": model, "hint": pipeline.WHISPER_MODEL_HINTS.get(model, model)}
                for model in pipeline.WHISPER_MODELS
            ],
            "defaultWhisperModel": pipeline.whisper_settings()["model"],
        }
    )


@app.get("/api/projects")
@auth.require_login
def api_list_projects():
    return jsonify(storage.list_projects())


@app.post("/api/projects")
@auth.require_login
def api_create_project():
    payload = request.get_json(silent=True) or {}
    user = auth.current_user()
    project = storage.new_project(
        title=(payload.get("title") or "Новый урок").strip(),
        topic=(payload.get("topic") or "Без темы").strip(),
    )
    auth.stamp_new_project(user, project)
    storage.save_project(project)
    return jsonify(project), 201


@app.get("/api/projects/<project_id>")
@auth.require_login
def api_get_project(project_id: str):
    try:
        return jsonify(storage.load_project(project_id))
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404


@app.put("/api/projects/<project_id>")
@auth.require_login
def api_update_project(project_id: str):
    try:
        current = storage.load_project(project_id)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404

    payload = request.get_json(silent=True) or {}
    for key in (
        "title",
        "topic",
        "description",
        "role",
        "duration",
        "videoNote",
        "keywords",
        "checklist",
        "issues",
        "regulationIds",
        "steps",
        "whisperModel",
    ):
        if key in payload:
            current[key] = payload[key]
    try:
        auth.guard_project_write(auth.current_user(), current)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    return jsonify(storage.save_project(current))


@app.post("/api/projects/<project_id>/save")
@auth.require_login
def api_save_project(project_id: str):
    try:
        data = storage.load_project(project_id)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    try:
        auth.guard_project_write(auth.current_user(), data)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    return jsonify(storage.save_project(data))


@app.post("/api/projects/<project_id>/publish")
@auth.require_admin
def api_publish_project(project_id: str):
    try:
        result = publish.publish_to_site(project_id)
        return jsonify(result)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.post("/api/projects/<project_id>/unpublish")
@auth.require_admin
def api_unpublish_project(project_id: str):
    try:
        result = publish.unpublish_from_site(project_id)
        return jsonify(result)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.delete("/api/projects/<project_id>")
@auth.require_admin
def api_delete_project(project_id: str):
    try:
        data = storage.load_project(project_id)
        if data.get("status") == "published" or data.get("publishedId"):
            try:
                publish.unpublish_from_site(project_id)
            except Exception:  # noqa: BLE001
                pass
    except FileNotFoundError:
        pass

    folder = storage.project_dir(project_id)
    if folder.is_dir():
        import shutil

        shutil.rmtree(folder, ignore_errors=True)
    return jsonify({"ok": True})


@app.post("/api/projects/<project_id>/upload")
@auth.require_login
def api_upload_video(project_id: str):
    try:
        data = storage.load_project(project_id)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    try:
        auth.guard_project_write(auth.current_user(), data)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    file = request.files.get("video")
    if not file or not file.filename:
        return jsonify({"error": "Выберите видеофайл."}), 400

    suffix = Path(file.filename).suffix.lower() or ".mp4"
    if suffix not in {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}:
        return jsonify({"error": "Поддерживаются mp4, mov, mkv, webm, avi."}), 400

    paths = storage.ensure_dirs(project_id)
    target = paths["root"] / f"source{suffix}"
    file.save(target)

    data["videoFile"] = target.name
    data["status"] = "uploaded"
    data["statusMessage"] = f"Видео загружено: {file.filename}"
    storage.save_project(data)
    return jsonify(data)


_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def _save_step_image(project_id: str, data: dict, file_bytes: bytes, suffix: str, *, label: str) -> dict:
    paths = storage.ensure_dirs(project_id)
    uploads_dir = paths["uploads"]
    uploads_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    existing = len(list(uploads_dir.glob(f"manual_*{suffix}")))
    filename = f"manual_{stamp}_{existing + 1:02d}{suffix}"
    target = uploads_dir / filename
    target.write_bytes(file_bytes)

    rel = storage.rel_path(project_id, target)
    frame_entry = {"file": rel, "time": label, "source": "manual"}
    frames = data.get("availableFrames") or []
    if not any(item.get("file") == rel for item in frames):
        frames.append(frame_entry)
    data["availableFrames"] = frames
    return {"file": rel, "label": label}


@app.post("/api/projects/<project_id>/upload-image")
@auth.require_login
def api_upload_image(project_id: str):
    try:
        data = storage.load_project(project_id)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    try:
        auth.guard_project_write(auth.current_user(), data)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    file = request.files.get("image")
    if not file or not file.filename:
        return jsonify({"error": "Выберите изображение."}), 400

    suffix = Path(file.filename).suffix.lower() or ".png"
    if suffix == ".jfif":
        suffix = ".jpg"
    if suffix not in _IMAGE_SUFFIXES:
        return jsonify({"error": "Поддерживаются PNG, JPG, WEBP, GIF, BMP."}), 400

    apply_step = (request.form.get("applyToStep") or "").strip()
    label = (request.form.get("label") or "вручную").strip() or "вручную"
    saved = _save_step_image(project_id, data, file.read(), suffix, label=label)

    if apply_step:
        for step in data.get("steps", []):
            if step.get("id") == apply_step:
                frames = storage.get_step_frames(step)
                if frames and frames[-1].get("frameFile") == saved["file"]:
                    saved["frameId"] = frames[-1].get("id")
                    break
                frame_id = f"frame-{uuid.uuid4().hex[:8]}"
                new_frame = {"id": frame_id, "frameFile": saved["file"], "annotations": []}
                step["frames"].append(new_frame)
                step["frameFile"] = saved["file"]
                saved["frameId"] = frame_id
                break

    data["statusMessage"] = f"Изображение добавлено: {saved['file'].split('/')[-1]}"
    storage.save_project(data)
    return jsonify(data)


def _run_pipeline(project_id: str) -> None:
    try:
        pipeline.process_project(project_id)
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        try:
            data = storage.load_project(project_id)
            data["status"] = "error"
            data["statusMessage"] = str(exc)
            storage.save_project(data)
        except FileNotFoundError:
            pass


@app.post("/api/projects/<project_id>/reclean-transcript")
@auth.require_login
def api_reclean_transcript(project_id: str):
    try:
        data = storage.load_project(project_id)
        auth.guard_project_write(auth.current_user(), data)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    try:
        data = pipeline.reclean_project_transcript(project_id)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.post("/api/projects/<project_id>/process")
@auth.require_login
def api_process(project_id: str):
    try:
        data = storage.load_project(project_id)
    except FileNotFoundError:
        return jsonify({"error": "Проект не найден"}), 404
    try:
        auth.guard_project_write(auth.current_user(), data)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    if not data.get("videoFile"):
        return jsonify({"error": "Сначала загрузите видео."}), 400
    if data.get("status") == "processing":
        return jsonify({"error": "Обработка уже выполняется."}), 409

    data["status"] = "processing"
    data["statusMessage"] = "Запуск обработки…"
    storage.save_project(data)
    threading.Thread(target=_run_pipeline, args=(project_id,), daemon=True).start()
    return jsonify({"ok": True})


@app.get("/api/projects/<project_id>/files/<path:rel_path>")
@auth.require_login
def api_project_file(project_id: str, rel_path: str):
    base = storage.project_dir(project_id).resolve()
    target = (base / rel_path).resolve()
    if not str(target).startswith(str(base)) or not target.is_file():
        return jsonify({"error": "Файл не найден"}), 404
    mime, _ = mimetypes.guess_type(str(target))
    return send_file(target, mimetype=mime or "application/octet-stream")


@app.post("/api/projects/<project_id>/export/html")
@auth.require_login
def api_export_html(project_id: str):
    try:
        path = export.export_html(project_id)
        return send_file(path, as_attachment=True, download_name="instruction.html")
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


@app.post("/api/projects/<project_id>/export/pdf")
@auth.require_login
def api_export_pdf(project_id: str):
    try:
        path = export.export_pdf(project_id)
        return send_file(path, as_attachment=True, download_name="instruction.pdf")
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


@app.get("/api/projects/<project_id>/export/snippet")
@auth.require_login
def api_export_snippet(project_id: str):
    try:
        snippet = export.export_app_js_snippet(project_id)
        return jsonify({"snippet": snippet})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


def main() -> None:
    storage.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    print("Разработка урока: http://127.0.0.1:8765")
    app.run(host="127.0.0.1", port=8765, debug=False, threaded=True)


if __name__ == "__main__":
    main()
