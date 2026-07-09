<?php

/**
 * Скопируйте этот файл как auth.php и задайте свой пароль.
 * Файл auth.php не должен попадать в git.
 *
 * Сгенерировать хеш пароля:
 *   php -r "echo password_hash('ваш_пароль', PASSWORD_DEFAULT);"
 */
return [
    // Пароль по умолчанию: changeme
    'password_hash' => '$2y$10$4CATtiPYgpMk/IBqvIjYCehMaYZOeQaUQCbumX63Ln2F16I5Ua/KC',
];
