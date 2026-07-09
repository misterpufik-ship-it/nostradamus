<?php
declare(strict_types=1);

$upstreamBase = 'https://posoolonono.beget.app/x-active-builder';
$publicPrefix = '/obuchenie/builder';

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$query = parse_url($requestUri, PHP_URL_QUERY);

if (strpos($path, $publicPrefix) !== 0) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Неверный путь прокси.';
    exit;
}

$upstreamPath = substr($path, strlen($publicPrefix));
if ($upstreamPath === '' || $upstreamPath === false) {
    $upstreamPath = '/';
}
$target = rtrim($upstreamBase, '/') . $upstreamPath;
if (!empty($query)) {
    $target .= '?' . $query;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];

$contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
foreach ($incomingHeaders as $name => $value) {
    if (strtolower((string) $name) === 'content-type') {
        $contentType = (string) $value;
        break;
    }
}

$forwardHeaders = [
    'X-Forwarded-Proto: https',
    'X-Forwarded-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'nostradamus-1503.ru'),
    'X-Forwarded-Prefix: ' . $publicPrefix,
];

foreach ($incomingHeaders as $name => $value) {
    $lower = strtolower((string) $name);
    if (in_array($lower, ['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding'], true)) {
        continue;
    }
    $forwardHeaders[] = $name . ': ' . $value;
}

$multipartFields = null;
if (
    strtoupper($method) === 'POST'
    && stripos($contentType, 'multipart/form-data') !== false
) {
    $multipartFields = $_POST;
    foreach ($_FILES as $fieldName => $fileInfo) {
        if (is_array($fileInfo['tmp_name'])) {
            $files = [];
            foreach ($fileInfo['tmp_name'] as $index => $tmpName) {
                if (($fileInfo['error'][$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                    continue;
                }
                if (!is_uploaded_file($tmpName)) {
                    continue;
                }
                $files[] = new CURLFile(
                    $tmpName,
                    $fileInfo['type'][$index] ?: 'application/octet-stream',
                    $fileInfo['name'][$index] ?? 'upload.bin'
                );
            }
            if ($files) {
                $multipartFields[$fieldName] = $files;
            }
            continue;
        }

        if (($fileInfo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }
        if (!is_uploaded_file($fileInfo['tmp_name'])) {
            continue;
        }
        $multipartFields[$fieldName] = new CURLFile(
            $fileInfo['tmp_name'],
            $fileInfo['type'] ?: 'application/octet-stream',
            $fileInfo['name'] ?? 'upload.bin'
        );
    }

    $forwardHeaders = array_values(array_filter(
        $forwardHeaders,
        static fn(string $header): bool => stripos($header, 'Content-Type:') !== 0
    ));
}

$body = null;
if ($multipartFields === null) {
    $body = file_get_contents('php://input');
}

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 600);

if ($multipartFields !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $multipartFields);
} elseif ($body !== false && $body !== '') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

if (!empty($_SERVER['HTTP_COOKIE'])) {
    curl_setopt($ch, CURLOPT_COOKIE, (string) $_SERVER['HTTP_COOKIE']);
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Конструктор временно недоступен.';
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$content = substr($response, $headerSize);

http_response_code($status);

$upstreamOrigin = 'https://posoolonono.beget.app/x-active-builder';
$localOrigin = $publicPrefix;

foreach (preg_split('/\r\n|\n|\r/', $rawHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) {
        continue;
    }

    $parts = explode(':', $line, 2);
    if (count($parts) !== 2) {
        continue;
    }

    $name = trim($parts[0]);
    $value = trim($parts[1]);
    $lower = strtolower($name);

    if ($lower === 'transfer-encoding' || $lower === 'connection' || $lower === 'content-length') {
        continue;
    }

    if ($lower === 'location') {
        $value = str_replace($upstreamOrigin, $localOrigin, $value);
        $value = preg_replace('#https?://posoolonono\.beget\.app/x-active-builder#', $localOrigin, $value) ?? $value;
        if (preg_match('#^/#', $value) && strpos($value, $publicPrefix) !== 0) {
            $value = rtrim($publicPrefix, '/') . $value;
        }
        header($name . ': ' . $value, false);
        continue;
    }

    if ($lower === 'set-cookie') {
        $value = preg_replace('/;\s*Domain=[^;]*/i', '', $value) ?? $value;
        if (stripos($value, 'Path=') === false) {
            $value .= '; Path=' . $publicPrefix;
        } else {
            $value = preg_replace('/Path=\/x-active-builder/i', 'Path=' . $publicPrefix, $value) ?? $value;
            $value = preg_replace('/Path=\//i', 'Path=' . $publicPrefix, $value) ?? $value;
        }
        $value .= '; Secure; SameSite=Lax';
        header($name . ': ' . $value, false);
        continue;
    }

    header($name . ': ' . $value, false);
}

header('Content-Length: ' . strlen($content));
echo $content;
