<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

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

function storage_path(): string
{
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return $dir . '/deliveries.json';
}

function read_deliveries(): array
{
    $path = storage_path();
    if (!file_exists($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '[]', true);

    return is_array($data) ? $data : [];
}

function write_deliveries(array $deliveries): void
{
    $path = storage_path();
    $encoded = json_encode($deliveries, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        send_json(500, ['error' => 'Не удалось подготовить данные.']);
    }

    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $encoded, LOCK_EX) === false) {
        send_json(500, ['error' => 'Не удалось сохранить данные.']);
    }

    if (!rename($tmp, $path)) {
        send_json(500, ['error' => 'Не удалось обновить файл данных.']);
    }
}

function normalize_checks(array $checks): array
{
    $normalized = array_map(static fn($value) => (bool) $value, array_values($checks));
    if (count($normalized) !== 10) {
        send_json(400, ['error' => 'Нужно передать 10 отметок.']);
    }

    return $normalized;
}

function map_delivery(array $delivery): array
{
    return [
        'id' => $delivery['id'],
        'deliveryNumber' => $delivery['deliveryNumber'],
        'warehouse' => $delivery['warehouse'],
        'checks' => $delivery['checks'],
        'savedAt' => $delivery['savedAt'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $deliveries = read_deliveries();
    usort($deliveries, static function (array $left, array $right): int {
        return strcmp($right['savedAt'] ?? '', $left['savedAt'] ?? '');
    });
    send_json(200, ['deliveries' => array_map('map_delivery', $deliveries)]);
}

if ($method === 'POST') {
    $payload = read_json();
    $deliveryNumber = trim((string) ($payload['deliveryNumber'] ?? ''));
    $warehouse = trim((string) ($payload['warehouse'] ?? ''));
    $checks = normalize_checks((array) ($payload['checks'] ?? []));

    if ($deliveryNumber === '') {
        send_json(400, ['error' => 'Укажите номер поставки.']);
    }

    if ($warehouse === '') {
        send_json(400, ['error' => 'Укажите склад.']);
    }

    $delivery = [
        'id' => bin2hex(random_bytes(16)),
        'deliveryNumber' => $deliveryNumber,
        'warehouse' => $warehouse,
        'checks' => $checks,
        'savedAt' => gmdate('c'),
    ];

    $deliveries = read_deliveries();
    array_unshift($deliveries, $delivery);
    write_deliveries($deliveries);

    send_json(201, ['delivery' => map_delivery($delivery)]);
}

send_json(405, ['error' => 'Метод не поддерживается.']);
