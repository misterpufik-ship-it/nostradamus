#!/usr/bin/env python3
"""Create or update a lesson-builder user in users.json."""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

LOGIN_RE = re.compile(r"^[a-z0-9._-]+$")


def users_file_default() -> Path:
    custom = os.environ.get("BUILDER_USERS_FILE", "").strip()
    if custom:
        return Path(custom)
    return Path(__file__).resolve().parents[1] / "obuchenie" / "lesson_builder" / "users.json"


def normalize_login(login: str) -> str:
    value = login.strip().lower()
    if len(value) < 2:
        raise ValueError("Логин должен быть не короче 2 символов.")
    if len(value) > 40:
        raise ValueError("Логин не длиннее 40 символов.")
    if not LOGIN_RE.fullmatch(value):
        raise ValueError("Логин: латиница, цифры, точка, дефис или подчёркивание.")
    return value


def load_users(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []


def save_users(path: Path, users: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(users, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Add or update builder user")
    parser.add_argument("login", help="User login")
    parser.add_argument("--role", choices=["admin", "employee"], default="employee")
    parser.add_argument("--name", default="", help="Display name")
    parser.add_argument("--users-file", default="", help="Path to users.json")
    parser.add_argument("--password", default="", help="Password (avoid in shell history)")
    args = parser.parse_args()

    path = Path(args.users_file) if args.users_file else users_file_default()
    password = args.password or getpass.getpass("Password: ")
    if len(password) < 6:
        print("Password must be at least 6 characters.", file=sys.stderr)
        return 1

    try:
        login = normalize_login(args.login)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    users = load_users(path)
    entry = {
        "login": login,
        "passwordHash": generate_password_hash(password),
        "role": args.role,
        "displayName": (args.name or login).strip(),
    }

    replaced = False
    for index, item in enumerate(users):
        if str(item.get("login", "")).strip().lower() == login:
            users[index] = entry
            replaced = True
            break
    if not replaced:
        users.append(entry)

    save_users(path, users)
    print(f"{'Updated' if replaced else 'Created'} user '{login}' ({args.role}) in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
