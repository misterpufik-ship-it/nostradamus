from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BASE = Path("site/assets/merge_supply_live")
OUT = Path("site/assets")

BLUE = (25, 98, 150)
DARK = (12, 36, 58)
TEAL = (21, 137, 154)
GOLD = (216, 137, 22)
RED = (194, 59, 59)
LINE = (216, 224, 232)
SOFT = (244, 247, 250)


def font(size=24, bold=False):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_wrapped(draw, xy, text, fnt, fill, max_width, line_gap=4):
    words = text.split()
    lines = []
    line = ""
    for word in words:
        test = (line + " " + word).strip()
        if draw.textlength(test, font=fnt) <= max_width or not line:
            line = test
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)

    x, y = xy
    for item in lines:
        draw.text((x, y), item, font=fnt, fill=fill)
        y += fnt.size + line_gap
    return y


def annotate(src_name, dst_name, title, footer, markers, crop=(110, 100, 1320, 765)):
    im = Image.open(BASE / src_name).convert("RGB").crop(crop)
    pad = 24
    header_h = 66
    footer_h = 52
    canvas = Image.new("RGB", (im.width + pad * 2, im.height + pad * 2 + header_h + footer_h), "white")
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle(
        [0, 0, canvas.width - 1, canvas.height - 1],
        radius=16,
        fill="white",
        outline=LINE,
        width=2,
    )
    d.rectangle([0, 0, canvas.width - 1, header_h], fill=DARK)
    d.text((pad, 18), title, fill="white", font=font(24, True))
    canvas.paste(im, (pad, pad + header_h))

    for n, x, y, label, color in markers:
        px = x - crop[0] + pad
        py = y - crop[1] + pad + header_h
        if px < 0 or py < header_h or px > canvas.width or py > canvas.height:
            continue
        d.ellipse([px - 18, py - 18, px + 18, py + 18], fill=color, outline="white", width=3)
        number = str(n)
        width = d.textlength(number, font=font(21, True))
        d.text((px - width / 2, py - 13), number, fill="white", font=font(21, True))
        if label:
            label_w = 330
            label_h = 44
            lx = min(max(px + 24, 14), canvas.width - label_w - 14)
            ly = min(max(py - 22, header_h + 8), canvas.height - footer_h - label_h - 8)
            d.rounded_rectangle([lx, ly, lx + label_w, ly + label_h], radius=8, fill="white", outline=color, width=2)
            draw_wrapped(d, (lx + 10, ly + 8), label, font(16, True), DARK, label_w - 20, 1)

    footer_y = canvas.height - footer_h
    d.rectangle([1, footer_y, canvas.width - 2, canvas.height - 2], fill=SOFT)
    draw_wrapped(d, (pad, footer_y + 12), footer, font(18), (72, 82, 94), canvas.width - pad * 2)
    canvas.save(OUT / dst_name)
    print(OUT / dst_name)


annotate(
    "live_01.png",
    "merge_supply_01_order.png",
    "Шаг 1. Открыть заказ на отгрузку",
    "Работа начинается в заказе на отгрузку Selsup: здесь задаётся поставка и заполняется планирование.",
    [
        (1, 181, 229, "Раздел «Заказы на отгрузку»", BLUE),
        (2, 296, 397, "Блок «Планирование поставок»", TEAL),
        (3, 1150, 235, "Поставка и внешний номер", GOLD),
    ],
)

annotate(
    "live_01.png",
    "merge_supply_02_table.png",
    "Шаг 2. Найти таблицу товаров поставки",
    "В таблице видны товары, количество, штрихкод и колонка для объединения в одну карточку.",
    [
        (1, 300, 486, "Строки товаров поставки", BLUE),
        (2, 790, 486, "Количество и остаток", TEAL),
        (3, 1142, 486, "Артикул для объединения", GOLD),
    ],
)

annotate(
    "live_03.png",
    "merge_supply_03_article_column.png",
    "Шаг 3. Проверить артикул для объединения",
    "Именно эта колонка определяет, какие позиции будут собраны в одну карточку в листе сборки.",
    [
        (1, 1145, 237, "Колонка объединения", GOLD),
        (2, 1135, 278, "Значение у первой строки", BLUE),
        (3, 1135, 335, "Такое же значение у связанной строки", TEAL),
    ],
)

annotate(
    "live_05.png",
    "merge_supply_04_groups.png",
    "Шаг 4. Сверить группы товаров",
    "Похожие варианты одного товара должны иметь одинаковый артикул объединения, а разные товары — разные значения.",
    [
        (1, 509, 419, "Название товара и размер", BLUE),
        (2, 1140, 418, "Артикул группы", GOLD),
        (3, 1237, 419, "Удаление не используется без проверки", RED),
    ],
)

annotate(
    "live_06.png",
    "merge_supply_05_print_list.png",
    "Шаг 5. Проверить лист сборки",
    "После подготовки можно открыть лист сборки: товары должны идти с корректными артикулами и количеством.",
    [
        (1, 607, 125, "Лист сборки PDF", BLUE),
        (2, 620, 300, "Товар и штрихкоды", TEAL),
        (3, 1070, 315, "Количество к отгрузке", GOLD),
    ],
)
