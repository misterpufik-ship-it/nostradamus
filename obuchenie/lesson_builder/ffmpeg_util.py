"""Locate ffmpeg/ffprobe on Windows and run commands."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


def _winget_ffmpeg_bins() -> list[Path]:
    roots = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Links",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages",
    ]
    bins: list[Path] = []
    for root in roots:
        if not root.is_dir():
            continue
        if root.name == "Links":
            bins.append(root)
            continue
        for path in root.rglob("bin"):
            if path.is_dir() and (path / "ffmpeg.exe").is_file():
                bins.append(path)
    return bins


def find_binary(name: str) -> str | None:
    env_key = f"{name.upper()}_PATH"
    env_value = os.environ.get(env_key)
    if env_value:
        candidate = Path(env_value)
        if candidate.is_file():
            return str(candidate)
        sibling = candidate.parent / f"{name}.exe"
        if sibling.is_file():
            return str(sibling)

    found = shutil.which(name)
    if found:
        return found

    candidates = [
        Path(r"C:\ffmpeg\bin") / f"{name}.exe",
        Path(r"C:\Program Files\ffmpeg\bin") / f"{name}.exe",
        Path(os.environ.get("ProgramFiles", "")) / "ffmpeg" / "bin" / f"{name}.exe",
    ]
    for bin_dir in _winget_ffmpeg_bins():
        candidates.append(bin_dir / f"{name}.exe")

    for path in candidates:
        if path.is_file():
            return str(path)
    return None


def require_ffmpeg() -> tuple[str, str]:
    ffmpeg = find_binary("ffmpeg")
    ffprobe = find_binary("ffprobe")
    if ffmpeg and not ffprobe:
        sibling = Path(ffmpeg).with_name("ffprobe.exe")
        if sibling.is_file():
            ffprobe = str(sibling)
    if not ffmpeg or not ffprobe:
        raise RuntimeError(
            "ffmpeg не найден. Установите ffmpeg и добавьте в PATH, "
            "или задайте переменную FFMPEG_PATH с полным путём к ffmpeg.exe. "
            "Пример: winget install Gyan.FFmpeg"
        )
    return ffmpeg, ffprobe


def run(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=check, capture_output=True, text=True, encoding="utf-8", errors="replace")
