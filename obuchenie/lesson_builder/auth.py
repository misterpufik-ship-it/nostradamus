"""Session auth and role checks for the lesson builder."""

from __future__ import annotations

import json
import os
import re
from functools import wraps
from pathlib import Path
from typing import Any, Callable

from flask import jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent
DEFAULT_USERS_FILE = ROOT / "users.json"

ROLES = {"admin", "employee"}
LOGIN_RE = re.compile(r"^[a-z0-9._-]+$")


def users_file() -> Path:
    custom = os.environ.get("BUILDER_USERS_FILE", "").strip()
    return Path(custom) if custom else DEFAULT_USERS_FILE


def secret_key() -> str:
    value = os.environ.get("BUILDER_SECRET_KEY", "").strip()
    if value:
        return value
    return "dev-only-change-me"


def load_users() -> list[dict[str, Any]]:
    path = users_file()
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict) and item.get("login")]


def find_user(login: str) -> dict[str, Any] | None:
    login = login.strip().lower()
    for user in load_users():
        if str(user.get("login", "")).strip().lower() == login:
            return user
    return None


def verify_password(user: dict[str, Any], password: str) -> bool:
    stored = str(user.get("passwordHash") or "")
    if not stored or not password:
        return False
    return check_password_hash(stored, password)


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def users_exist() -> bool:
    return bool(load_users())


def save_users(users: list[dict[str, Any]]) -> None:
    path = users_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(users, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_login(login: str) -> str:
    value = login.strip().lower()
    if len(value) < 2:
        raise ValueError("Логин должен быть не короче 2 символов.")
    if len(value) > 40:
        raise ValueError("Логин не длиннее 40 символов.")
    if not LOGIN_RE.fullmatch(value):
        raise ValueError("Логин: латиница, цифры, точка, дефис или подчёркивание.")
    return value


def validate_password(password: str, *, required: bool = True) -> None:
    if not password:
        if required:
            raise ValueError("Введите пароль.")
        return
    if len(password) < 6:
        raise ValueError("Пароль должен быть не короче 6 символов.")


def public_from_record(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "login": str(user.get("login") or ""),
        "role": str(user.get("role") or "employee"),
        "displayName": str(user.get("displayName") or user.get("login") or ""),
    }


def list_public_users() -> list[dict[str, Any]]:
    return [public_from_record(user) for user in load_users()]


def count_admins(users: list[dict[str, Any]] | None = None) -> int:
    items = load_users() if users is None else users
    return sum(1 for user in items if user.get("role") == "admin")


def create_user(login: str, password: str, role: str = "employee", display_name: str = "") -> dict[str, Any]:
    login = normalize_login(login)
    validate_password(password, required=True)
    if role not in ROLES:
        raise ValueError("Недопустимая роль.")

    users = load_users()
    if find_user(login):
        raise ValueError("Пользователь с таким логином уже есть.")

    entry = {
        "login": login,
        "passwordHash": hash_password(password),
        "role": role,
        "displayName": (display_name or login).strip(),
    }
    users.append(entry)
    save_users(users)
    return public_from_record(entry)


def update_user(
    login: str,
    *,
    password: str = "",
    role: str | None = None,
    display_name: str | None = None,
    actor: dict[str, Any] | None = None,
) -> dict[str, Any]:
    login = normalize_login(login)
    users = load_users()
    index = next(
        (idx for idx, item in enumerate(users) if str(item.get("login", "")).strip().lower() == login),
        None,
    )
    if index is None:
        raise ValueError("Пользователь не найден.")

    entry = dict(users[index])

    if role is not None:
        if role not in ROLES:
            raise ValueError("Недопустимая роль.")
        if entry.get("role") == "admin" and role != "admin" and count_admins(users) <= 1:
            raise ValueError("Нельзя снять роль администратора у единственного админа.")
        entry["role"] = role

    if display_name is not None:
        entry["displayName"] = display_name.strip() or login

    if password:
        validate_password(password, required=True)
        entry["passwordHash"] = hash_password(password)

    users[index] = entry
    save_users(users)
    return public_from_record(entry)


def delete_user(login: str, actor: dict[str, Any] | None = None) -> None:
    login = normalize_login(login)
    actor_login = str((actor or {}).get("login") or "").strip().lower()
    if actor_login and actor_login == login:
        raise ValueError("Нельзя удалить свою учётную запись.")

    users = load_users()
    target = next((item for item in users if str(item.get("login", "")).strip().lower() == login), None)
    if not target:
        raise ValueError("Пользователь не найден.")

    if target.get("role") == "admin" and count_admins(users) <= 1:
        raise ValueError("Нельзя удалить единственного администратора.")

    users = [item for item in users if str(item.get("login", "")).strip().lower() != login]
    save_users(users)


def setup_initial_admin(login: str, password: str, display_name: str = "") -> dict[str, Any]:
    if users_exist():
        raise PermissionError("Пользователи уже настроены.")
    return create_user(login, password, role="admin", display_name=display_name or login)


def current_user() -> dict[str, Any] | None:
    payload = session.get("user")
    if not isinstance(payload, dict):
        return None
    login = str(payload.get("login") or "").strip()
    role = str(payload.get("role") or "").strip()
    if not login or role not in ROLES:
        return None
    return {
        "login": login,
        "role": role,
        "displayName": str(payload.get("displayName") or login),
    }


def login_user(user: dict[str, Any]) -> dict[str, Any]:
    public = {
        "login": str(user.get("login") or ""),
        "role": str(user.get("role") or "employee"),
        "displayName": str(user.get("displayName") or user.get("login") or ""),
    }
    session["user"] = public
    session.permanent = True
    return public


def logout_user() -> None:
    session.pop("user", None)


def is_admin(user: dict[str, Any] | None = None) -> bool:
    user = user or current_user()
    return bool(user and user.get("role") == "admin")


def public_user(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if not user:
        return None
    return {
        "login": user["login"],
        "role": user["role"],
        "displayName": user.get("displayName") or user["login"],
    }


def _json_error(message: str, status: int):
    return jsonify({"error": message}), status


def require_login(view: Callable):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user():
            return _json_error("Требуется вход в систему.", 401)
        return view(*args, **kwargs)

    return wrapper


def require_admin(view: Callable):
    @wraps(view)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return _json_error("Требуется вход в систему.", 401)
        if not is_admin(user):
            return _json_error("Недостаточно прав. Действие доступно только администратору.", 403)
        return view(*args, **kwargs)

    return wrapper


def guard_project_write(user: dict[str, Any], project: dict[str, Any]) -> dict[str, Any]:
    if is_admin(user):
        project["updatedBy"] = user["login"]
        return project

    if project.get("status") == "published" or project.get("publishedId"):
        raise PermissionError("Редактирование опубликованного урока доступно только администратору.")

    status = project.get("status") or "draft"
    if status not in {"processing", "uploaded", "error"}:
        project["status"] = "draft"
    project["updatedBy"] = user["login"]
    if not project.get("createdBy"):
        project["createdBy"] = user["login"]
    return project


def stamp_new_project(user: dict[str, Any], project: dict[str, Any]) -> dict[str, Any]:
    project["createdBy"] = user["login"]
    project["updatedBy"] = user["login"]
    project["status"] = "draft"
    return project
