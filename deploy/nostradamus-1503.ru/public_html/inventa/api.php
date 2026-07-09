<?php

declare(strict_types=1);

$upstream = getenv('INVENTA_UPSTREAM') ?: 'http://82.202.129.7:8767/convert';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Метод не поддерживается.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Файл не передан.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = $_FILES['file'];
$curl = curl_init($upstream);
$post = [
    'file' => new CURLFile($file['tmp_name'], $file['type'] ?: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $file['name']),
];

curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $post,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 120,
]);

$response = curl_exec($curl);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Сервис Inventa недоступен.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($curl, CURLINFO_HEADER_SIZE);
curl_close($curl);

$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

http_response_code($status);

foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    if (stripos($line, 'Transfer-Encoding:') === 0) {
        continue;
    }
    header($line, false);
}

echo $body;
