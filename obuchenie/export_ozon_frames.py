"""Re-export Ozon screenshots at logical timestamps."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from lesson_builder.ffmpeg_util import require_ffmpeg, run
from lesson_builder.pipeline import probe_duration

ROOT = Path(__file__).resolve().parent
VIDEO = Path(
    r"C:\Users\mrpuf\OneDrive\Рабочий стол\X-active Obuchenie\Videos\Видео_инструкция_поставка_на_озон.mp4"
)
if not VIDEO.is_file():
    VIDEO = next(p for p in (ROOT / "Videos").glob("*.mp4") if 45 <= p.stat().st_size / 1024 / 1024 <= 52)
ASSETS = ROOT / "site" / "assets"

STEPS = [
    (18, "Подготовить файл из SelsUp"),
    (48, "Выбрать склад и точку сдачи"),
    (82, "Выбрать кластер и таймслот"),
    (124, "Добавить данные автомобиля"),
    (149, "Указать количество коробов"),
    (176, "Заполнить состав каждого короба"),
    (206, "Разделить сортируемый и несортируемый товар"),
    (244, "Распечатать этикетки на короба"),
]


def font(size: int = 20, bold: bool = False):
    for path in (
        [r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\arial.ttf"]
        if bold
        else [r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\segoeui.ttf"]
    ):
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def grab_frame(video: Path, second: float, target: Path) -> None:
    ffmpeg, _ = require_ffmpeg()
    tmp = target.with_suffix(".raw.png")
    run(
        [
            ffmpeg,
            "-y",
            "-ss",
            str(second),
            "-i",
            str(video),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(tmp),
        ]
    )
    image = Image.open(tmp).convert("RGB")
    if image.width > 1280:
        ratio = 1280 / image.width
        image = image.resize((1280, int(image.height * ratio)))
    pad = 18
    header = 50
    canvas = Image.new("RGB", (image.width + pad * 2, image.height + pad * 2 + header), "white")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, canvas.width - 1, header], fill=(21, 40, 59))
    draw.text((pad, 14), target.stem.replace("_", " ").replace("ozon supply", "Ozon").title(), fill="white", font=font(19, True))
    canvas.paste(image, (pad, pad + header))
    canvas.save(target, optimize=True)
    tmp.unlink(missing_ok=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for index, (second, _) in enumerate(STEPS, start=1):
        grab_frame(VIDEO, second, ASSETS / f"ozon_supply_{index:02d}.png")
        print(f"frame {index} @ {second}s")


if __name__ == "__main__":
    main()
