from pathlib import Path

import imageio.v3 as iio
from PIL import Image


VIDEO = next(Path("Videos").glob("*Селсап.mp4"))
OUT = Path("site/assets/wb_supply_probe")
OUT.mkdir(parents=True, exist_ok=True)

meta = iio.immeta(VIDEO)
duration = float(meta.get("duration", 529))
fps = float(meta.get("fps") or meta.get("video_fps") or 30)
times = [0, 25, 55, 85, 120, 155, 190, 225, 260, 295, 330, 365, 400, 435, 470, max(0, duration - 8)]

for index, second in enumerate(times, 1):
    frame = iio.imread(VIDEO, index=int(second * fps), plugin="pyav")
    image = Image.fromarray(frame).convert("RGB")
    image.thumbnail((1400, 900))
    target = OUT / f"probe_{index:02d}_{int(second):03d}.png"
    image.save(target)
    print(target)

print(f"duration={duration:.2f}; fps={fps:.2f}")
