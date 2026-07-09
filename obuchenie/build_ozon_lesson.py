"""Build Ozon supply lesson from source video."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from lesson_builder.pipeline import (
    dedupe_frames,
    extract_audio,
    extract_frames,
    match_steps_to_frames,
    probe_duration,
    split_into_steps,
    transcribe_audio,
)

ROOT = Path(__file__).resolve().parent
def find_ozon_video() -> Path:
    explicit = Path(
        r"C:\Users\mrpuf\OneDrive\Рабочий стол\X-active Obuchenie\Videos\Видео_инструкция_поставка_на_озон.mp4"
    )
    if explicit.is_file():
        return explicit

    videos_dir = ROOT / "Videos"
    for path in sorted(videos_dir.glob("*.mp4"), key=lambda p: p.stat().st_size, reverse=True):
        size_mb = path.stat().st_size / 1024 / 1024
        if 45 <= size_mb <= 52:
            return path
    raise FileNotFoundError("Ozon instruction video not found in Videos/")


VIDEO = find_ozon_video()
OUT = ROOT / "training_output" / "ozon_supply"
FRAMES = OUT / "frames"
UNIQUE = OUT / "frames_unique"
ASSETS = ROOT / "site" / "assets"
SITE_VIDEO = ROOT / "site" / "videos" / "ozon-supply.mp4"


def font(size: int = 22, bold: bool = False):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for path in candidates:
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def annotate_frame(source: Path, target: Path, title: str, footer: str | None = None) -> Path:
    image = Image.open(source).convert("RGB")
    max_w = 1280
    if image.width > max_w:
        ratio = max_w / image.width
        image = image.resize((max_w, int(image.height * ratio)))

    pad = 20
    header_h = 54
    footer_h = 38 if footer else 0
    canvas = Image.new("RGB", (image.width + pad * 2, image.height + pad * 2 + header_h + footer_h), "white")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([0, 0, canvas.width - 1, canvas.height - 1], radius=16, outline=(216, 224, 232), width=2)
    draw.rectangle([0, 0, canvas.width - 1, header_h], fill=(21, 40, 59))
    draw.text((pad, 16), title, fill="white", font=font(20, True))
    canvas.paste(image, (pad, pad + header_h))
    if footer:
        y = canvas.height - footer_h
        draw.rectangle([1, y, canvas.width - 2, canvas.height - 2], fill=(244, 247, 250))
        draw.text((pad, y + 10), footer, fill=(72, 82, 94), font=font(17))
    canvas.save(target, optimize=True)
    return target


def refine_steps(steps: list[dict]) -> list[dict]:
    """Tighten auto steps for Ozon supply flow."""
    if len(steps) <= 3:
        return steps

    merged: list[dict] = []
    buffer: list[dict] = []

    def flush():
        nonlocal buffer
        if not buffer:
            return
        text = " ".join(item["action"] for item in buffer)
        merged.append(
            {
                "title": buffer[0]["title"],
                "action": text,
                "comment": buffer[-1].get("comment", ""),
                "why": buffer[0].get("why", ""),
                "result": buffer[-1].get("result", ""),
                "timeStart": buffer[0]["timeStart"],
                "timeEnd": buffer[-1]["timeEnd"],
                "frameTime": round((buffer[0]["timeStart"] + buffer[-1]["timeEnd"]) / 2, 2),
            }
        )
        buffer = []

    for step in steps:
        words = len(step["action"].split())
        if buffer and words < 14 and len(buffer) < 2:
            buffer.append(step)
            continue
        if buffer:
            flush()
        buffer = [step]
    flush()

    # Target 6-10 steps for ~4 min video
    if len(merged) > 10:
        compact: list[dict] = []
        group: list[dict] = []
        for step in merged:
            group.append(step)
            if len(group) == 2 or step is merged[-1]:
                text = " ".join(item["action"] for item in group)
                compact.append(
                    {
                        "title": group[0]["title"],
                        "action": text,
                        "comment": group[-1].get("comment", ""),
                        "why": group[0].get("why", ""),
                        "result": group[-1].get("result", ""),
                        "timeStart": group[0]["timeStart"],
                        "timeEnd": group[-1]["timeEnd"],
                        "frameTime": round((group[0]["timeStart"] + group[-1]["timeEnd"]) / 2, 2),
                    }
                )
                group = []
        merged = compact

    titles = [
        "Открыть поставку Ozon в SelsUp",
        "Проверить состав и склад списания",
        "Связать поставку с личным кабинетом Ozon",
        "Сформировать короба и штрихкоды",
        "Упаковать товары по коробам",
        "Загрузить данные обратно в Ozon",
        "Оформить пропуск и завершить поставку",
    ]
    for index, step in enumerate(merged):
        if index < len(titles):
            step["title"] = titles[index]
        step["why"] = step.get("why") or "Шаг нужен, чтобы поставка на Ozon прошла без расхождений между SelsUp и маркетплейсом."
        step["result"] = step.get("result") or "Действие выполнено, можно переходить к следующему шагу."
    return merged


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    SITE_VIDEO.parent.mkdir(parents=True, exist_ok=True)

    if not VIDEO.is_file():
        raise SystemExit(f"Video not found: {VIDEO}")

    duration = probe_duration(VIDEO)
    print(f"duration={duration:.1f}s")

    audio = OUT / "audio.wav"
    extract_audio(VIDEO, audio)
    transcript = transcribe_audio(audio)
    (OUT / "transcript.json").write_text(json.dumps(transcript, ensure_ascii=False, indent=2), encoding="utf-8")

    raw_steps = split_into_steps(transcript.get("segments", []))
    steps = refine_steps(raw_steps)
    print(f"steps={len(steps)}")

    raw_frames = extract_frames(VIDEO, FRAMES, interval=3.0)
    unique = dedupe_frames(raw_frames, UNIQUE, threshold=7)
    print(f"unique_frames={len(unique)}")

    for step in steps:
        step["id"] = f"step-{len(steps)}"
    for index, step in enumerate(steps, start=1):
        step["number"] = index
        step["id"] = f"ozon-{index:02d}"

    match_steps_to_frames(steps, unique)

    material_steps = []
    for step in steps:
        frame_rel = step.get("frameFile", "").replace("frames_unique/", "")
        source = UNIQUE / frame_rel if frame_rel else unique[min(step["number"] - 1, len(unique) - 1)]["path"]
        asset_name = f"ozon_supply_{step['number']:02d}.png"
        annotate_frame(
            source,
            ASSETS / asset_name,
            f"Шаг {step['number']}. {step['title']}",
            footer=step["action"][:110] + ("…" if len(step["action"]) > 110 else ""),
        )
        material_steps.append(
            {
                "title": step["title"],
                "why": step["why"],
                "action": step["action"],
                "result": step["result"],
                "image": f"./assets/{asset_name}",
                "caption": step.get("comment") or step["title"],
            }
        )

    shutil.copy2(VIDEO, SITE_VIDEO)

    payload = {
        "duration_sec": duration,
        "transcript": transcript.get("fullText", ""),
        "steps": material_steps,
    }
    (OUT / "material.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {OUT / 'material.json'}")
    print(f"video -> {SITE_VIDEO}")


if __name__ == "__main__":
    main()
