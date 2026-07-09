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

function db(): PDO
{
    $configPath = __DIR__ . '/config/db.php';

    if (!file_exists($configPath)) {
        send_json(500, ['error' => 'Не настроено подключение к базе данных. Создайте config/db.php.']);
    }

    $config = require $configPath;
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['database'],
        $config['charset'] ?? 'utf8mb4'
    );

    return new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function map_record(array $row): array
{
    return [
        'id' => $row['id'],
        'date' => $row['work_date'],
        'employee' => $row['employee'],
        'arrivalTime' => $row['arrival_time'],
        'arrivalGeo' => [
            'label' => $row['arrival_label'],
            'latitude' => $row['arrival_latitude'] === null ? null : (float) $row['arrival_latitude'],
            'longitude' => $row['arrival_longitude'] === null ? null : (float) $row['arrival_longitude'],
        ],
        'leaveTime' => $row['leave_time'],
        'leaveGeo' => $row['leave_time'] === null ? null : [
            'label' => $row['leave_label'],
            'latitude' => $row['leave_latitude'] === null ? null : (float) $row['leave_latitude'],
            'longitude' => $row['leave_longitude'] === null ? null : (float) $row['leave_longitude'],
        ],
    ];
}

function get_records(PDO $pdo, ?string $date): array
{
    if ($date) {
        $stmt = $pdo->prepare('SELECT * FROM work_records WHERE work_date = ? ORDER BY arrival_time');
        $stmt->execute([$date]);
    } else {
        $stmt = $pdo->query('SELECT * FROM work_records ORDER BY arrival_time DESC');
    }

    return array_map('map_record', $stmt->fetchAll());
}

function find_open_record(PDO $pdo, string $employee, string $date): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM work_records
         WHERE employee = ? AND work_date = ? AND leave_time IS NULL
         ORDER BY arrival_time DESC
         LIMIT 1'
    );
    $stmt->execute([$employee, $date]);
    $record = $stmt->fetch();

    return $record ?: null;
}

try {
    $pdo = db();
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET' && $action === 'records') {
        send_json(200, ['records' => get_records($pdo, $_GET['date'] ?? null)]);
    }

    if ($method === 'POST' && $action === 'arrival') {
        $payload = read_json();
        $date = (string) ($payload['date'] ?? '');
        $employee = trim((string) ($payload['employee'] ?? ''));

        if ($date === '' || $employee === '') {
            send_json(400, ['error' => 'Дата или сотрудник не указаны.']);
        }

        if (find_open_record($pdo, $employee, $date)) {
            send_json(409, ['error' => 'Приход уже отмечен. Сначала отметьте уход.']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO work_records (
                id, work_date, employee, arrival_time, arrival_label, arrival_latitude, arrival_longitude
             ) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $payload['id'],
            $date,
            $employee,
            $payload['arrivalTime'],
            $payload['arrivalGeo']['label'],
            $payload['arrivalGeo']['latitude'],
            $payload['arrivalGeo']['longitude'],
        ]);

        send_json(201, ['records' => get_records($pdo, $date)]);
    }

    if ($method === 'POST' && $action === 'leave') {
        $payload = read_json();
        $date = (string) ($payload['date'] ?? '');
        $employee = trim((string) ($payload['employee'] ?? ''));
        $record = find_open_record($pdo, $employee, $date);

        if (!$record) {
            send_json(404, ['error' => 'Нет открытого прихода за сегодня для этого сотрудника.']);
        }

        $stmt = $pdo->prepare(
            'UPDATE work_records
             SET leave_time = ?, leave_label = ?, leave_latitude = ?, leave_longitude = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        $stmt->execute([
            $payload['leaveTime'],
            $payload['leaveGeo']['label'],
            $payload['leaveGeo']['latitude'],
            $payload['leaveGeo']['longitude'],
            $record['id'],
        ]);

        send_json(200, ['records' => get_records($pdo, $date)]);
    }

    if ($method === 'DELETE' && $action === 'records') {
        $date = (string) ($_GET['date'] ?? '');

        if ($date === '') {
            send_json(400, ['error' => 'Дата не указана.']);
        }

        $stmt = $pdo->prepare('DELETE FROM work_records WHERE work_date = ?');
        $stmt->execute([$date]);
        send_json(200, ['records' => []]);
    }

    send_json(404, ['error' => 'Метод API не найден.']);
} catch (Throwable $error) {
    send_json(500, ['error' => 'Ошибка сервера или базы данных.', 'details' => $error->getMessage()]);
}
