from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OBUCHENIE = ROOT / "obuchenie"
SITE_VIDEOS = OBUCHENIE / "site" / "videos"
VIDEOS = OBUCHENIE / "Videos"

MAPPING = [
    ("*Селсап*", VIDEOS, "wb-selsup-supply.mp4"),
    ("*селсап*", VIDEOS, "wb-selsup-supply.mp4"),
    ("*объедин*", VIDEOS, "merge-supply-card.mp4"),
]


def main() -> None:
    SITE_VIDEOS.mkdir(parents=True, exist_ok=True)

    for pattern, folder, target in MAPPING:
        matches = sorted(folder.glob(pattern)) if folder.is_dir() else []
        if matches:
            shutil.copy2(matches[0], SITE_VIDEOS / target)
            print(f"copied {matches[0].name} -> obuchenie/site/videos/{target}")
        else:
            print(f"warning: no match for {pattern}")

    source = OBUCHENIE / "source_video.mp4"
    if source.is_file():
        shutil.copy2(source, SITE_VIDEOS / "honest-sign-base.mp4")
        print("copied source_video.mp4 -> obuchenie/site/videos/honest-sign-base.mp4")

    ozon_candidates = sorted(VIDEOS.glob("*озон*.mp4")) if VIDEOS.is_dir() else []
    if ozon_candidates:
        shutil.copy2(ozon_candidates[0], SITE_VIDEOS / "ozon-supply.mp4")
        print(f"copied {ozon_candidates[0].name} -> obuchenie/site/videos/ozon-supply.mp4")
    elif (SITE_VIDEOS / "ozon-supply.mp4").is_file():
        print("ozon video already in obuchenie/site/videos")


if __name__ == "__main__":
    main()
