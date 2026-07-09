# Развертывание на Beget для sochi.misterpufik.ru

## 1. Поддомен

В панели Beget создайте поддомен `sochi.misterpufik.ru`.
Файлы из папки `public_html` нужно загрузить в папку сайта `sochi.misterpufik.ru/public_html`.

## 2. База данных

В панели Beget создайте MySQL-базу данных.
Затем импортируйте файл `database.sql` в эту базу через phpMyAdmin или раздел импорта.

## 3. Подключение

В папке `public_html/config`:

1. Скопируйте `db.example.php`.
2. Назовите копию `db.php`.
3. Впишите реальные значения Beget:

```php
<?php

return [
    'host' => 'localhost',
    'database' => 'имя_базы',
    'username' => 'пользователь_базы',
    'password' => 'пароль_базы',
    'charset' => 'utf8mb4',
];
```

## 4. HTTPS

Включите SSL-сертификат для `sochi.misterpufik.ru`.
Для геолокации на телефоне HTTPS обязателен: без него браузер может не дать доступ к местоположению.

## 5. Проверка

Откройте:

```text
https://sochi.misterpufik.ru/
```

Если API не настроен, сайт покажет ошибку базы данных внизу страницы.
