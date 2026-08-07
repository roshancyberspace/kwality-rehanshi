<?php

$envPath = dirname(__DIR__).'/.env';
$appUrl = null;

if (is_file($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);

        if (trim($key) === 'APP_URL') {
            $appUrl = trim($value, " \t\n\r\0\x0B\"'");
            break;
        }
    }
}

$parts = $appUrl ? parse_url($appUrl) : false;
$host = $parts['host'] ?? '127.0.0.1';
$port = $parts['port'] ?? (($parts['scheme'] ?? 'http') === 'https' ? 443 : 8000);

passthru(sprintf(
    'php artisan serve --host=%s --port=%d',
    escapeshellarg($host),
    (int) $port
), $exitCode);

exit($exitCode);
