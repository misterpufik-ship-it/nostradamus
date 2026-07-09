from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUT = Path("site/assets")
OUT.mkdir(parents=True, exist_ok=True)


def ui_font(size=22, bold=False):
    names = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def annotate(src, dst, title, markers, crop=(0, 58, 960, 590), footer=""):
    im = Image.open(src).convert("RGB").crop(crop)
    pad = 24
    header_h = 66
    footer_h = 44 if footer else 0
    canvas = Image.new("RGB", (im.width + pad * 2, im.height + pad * 2 + header_h + footer_h), "white")
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([0, 0, canvas.width - 1, canvas.height - 1], radius=18, fill="white", outline=(211, 219, 229), width=2)
    d.rectangle([0, 0, canvas.width - 1, header_h], fill=(11, 37, 69))
    d.text((pad, 18), title, fill="white", font=ui_font(22, True))
    canvas.paste(im, (pad, pad + header_h))

    for n, x, y, label, color in markers:
        x2 = x - crop[0] + pad
        y2 = y - crop[1] + pad + header_h
        d.ellipse([x2 - 18, y2 - 18, x2 + 18, y2 + 18], fill=color, outline="white", width=3)
        txt = str(n)
        tw = d.textlength(txt, font=ui_font(22, True))
        d.text((x2 - tw / 2, y2 - 13), txt, fill="white", font=ui_font(22, True))
        if label:
            lx = min(max(x2 + 24, 14), canvas.width - 324)
            ly = min(max(y2 - 18, header_h + 8), canvas.height - footer_h - 44)
            d.rounded_rectangle([lx, ly, lx + 300, ly + 38], radius=8, fill="white", outline=(46, 116, 181), width=2)
            d.text((lx + 10, ly + 9), label, fill=(11, 37, 69), font=ui_font(17, True))

    if footer:
        y = canvas.height - footer_h
        d.rectangle([1, y, canvas.width - 2, canvas.height - 2], fill=(244, 246, 249))
        d.text((pad, y + 11), footer, fill=(72, 82, 94), font=ui_font(18))

    canvas.save(OUT / dst)


blue = (46, 116, 181)
teal = (20, 160, 185)
gold = (245, 158, 11)
green = (36, 151, 81)
red = (210, 50, 45)

annotate(
    "video_frames/frame_001.png",
    "step_01_select_cards.png",
    "Честный знак: выбрать карточки после модерации",
    [
        (1, 24, 98, "Отметить нужные карточки", blue),
        (2, 646, 114, "Действия по карточкам", gold),
        (3, 820, 103, "Статусы карточек", green),
    ],
    footer="Сначала работаем в Честном знаке: выбираем карточки товара, которые нужно финально подписать.",
)

annotate(
    "video_frames/frame_003.png",
    "step_02_sign_publish.png",
    "Честный знак: подписать и опубликовать",
    [
        (1, 510, 316, "Подтвердить действие", green),
        (2, 462, 315, "Проверить действие", blue),
    ],
    footer="Подписание выполняется с рабочего места, где доступна электронная цифровая подпись.",
)

annotate(
    "video_frames/frame_006.png",
    "step_03_status_published.png",
    "Честный знак: проверить опубликованный статус",
    [
        (1, 776, 329, "Опубликовано", green),
        (2, 837, 349, "Готово к вводу в оборот", green),
    ],
    footer="После обновления страницы карточки должны быть опубликованы и готовы к дальнейшей работе.",
)

annotate(
    "video_frames/frame_009.png",
    "step_04_selsup_product.png",
    "Selsup: открыть товар и проверить статус Честного знака",
    [
        (1, 129, 113, "Карточка товара", blue),
        (2, 383, 140, "Честный знак активен", green),
        (3, 376, 141, "Панель действий", gold),
    ],
    footer="После публикации возвращаемся в Selsup и открываем тот товар, по которому работали в Честном знаке.",
)

annotate(
    "video_frames/frame_008.png",
    "step_05_link_cards.png",
    "Selsup: найти и связать карточки",
    [
        (1, 149, 243, "Выбрать строки", blue),
        (2, 205, 107, "Статусы маркетплейсов", gold),
        (3, 385, 540, "Сохранить после операции", teal),
    ],
    footer="Выделите товары/варианты и выполните действие поиска и привязки карточек национального каталога.",
)

annotate(
    "video_frames/frame_011.png",
    "step_06_integrations.png",
    "Selsup: при ошибке открыть интеграцию",
    [
        (1, 82, 253, "Настройки", blue),
        (2, 574, 183, "Честный знак", gold),
        (3, 578, 253, "Настроить", teal),
    ],
    footer="Если Selsup выдаёт ошибку, обновите доступ к Честному знаку через настройки интеграции.",
)

annotate(
    "video_frames/frame_012.png",
    "step_07_token_retry.png",
    "Selsup: получить токен, сохранить и повторить",
    [
        (1, 166, 486, "Получить токен", gold),
        (2, 130, 573, "Сохранить", teal),
        (3, 888, 96, "Успешно получено", green),
    ],
    footer="После успешного получения токена возвращаемся в товар и повторяем операцию связывания карточек.",
)

annotate(
    "video_frames/frame_014.png",
    "step_08_updated.png",
    "Selsup: карточки национального каталога обновлены",
    [
        (1, 780, 63, "Успешное обновление", green),
        (2, 383, 140, "Карточка связана", green),
        (3, 151, 574, "Сохранить", teal),
    ],
    footer="После небольшой паузы карточки считаются созданными и готовыми для работы с Честным знаком.",
)

print("site assets updated")
