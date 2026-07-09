"""Export lesson projects to HTML and PDF."""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from . import storage

_PACKAGE_ROOT = Path(__file__).resolve().parent


def _font(size: int = 22, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    regular_names = ("DejaVuSans.ttf", "LiberationSans-Regular.ttf", "arial.ttf", "segoeui.ttf")
    bold_names = ("DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf", "arialbd.ttf", "segoeuib.ttf")
    file_names = bold_names if bold else regular_names

    search_dirs = [
        _PACKAGE_ROOT / "fonts",
        Path("/usr/share/fonts/truetype/dejavu"),
        Path("/usr/share/fonts/dejavu"),
        Path("/usr/share/fonts/truetype/liberation"),
        Path("/System/Library/Fonts/Supplemental"),
        Path(r"C:\Windows\Fonts"),
    ]

    for directory in search_dirs:
        for name in file_names:
            path = directory / name
            if path.is_file():
                return ImageFont.truetype(str(path), size)

    return ImageFont.load_default()


DEFAULT_EXPORT_COLOR = "#e53935"


def _hex_to_rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    if len(value) == 6:
        r, g, b = int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)
        return r, g, b, alpha
    r, g, b = _hex_to_rgba(DEFAULT_EXPORT_COLOR, alpha=255)[:3]
    return r, g, b, alpha


def _draw_label_badge(
    draw: ImageDraw.ImageDraw,
    item: dict[str, Any],
    color: tuple[int, int, int, int],
) -> None:
    label = item.get("label")
    if not label:
        return
    item_type = item.get("type")
    if item_type == "rect":
        cx = item["x"] + item["w"] / 2
        cy = item["y"] + item["h"] / 2
        base = min(item["w"], item["h"]) / 3
    elif item_type == "circle":
        cx, cy = item["cx"], item["cy"]
        base = item["r"] * 0.9
    else:
        return

    size = max(18, min(28, int(base * 0.45)))
    radius = int(size * 0.72)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color)
    font = _font(size, bold=True)
    text = str(label)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2 - 1), text, fill=(255, 255, 255, 255), font=font)


def render_annotated_image(
    project_id: str,
    frame_file: str,
    annotations: list[dict[str, Any]] | None = None,
    *,
    target_name: str | None = None,
) -> Path:
    paths = storage.ensure_dirs(project_id)
    if not frame_file:
        raise RuntimeError("У шага нет скриншота.")

    source = storage.project_dir(project_id) / frame_file
    if not source.is_file():
        raise FileNotFoundError(source)

    image = Image.open(source).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")

    for item in annotations or []:
        color = _hex_to_rgba(item.get("color", DEFAULT_EXPORT_COLOR), 230)
        stroke = max(2, int(item.get("stroke", 4)))
        item_type = item.get("type")

        if item_type == "rect":
            x, y, w, h = item["x"], item["y"], item["w"], item["h"]
            draw.rounded_rectangle((x, y, x + w, y + h), radius=8, outline=color, width=stroke)
            _draw_label_badge(draw, item, color)
        elif item_type == "circle":
            cx, cy, r = item["cx"], item["cy"], item["r"]
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=stroke)
            _draw_label_badge(draw, item, color)
        elif item_type == "arrow":
            x1, y1, x2, y2 = item["x1"], item["y1"], item["x2"], item["y2"]
            draw.line((x1, y1, x2, y2), fill=color, width=stroke)
            import math

            angle = math.atan2(y2 - y1, x2 - x1)
            head = 16
            left = (x2 - head * math.cos(angle - 0.45), y2 - head * math.sin(angle - 0.45))
            right = (x2 - head * math.cos(angle + 0.45), y2 - head * math.sin(angle + 0.45))
            draw.polygon([(x2, y2), left, right], fill=color)
        elif item_type == "text":
            text = item.get("text", "")
            font = _font(int(item.get("size", 22)), bold=True)
            tx = item.get("tx", item.get("x", 0))
            ty = item.get("ty", item.get("y", 0))
            bbox = draw.textbbox((tx, ty), text, font=font)
            pad = 8
            draw.rounded_rectangle(
                (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad),
                radius=6,
                fill=(255, 255, 255, 235),
                outline=color,
                width=2,
            )
            draw.text((tx, ty), text, fill=(17, 24, 39, 255), font=font)
        elif item_type == "callout":
            text = item.get("text", "")
            font = _font(int(item.get("size", 22)), bold=True)
            tx = item.get("tx", 0)
            ty = item.get("ty", 0)
            ax = item.get("ax", tx)
            ay = item.get("ay", ty)
            bbox = draw.textbbox((tx, ty), text, font=font)
            pad = 8
            line_x = tx - pad + (bbox[2] - bbox[0] + pad * 2) / 2
            line_y = ty - pad + (bbox[3] - bbox[1] + pad * 2)
            draw.line((line_x, line_y, ax, ay), fill=color, width=stroke)
            draw.ellipse((ax - 6, ay - 6, ax + 6, ay + 6), fill=color)
            draw.rounded_rectangle(
                (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad),
                radius=6,
                fill=(255, 255, 255, 235),
                outline=color,
                width=2,
            )
            draw.text((tx, ty), text, fill=(17, 24, 39, 255), font=font)

    merged = Image.alpha_composite(image, overlay).convert("RGB")
    safe_name = (target_name or Path(frame_file).stem).replace("/", "_")
    target = paths["annotated"] / f"{safe_name}.png"
    merged.save(target, optimize=True)
    return target


def export_html(project_id: str) -> Path:
    data = storage.load_project(project_id)
    paths = storage.ensure_dirs(project_id)
    export_dir = paths["export"]
    assets_dir = export_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    step_blocks: list[str] = []
    for step in data.get("steps", []):
        frames = storage.get_step_frames(step)
        if frames:
            image_parts: list[str] = []
            for frame_index, frame in enumerate(frames, start=1):
                annotated = render_annotated_image(
                    project_id,
                    frame["frameFile"],
                    frame.get("annotations"),
                    target_name=f"{step['id']}_{frame.get('id', frame_index)}",
                )
                asset_name = f"{step['id']}_{frame_index:02d}.png"
                Image.open(annotated).save(assets_dir / asset_name, optimize=True)
                image_parts.append(
                    f'<figure><img src="./assets/{asset_name}" alt="{html.escape(step.get("title", ""))} — {frame_index}" /></figure>'
                )
            image_html = f'<div class="step-images">{"".join(image_parts)}</div>'
        else:
            image_html = '<div class="no-image">Скриншот не назначен</div>'

        step_blocks.append(
            f"""
      <section class="step-card">
        <header>
          <span class="step-num">Шаг {step.get("number", "")}</span>
          <h2>{html.escape(step.get("title", ""))}</h2>
        </header>
        <div class="step-grid">
          <div class="step-copy">
            <div><span class="label">Действие</span><p>{html.escape(step.get("action", ""))}</p></div>
            <div><span class="label">Комментарий</span><p>{html.escape(step.get("comment", ""))}</p></div>
            <div><span class="label">Готово, если</span><p>{html.escape(step.get("result", ""))}</p></div>
          </div>
          <figure>{image_html}</figure>
        </div>
      </section>"""
        )

    page = f"""<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(data.get("title", "Инструкция"))}</title>
  <style>
    :root {{
      --ink: #17202a;
      --muted: #65717f;
      --line: #d8e0e8;
      --blue: #2468a6;
      --soft: #f4f7fa;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: var(--ink);
      background: #eef2f6;
    }}
    .wrap {{ max-width: 980px; margin: 0 auto; padding: 28px 18px 48px; }}
    .hero {{
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 18px;
    }}
    .eyebrow {{ color: #15899a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }}
    h1 {{ margin: 8px 0 10px; font-size: 28px; }}
    .meta {{ display: flex; gap: 14px; flex-wrap: wrap; color: var(--muted); font-size: 14px; }}
    .step-card {{
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
    }}
    .step-num {{
      display: inline-block;
      background: var(--blue);
      color: #fff;
      font-weight: 700;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 13px;
    }}
    h2 {{ margin: 10px 0 14px; font-size: 22px; }}
    .step-grid {{ display: grid; grid-template-columns: 1fr 1.1fr; gap: 18px; align-items: start; }}
    .label {{
      display: block;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }}
    .step-copy p {{ margin: 0 0 14px; line-height: 1.55; }}
    figure {{ margin: 0; }}
    img {{ width: 100%; border-radius: 10px; border: 1px solid var(--line); background: var(--soft); }}
    .no-image {{
      min-height: 180px;
      display: grid;
      place-items: center;
      border: 1px dashed var(--line);
      border-radius: 10px;
      color: var(--muted);
      background: var(--soft);
    }}
    @media (max-width: 860px) {{ .step-grid {{ grid-template-columns: 1fr; }} }}
    @media print {{
      body {{ background: #fff; }}
      .wrap {{ max-width: none; padding: 0; }}
      .step-card {{ break-inside: avoid; page-break-inside: avoid; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <p class="eyebrow">{html.escape(data.get("topic", ""))}</p>
      <h1>{html.escape(data.get("title", ""))}</h1>
      <p>{html.escape(data.get("description", ""))}</p>
      <div class="meta">
        <span>Роль: {html.escape(data.get("role", ""))}</span>
        <span>Время: {html.escape(data.get("duration", ""))}</span>
        <span>Шагов: {len(data.get("steps", []))}</span>
      </div>
    </header>
    {"".join(step_blocks)}
  </div>
</body>
</html>"""

    target = export_dir / "instruction.html"
    target.write_text(page, encoding="utf-8")
    return target


def export_pdf(project_id: str) -> Path:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image as RLImage
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    data = storage.load_project(project_id)
    paths = storage.ensure_dirs(project_id)
    target = paths["export"] / "instruction.pdf"

    doc = SimpleDocTemplate(
        str(target),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleRU",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=colors.HexColor("#17202a"),
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "BodyRU",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#17202a"),
    )
    label_style = ParagraphStyle(
        "LabelRU",
        parent=body_style,
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#65717f"),
        spaceBefore=6,
    )

    story: list[Any] = []
    story.append(Paragraph(data.get("title", "Инструкция"), title_style))
    story.append(Paragraph(f"Тема: {data.get('topic', '')} · Роль: {data.get('role', '')}", body_style))
    if data.get("description"):
        story.append(Paragraph(data["description"], body_style))
    story.append(Spacer(1, 8))

    max_width = A4[0] - 32 * mm
    max_height = 95 * mm

    for step in data.get("steps", []):
        story.append(Paragraph(f"Шаг {step.get('number', '')}: {step.get('title', '')}", title_style))
        story.append(Paragraph("Действие", label_style))
        story.append(Paragraph(step.get("action", ""), body_style))
        if step.get("comment"):
            story.append(Paragraph("Комментарий", label_style))
            story.append(Paragraph(step["comment"], body_style))
        story.append(Paragraph("Готово, если", label_style))
        story.append(Paragraph(step.get("result", ""), body_style))

        for frame_index, frame in enumerate(storage.get_step_frames(step), start=1):
            annotated = render_annotated_image(
                project_id,
                frame["frameFile"],
                frame.get("annotations"),
                target_name=f"{step['id']}_{frame.get('id', frame_index)}",
            )
            img = RLImage(str(annotated))
            scale = min(max_width / img.drawWidth, max_height / img.drawHeight, 1)
            img.drawWidth *= scale
            img.drawHeight *= scale
            story.append(Spacer(1, 6))
            story.append(img)
        story.append(Spacer(1, 10))

    doc.build(story)
    return target


def export_app_js_snippet(project_id: str) -> str:
    data = storage.load_project(project_id)
    material = {
        "id": storage.slugify(data.get("title", "urok")),
        "topic": data.get("topic", ""),
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "role": data.get("role", ""),
        "duration": data.get("duration", ""),
        "sourceVideo": "",
        "videoNote": "Исходное видео можно открыть в проекте разработки урока.",
        "keywords": ["инструкция", data.get("topic", "")],
        "steps": [],
        "checklist": [],
        "issues": [],
    }

    for step in data.get("steps", []):
        step_images: list[dict[str, str]] = []
        for frame_index, frame in enumerate(storage.get_step_frames(step), start=1):
            image = f"./assets/{step['id']}_{frame_index:02d}.png"
            step_images.append(
                {
                    "image": image,
                    "caption": step.get("comment", "") or step.get("title", ""),
                }
            )
        material["steps"].append(
            {
                "title": step.get("title", ""),
                "why": step.get("why", ""),
                "action": step.get("action", ""),
                "result": step.get("result", ""),
                "image": step_images[0]["image"] if step_images else "",
                "images": step_images,
                "caption": step.get("comment", "") or step.get("title", ""),
            }
        )
        material["checklist"].append(step.get("result", ""))

    return json.dumps(material, ensure_ascii=False, indent=2)
