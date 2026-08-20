<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FcmV1Client
{
    private ?array $credentials = null;
    private ?string $credentialsPath = null;

    public function __construct()
    {
        $this->credentialsPath = config('services.fcm.credentials_path')
            ?: storage_path('app/firebase-credentials.json');
    }

    public function isConfigured(): bool
    {
        if ($this->hasServiceAccount()) {
            return true;
        }

        return !empty(config('services.fcm.server_key'));
    }

    public function hasServiceAccount(): bool
    {
        $creds = $this->getCredentials();
        return !empty($creds['client_email']) && !empty($creds['private_key']) && !empty($creds['project_id']);
    }

    public function getCredentials(): ?array
    {
        if ($this->credentials !== null) {
            return $this->credentials;
        }

        if (!$this->credentialsPath || !file_exists($this->credentialsPath)) {
            return null;
        }

        $content = file_get_contents($this->credentialsPath);
        $decoded = json_decode($content, true);

        if (!is_array($decoded)) {
            return null;
        }

        $this->credentials = $decoded;
        return $this->credentials;
    }

    public function isClientGoogleServicesJson(): bool
    {
        $creds = $this->getCredentials();
        if (!$creds) {
            return false;
        }
        return isset($creds['client']) && isset($creds['project_info']) && empty($creds['private_key']);
    }

    public function send(string $token, string $title, string $body, ?string $imageUrl = null, array $data = []): void
    {
        if ($this->hasServiceAccount()) {
            $this->sendViaV1($token, $title, $body, $imageUrl, $data);
            return;
        }

        $serverKey = (string) config('services.fcm.server_key');
        if (!empty($serverKey)) {
            $this->sendViaLegacy($serverKey, $token, $title, $body, $imageUrl, $data);
            return;
        }

        if ($this->isClientGoogleServicesJson()) {
            throw new RuntimeException('Uploaded firebase-credentials.json is a client google-services.json. Please generate and upload the Firebase Service Account Private Key JSON from Firebase Console -> Project Settings -> Service Accounts tab.');
        }

        throw new RuntimeException('Push gateway is not configured (Firebase Service Account JSON or FCM_SERVER_KEY missing).');
    }

    private function sendViaV1(string $token, string $title, string $body, ?string $imageUrl = null, array $data = []): void
    {
        $creds = $this->getCredentials();
        $projectId = $creds['project_id'];
        $accessToken = $this->getAccessToken($creds);

        $cleanData = [];
        foreach ($data as $k => $v) {
            if ($v !== null) {
                $cleanData[(string) $k] = is_scalar($v) ? (string) $v : json_encode($v);
            }
        }
        $cleanData['title'] = (string) $title;
        $cleanData['body'] = (string) $body;
        if ($imageUrl) {
            $cleanData['image'] = (string) $imageUrl;
        }

        $payload = [
            'message' => [
                'token' => $token,
                'notification' => array_filter([
                    'title' => $title,
                    'body' => $body,
                    'image' => $imageUrl,
                ]),
                'data' => $cleanData,
                'android' => [
                    'priority' => 'high',
                    'notification' => array_filter([
                        'sound' => 'default',
                        'image' => $imageUrl,
                        'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                    ]),
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'sound' => 'default',
                            'badge' => 1,
                        ],
                    ],
                ],
            ],
        ];

        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        $response = Http::timeout(20)
            ->withToken($accessToken)
            ->post($url, $payload);

        if (!$response->successful()) {
            $errorBody = $response->json('error.message') ?: $response->body();
            throw new RuntimeException("FCM v1 returned HTTP {$response->status()}: {$errorBody}");
        }
    }

    private function sendViaLegacy(string $serverKey, string $token, string $title, string $body, ?string $imageUrl = null, array $data = []): void
    {
        $cleanData = [];
        foreach ($data as $k => $v) {
            if ($v !== null) {
                $cleanData[(string) $k] = is_scalar($v) ? (string) $v : json_encode($v);
            }
        }
        $cleanData['title'] = (string) $title;
        $cleanData['body'] = (string) $body;
        if ($imageUrl) {
            $cleanData['image'] = (string) $imageUrl;
        }

        $payload = [
            'to' => $token,
            'notification' => array_filter([
                'title' => $title,
                'body' => $body,
                'image' => $imageUrl,
            ]),
            'data' => $cleanData,
        ];

        $response = Http::timeout(20)
            ->withHeaders(['Authorization' => 'key='.$serverKey])
            ->post('https://fcm.googleapis.com/fcm/send', $payload);

        if (!$response->successful()) {
            throw new RuntimeException("FCM legacy returned HTTP {$response->status()}");
        }
    }

    private function getAccessToken(array $creds): string
    {
        $cacheKey = 'fcm_v1_access_token_' . md5($creds['client_email']);

        return Cache::remember($cacheKey, 3000, function () use ($creds) {
            $jwt = $this->createJwt($creds);

            $response = Http::asForm()->timeout(15)->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if (!$response->successful()) {
                throw new RuntimeException('Failed to obtain Google OAuth access token: ' . $response->body());
            }

            $token = $response->json('access_token');
            if (!$token) {
                throw new RuntimeException('No access_token returned by Google OAuth');
            }

            return $token;
        });
    }

    private function createJwt(array $creds): string
    {
        $now = time();
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $payload = [
            'iss' => $creds['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now,
        ];

        $encodedHeader = $this->base64UrlEncode((string) json_encode($header));
        $encodedPayload = $this->base64UrlEncode((string) json_encode($payload));
        $signatureInput = "{$encodedHeader}.{$encodedPayload}";

        $privateKey = openssl_pkey_get_private($creds['private_key']);
        if (!$privateKey) {
            throw new RuntimeException('Invalid private key in Firebase credentials file.');
        }

        $signature = '';
        if (!openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Failed to sign JWT with private key.');
        }

        $encodedSignature = $this->base64UrlEncode($signature);

        return "{$signatureInput}.{$encodedSignature}";
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
