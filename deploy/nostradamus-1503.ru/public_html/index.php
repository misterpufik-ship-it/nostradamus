<?php

declare(strict_types=1);

function homepage_config_path(): string
{
    return __DIR__ . '/admin/data/homepage.json';
}

function default_homepage_config(): array
{
    return [
        'logo' => 'assets/ai-solutions-nostradamus-logo.png',
        'logoSize' => 'clamp(260px, 42vw, 520px)',
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

function load_homepage_config(): array
{
    $path = homepage_config_path();
    if (!file_exists($path)) {
        return default_homepage_config();
    }

    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '{}', true);

    return is_array($data)
        ? merge_homepage_config(default_homepage_config(), $data)
        : default_homepage_config();
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normalize_homepage_hex_color(string $value): string
{
    $value = trim($value);
    if (preg_match('/^#[0-9A-Fa-f]{6}$/', $value) === 1) {
        return strtolower($value);
    }

    return '#000000';
}

function service_icon_svg(string $id): string
{
    $icons = [
        'obuchenie' => '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M8 7h8M8 11h8" />',
        'list' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />',
        'sklad' => '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
        'cdek' => '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7.3 12 12l8.7-4.7M12 22V12" />',
        'proverka_postavok' => '<path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />',
        'inventa' => '<path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M12 12v4M10 14h4" />',
    ];

    return $icons[$id] ?? '<circle cx="12" cy="12" r="9" />';
}

$config = load_homepage_config();
$titleMain = e((string) ($config['title']['main'] ?? ''));
$titleAccent = e((string) ($config['title']['accent'] ?? ''));
$subtitle = e((string) ($config['subtitle'] ?? ''));
$logo = e((string) ($config['logo'] ?? 'assets/ai-solutions-nostradamus-logo.png'));
$backgroundType = ($config['background_type'] ?? 'color') === 'image' ? 'image' : 'color';
$backgroundColor = e(normalize_homepage_hex_color((string) ($config['background_color'] ?? '#000000')));
$background = trim((string) ($config['background'] ?? ''));
$footerBackground = trim((string) ($config['footerBackground'] ?? ''));
$fontTitle = e((string) ($config['fontSizes']['title'] ?? 'clamp(28px, 4.5vw, 52px)'));
$fontSubtitle = e((string) ($config['fontSizes']['subtitle'] ?? 'clamp(15px, 2vw, 18px)'));
$fontButton = e((string) ($config['fontSizes']['button'] ?? 'clamp(16px, 2.2vw, 20px)'));
$logoSize = e((string) ($config['logoSize'] ?? 'clamp(220px, 28vw, 360px)'));
$services = is_array($config['services'] ?? null) ? $config['services'] : [];
?>
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Nostradamus | Сервисы маркетплейса</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="main.css?v=2026071006" />
    <style>
      :root {
        --font-size-title: <?= $fontTitle ?>;
        --font-size-subtitle: <?= $fontSubtitle ?>;
        --font-size-button: <?= $fontButton ?>;
        --logo-size: <?= $logoSize ?>;
      }
<?php if ($backgroundType === 'color'): ?>
      body {
        background-color: <?= $backgroundColor ?>;
        background-image: none;
      }
<?php elseif ($background !== ''): ?>
      body {
        background-color: #000;
        background-image: url("<?= e($background) ?>");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-attachment: fixed;
      }
<?php endif; ?>
    </style>
  </head>
  <body>
    <?php if ($footerBackground !== ''): ?>
    <img
      class="home-footer-deco"
      src="<?= e($footerBackground) ?>"
      alt=""
      aria-hidden="true"
      width="1200"
      height="450"
    />
    <?php endif; ?>
    <main class="home">
      <header class="home-header">
        <img
          class="brand-logo"
          src="<?= $logo ?>"
          alt="AI Nostradamus"
          width="320"
          height="320"
        />
        <h1 class="home-title">
          <?= $titleMain ?> <span class="accent"><?= $titleAccent ?></span>
        </h1>
      </header>

      <p class="home-subtitle"><?= $subtitle ?></p>

      <nav class="service-actions" aria-label="Сервисы">
        <?php foreach ($services as $service): ?>
          <?php
            if (!is_array($service)) {
                continue;
            }
            $id = (string) ($service['id'] ?? '');
            $label = e((string) ($service['label'] ?? ''));
            $href = e((string) ($service['href'] ?? '#'));
            $accent = !empty($service['accent']);
            $btnClass = $accent ? 'service-btn service-btn-accent' : 'service-btn';
            ?>
        <a class="<?= $btnClass ?>" href="<?= $href ?>">
          <span class="service-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <?= service_icon_svg($id) ?>
            </svg>
          </span>
          <span class="service-label"><?= $label ?></span>
        </a>
        <?php endforeach; ?>
      </nav>
    </main>
  </body>
</html>
