# X-Active / Nostradamus

Единый репозиторий для **nostradamus-1503.ru**: главная страница, сервисы склада и **учебный центр X-active**.

## Структура

```text
X-Active/
├── deploy/nostradamus-1503.ru/public_html/   # прод: https://nostradamus-1503.ru/
├── obuchenie/
│   ├── site/                                 # прод: https://nostradamus-1503.ru/obuchenie/
│   └── lesson_builder/                       # конструктор уроков (VPS)
├── inventa/, cdek/, proverka_postavok/       # исходники сервисов (копии в deploy/…)
└── scripts/deploy-vps.ps1                    # деплой учебного центра на BeGet
```

## Локальный запуск

Главная (Node):

```cmd
start-site.cmd
```

Учебный центр:

```cmd
start-obuchenie-site.cmd
```

Конструктор:

```powershell
.\start-lesson-builder.ps1
```

## Деплой

Учебный центр (автоматически через VPS → BeGet):

```powershell
powershell -NoProfile -File scripts/deploy-vps.ps1
```

Главная и сервисы в `deploy/nostradamus-1503.ru/public_html/` пока загружаются на BeGet вручную или через панель (отдельный deploy можно добавить позже).

## GitHub

Репозиторий: https://github.com/misterpufik-ship-it/nostradamus

Старый репозиторий `X-active-obuchenie` больше не используется — всё перенесено сюда.

## Рабочая папка в Cursor

Открывайте **`X-Active`**, не `X-active Obuchenie`.
