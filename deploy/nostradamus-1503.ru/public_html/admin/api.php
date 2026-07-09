<?php

declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function send_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        send_json(400, ['error' => 'Некорректный JSON.']);
    }

    return $data;
}

function auth_config(): array
{
    $path = __DIR__ . '/config/auth.php';
    if (!file_exists($path)) {
        send_json(500, [
            'error' => 'Не настроена авторизация. Скопируйте config/auth.example.php в config/auth.php.',
        ]);
    }

    $config = require $path;
    if (!is_array($config) || empty($config['password_hash'])) {
        send_json(500, ['error' => 'Некорректный файл config/auth.php.']);
    }

    return $config;
}

function is_logged_in(): bool
{
    return !empty($_SESSION['admin_logged_in']);
}

function require_auth(): void
{
    if (!is_logged_in()) {
        send_json(401, ['error' => 'Требуется авторизация.']);
    }
}

function data_dir(): string
{
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return $dir;
}

function uploads_dir(): string
{
    $dir = __DIR__ . '/uploads';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return $dir;
}

function homepage_path(): string
{
    return data_dir() . '/homepage.json';
}

function default_homepage(): array
{
    return [
        'logo' => 'assets/ai-nostradamus-logo.png',
        'logoSize' => 'clamp(220px, 28vw, 360px)',
        'background_type' => 'color',
        'background_color' => '#000000',
        'background' => '',
        'footerBackground' => '',
        'title' => [
            'main' => 'Сервисы для работы',
            'accent' => 'с маркетплейсами',
        ],
        'subtitle' => 'Набор AI инструментов для автоматизации, контроля и роста бизнеса',
        'fontSizes' => [
            'title' => 'clamp(22px, 3.5vw, 40px)',
            'subtitle' => 'clamp(15px, 2vw, 18px)',
            'button' => 'clamp(16px, 2.2vw, 20px)',
        ],
        'services' => [
            ['id' => 'obuchenie', 'label' => 'Учебный центр', 'href' => 'obuchenie/', 'accent' => false],
            ['id' => 'list', 'label' => 'Лист сборки', 'href' => 'list/', 'accent' => false],
            ['id' => 'sklad', 'label' => 'Учет времени', 'href' => 'sklad/', 'accent' => true],
            ['id' => 'cdek', 'label' => 'Сортировка СДЭК', 'href' => 'cdek/', 'accent' => false],
            ['id' => 'proverka_postavok', 'label' => 'Контроль поставок', 'href' => 'proverka_postavok/', 'accent' => false],
            ['id' => 'inventa', 'label' => 'Inventa', 'href' => 'inventa/', 'accent' => false],
        ],
    ];
}

function merge_homepage_config(array $defaults, array $saved): array
{
    $merged = $defaults;

    foreach ($saved as $key => $value) {
        if ($key === 'title' && is_array($value)) {
            $merged['title'] = array_merge($defaults['title'], $value);
            continue;
        }

        if ($key === 'fontSizes' && is_array($value)) {
            $merged['fontSizes'] = array_merge($defaults['fontSizes'], $value);
            continue;
        }

        if ($key === 'services' && is_array($value) && $value !== []) {
            $merged['services'] = $value;
            continue;
        }

        $merged[$key] = $value;
    }

    return $merged;
}

function read_homepage(): array
{
    $path = homepage_path();
    if (!file_exists($path)) {
        return default_homepage();
    }

    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '{}', true);

    return is_array($data) ? merge_homepage_config(default_homepage(), $data) : default_homepage();
}

function write_homepage(array $homepage): void
{
    $encoded = json_encode($homepage, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        send_json(500, ['error' => 'Не удалось подготовить данные.']);
    }

    $path = homepage_path();
    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $encoded, LOCK_EX) === false) {
        send_json(500, ['error' => 'Не удалось сохранить данные.']);
    }

    if (!rename($tmp, $path)) {
        send_json(500, ['error' => 'Не удалось обновить файл данных.']);
    }
}

function normalize_hex_color(string $value, string $fallback = '#000000'): string
{
    $value = trim($value);
    if (preg_match('/^#[0-9A-Fa-f]{6}$/', $value) === 1) {
        return strtolower($value);
    }

    return $fallback;
}

function normalize_background_type(string $value): string
{
    return $value === 'image' ? 'image' : 'color';
}

function normalize_homepage(array $payload): array
{
    $current = read_homepage();

    $title = is_array($payload['title'] ?? null) ? $payload['title'] : [];
    $fontSizes = is_array($payload['fontSizes'] ?? null) ? $payload['fontSizes'] : [];
    $services = is_array($payload['services'] ?? null) ? $payload['services'] : $current['services'];

    $normalizedServices = [];
    foreach ($services as $service) {
        if (!is_array($service)) {
            continue;
        }

        $id = trim((string) ($service['id'] ?? ''));
        $label = trim((string) ($service['label'] ?? ''));
        $href = trim((string) ($service['href'] ?? ''));

        if ($id === '' || $label === '' || $href === '') {
            send_json(400, ['error' => 'У каждой кнопки должны быть id, label и href.']);
        }

        $normalizedServices[] = [
            'id' => $id,
            'label' => $label,
            'href' => $href,
            'accent' => !empty($service['accent']),
        ];
    }

    if ($normalizedServices === []) {
        send_json(400, ['error' => 'Нужна хотя бы одна кнопка сервиса.']);
    }

    return [
        'logo' => trim((string) ($payload['logo'] ?? $current['logo'])),
        'logoSize' => trim((string) ($payload['logoSize'] ?? $current['logoSize'] ?? 'clamp(220px, 28vw, 360px)')),
        'background_type' => normalize_background_type(trim((string) ($payload['background_type'] ?? $current['background_type']))),
        'background_color' => normalize_hex_color(
            (string) ($payload['background_color'] ?? $current['background_color']),
            normalize_hex_color((string) ($current['background_color'] ?? '#000000'))
        ),
        'background' => trim((string) ($payload['background'] ?? $current['background'])),
        'footerBackground' => trim((string) ($payload['footerBackground'] ?? $current['footerBackground'] ?? '')),
        'title' => [
            'main' => trim((string) ($title['main'] ?? $current['title']['main'])),
            'accent' => trim((string) ($title['accent'] ?? $current['title']['accent'])),
        ],
        'subtitle' => trim((string) ($payload['subtitle'] ?? $current['subtitle'])),
        'fontSizes' => [
            'title' => trim((string) ($fontSizes['title'] ?? $current['fontSizes']['title'])),
            'subtitle' => trim((string) ($fontSizes['subtitle'] ?? $current['fontSizes']['subtitle'])),
            'button' => trim((string) ($fontSizes['button'] ?? $current['fontSizes']['button'])),
        ],
        'services' => $normalizedServices,
    ];
}

function handle_upload(string $type): array
{
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        send_json(400, ['error' => 'Файл не передан.']);
    }

    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        send_json(400, ['error' => 'Ошибка загрузки файла.']);
    }

    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'image/svg+xml' => 'svg',
    ];

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    if (!isset($allowedTypes[$mime])) {
        send_json(400, ['error' => 'Допустимы только изображения (jpg, png, webp, gif, svg).']);
    }

    if ($type === 'logo') {
        $basename = 'logo';
    } elseif ($type === 'footer') {
        $basename = 'footer';
    } else {
        $basename = 'background';
    }
    $filename = $basename . '-' . date('Ymd-His') . '.' . $allowedTypes[$mime];
    $target = uploads_dir() . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        send_json(500, ['error' => 'Не удалось сохранить файл.']);
    }

    return [
        'path' => 'admin/uploads/' . $filename,
        'type' => $type,
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'session') {
    send_json(200, ['loggedIn' => is_logged_in()]);
}

if ($method === 'GET' && $action === 'homepage') {
    require_auth();
    send_json(200, ['homepage' => read_homepage()]);
}

if ($method === 'POST' && $action === 'login') {
    $payload = read_json();
    $password = (string) ($payload['password'] ?? '');
    $config = auth_config();

    if ($password === '' || !password_verify($password, $config['password_hash'])) {
        send_json(401, ['error' => 'Неверный пароль.']);
    }

    $_SESSION['admin_logged_in'] = true;
    send_json(200, ['ok' => true]);
}

if ($method === 'POST' && $action === 'logout') {
    $_SESSION = [];
    if (session_id() !== '') {
        session_destroy();
    }
    send_json(200, ['ok' => true]);
}

if ($method === 'PUT' && $action === 'homepage') {
    require_auth();
    $payload = read_json();
    $homepage = normalize_homepage($payload);
    write_homepage($homepage);
    send_json(200, ['homepage' => $homepage]);
}

if ($method === 'POST' && $action === 'upload') {
    require_auth();
    $type = $_GET['type'] ?? '';
    if (!in_array($type, ['logo', 'background', 'footer'], true)) {
        send_json(400, ['error' => 'Укажите type=logo, type=background или type=footer.']);
    }

    $upload = handle_upload($type);
    $homepage = read_homepage();
    if ($type === 'logo') {
        $homepage['logo'] = $upload['path'];
    } elseif ($type === 'footer') {
        $homepage['footerBackground'] = $upload['path'];
    } else {
        $homepage['background'] = $upload['path'];
        $homepage['background_type'] = 'image';
    }
    write_homepage($homepage);

    send_json(200, [
        'upload' => $upload,
        'homepage' => $homepage,
    ]);
}

send_json(405, ['error' => 'Метод или действие не поддерживается.']);
