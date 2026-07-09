from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SRC = Path("site/assets/wb_supply_probe")
OUT = Path("site/assets")


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for name in candidates:
        path = Path(name)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


FONT = font(30, True)
SMALL = font(22, True)


def annotate(source, target, markers):
    img = Image.open(SRC / source).convert("RGB")
    draw = ImageDraw.Draw(img, "RGBA")
    for item in markers:
        x, y, w, h, n, label = item
        draw.rounded_rectangle((x, y, x + w, y + h), radius=10, outline=(0, 118, 255, 255), width=5)
        draw.ellipse((x - 22, y - 22, x + 38, y + 38), fill=(0, 118, 255, 235), outline=(255, 255, 255, 255), width=3)
        draw.text((x - 3, y - 15), str(n), fill="white", font=FONT)
        if label:
            bbox = draw.textbbox((0, 0), label, font=SMALL)
            pad = 10
            lx, ly = x, max(12, y - 48)
            draw.rounded_rectangle(
                (lx, ly, lx + bbox[2] + pad * 2, ly + bbox[3] + pad * 2),
                radius=8,
                fill=(255, 255, 255, 235),
                outline=(0, 118, 255, 230),
                width=2,
            )
            draw.text((lx + pad, ly + pad - 2), label, fill=(17, 24, 39), font=SMALL)
    img.save(OUT / target, quality=92)


annotate(
    "probe_02_025.png",
    "wb_supply_01_file_upload.png",
    [
        (40, 84, 175, 520, 1, "Выберите папку"),
        (224, 116, 736, 406, 2, "Найдите XLS поставки"),
        (1042, 838, 115, 34, 3, "Открыть"),
    ],
)

annotate(
    "probe_05_120.png",
    "wb_supply_02_selsup_order.png",
    [
        (313, 224, 405, 34, 1, "Юрлицо и WB"),
        (309, 340, 422, 36, 2, "Склад списания"),
        (780, 536, 132, 32, 3, "WB / документы"),
        (1075, 815, 165, 36, 4, "Следующий шаг"),
    ],
)

annotate(
    "probe_10_295.png",
    "wb_supply_03_external_number.png",
    [
        (516, 348, 330, 34, 1, "Внешний номер WB"),
        (519, 434, 332, 34, 2, "Дата поставки"),
        (871, 414, 142, 36, 3, "Сохранить"),
        (1056, 816, 190, 40, 4, "Дальше"),
    ],
)

annotate(
    "probe_12_365.png",
    "wb_supply_04_wb_goods.png",
    [
        (395, 134, 122, 34, 1, "Загрузить XLS"),
        (630, 216, 95, 390, 2, "Кол-во"),
        (1112, 174, 170, 44, 3, "Выбрать склад/тип"),
    ],
)

annotate(
    "probe_09_260.png",
    "wb_supply_05_print_settings.png",
    [
        (502, 349, 365, 86, 1, "Тип и размер"),
        (505, 453, 358, 78, 2, "Термо 58x40"),
        (506, 564, 122, 42, 3, "Печать"),
    ],
)

annotate(
    "probe_15_470.png",
    "wb_supply_06_box_barcodes.png",
    [
        (755, 261, 250, 36, 1, "Скачать XLS"),
        (1012, 261, 152, 36, 2, "Печать"),
        (392, 386, 330, 360, 3, "Список коробов"),
        (1053, 771, 170, 38, 4, "Загрузить Excel"),
    ],
)

annotate(
    "probe_13_400.png",
    "wb_supply_07_selsup_scan.png",
    [
        (226, 226, 385, 55, 1, "ШК короба"),
        (206, 318, 700, 115, 2, "Товар в коробе"),
        (1036, 821, 190, 36, 3, "Готово"),
    ],
)

annotate(
    "probe_16_521.png",
    "wb_supply_08_pass_print.png",
    [
        (531, 343, 360, 88, 1, "Штрихкод поставки"),
        (530, 453, 365, 78, 2, "Настройки печати"),
        (542, 562, 125, 42, 3, "Распечатать"),
    ],
)
