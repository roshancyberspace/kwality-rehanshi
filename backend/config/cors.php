<?php

$envList = static fn (string $key): array => array_values(array_filter(
    array_map('trim', explode(',', (string) env($key, '')))
));

$frontendUrl = rtrim((string) env('FRONTEND_URL', ''), '/');
$backendUrl = rtrim((string) env('APP_URL', ''), '/');

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter([
        $frontendUrl,
        $backendUrl,
        ...$envList('CORS_ALLOWED_ORIGINS'),
    ]))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
