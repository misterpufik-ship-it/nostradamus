# Админка Nostradamus Hub

## URL

- **Админ-панель:** https://nostradamus-1503.ru/admin/
- **API:** https://nostradamus-1503.ru/admin/api.php

## Первичная настройка

1. Скопируйте `admin/config/auth.example.php` в `admin/config/auth.php`.
2. Задайте свой пароль (см. ниже).
3. Убедитесь, что папки `admin/data/` и `admin/uploads/` доступны для записи PHP (права 755).

## Пароль по умолчанию

После копирования `auth.example.php` → `auth.php`:

- **Пароль:** `changeme`

Сразу смените пароль на продакшене.

### Как задать свой пароль

На сервере или локально:

```bash
php -r "echo password_hash('ваш_пароль', PASSWORD_DEFAULT);"
```

Вставьте полученный хеш в `admin/config/auth.php`:

```php
return [
    'password_hash' => '...сгенерированный_хеш...',
];
```

Файл `auth.php` не должен попадать в git.

## Что можно редактировать

Раздел **homepage** (главная страница):

- логотип и фон (загрузка изображений);
- заголовок и акцентная часть;
- подзаголовок;
- размеры шрифтов (CSS-значения, например `clamp(...)` или `24px`);
- кнопки сервисов: текст, ссылка, флаг «акцентная».

Данные хранятся в `admin/data/homepage.json`. Загруженные файлы — в `admin/uploads/`.

**Важно:** `homepage.json` и загрузки из админки живут только на сервере и **не перезаписываются** при деплое (`scripts/deploy-nostradamus.ps1`). В git лежит только шаблон `homepage.example.json`.

## Архитектура

```text
public_html/
  index.php              ← читает admin/data/homepage.json
  admin/
    index.html           ← UI админки
    api.php              ← авторизация, CRUD, загрузка файлов
    config/auth.php      ← пароль (не в git)
    data/homepage.json   ← настройки главной
    uploads/             ← загруженные изображения
```

Для новых разделов CMS можно добавить отдельные JSON-файлы в `admin/data/` и экраны в админке по тому же паттерну.

## Безопасность

- `admin/data/` и `admin/config/` закрыты через `.htaccess` (Deny from all).
- Изображения в `admin/uploads/` отдаются напрямую, листинг каталога отключён.
- Все изменения требуют сессии после входа по паролю.
