# AGENTS.md

Инструкции для AI-агента при работе с проектом **X-Active / Nostradamus**.

## Рабочая папка

```text
C:\Users\mrpuf\OneDrive\Рабочий стол\X-Active
```

Не путать со старой папкой `X-active Obuchenie` — она устарела.

## Что где лежит

| URL | Локальный путь |
|-----|----------------|
| https://nostradamus-1503.ru/ | `deploy/nostradamus-1503.ru/public_html/` |
| https://nostradamus-1503.ru/obuchenie/ | `obuchenie/site/` |
| https://nostradamus-1503.ru/admin/ | `deploy/.../public_html/admin/` |
| Конструктор уроков | `obuchenie/lesson_builder/` |

## Правила

1. Минимальные точечные правки, без массовых переписываний.
2. Не коммитить секреты: `users.json`, `auth.php`, `db.php`.
3. После завершённых правок — commit, push, deploy (см. `.cursor/rules/commit-push-deploy.mdc`).
4. Учебный центр и конструктор — только в `obuchenie/`.
5. Главная и сервисы (sklad, inventa, cdek…) — в `deploy/nostradamus-1503.ru/public_html/` и зеркалах в корне (`inventa/`, `cdek/`…).

## Локальный запуск

- `start-site.cmd` — главная на http://localhost:8001/
- `start-obuchenie-site.cmd` — учебный центр на http://127.0.0.1:8000/obuchenie/site/
- `start-lesson-builder.ps1` — конструктор на http://127.0.0.1:8765/
