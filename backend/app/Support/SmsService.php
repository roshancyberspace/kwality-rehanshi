<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Send an OTP SMS using the approved DLT template.
     * The text must match the registered DLT template exactly.
     */
    public function sendOtp(?string $phone, string $otp): bool
    {
        $text = "Your OTP for verification is {$otp}. Please do not share this code with anyone. Valid for 10 minutes.Rehanshi Technology";

        return $this->send($phone, $text);
    }

    public function send(?string $phone, string $text): bool
    {
        $config = config('services.sms');
        $number = $this->normalizeNumber($phone);

        if (! $number || empty($config['url']) || empty($config['user']) || empty($config['password'])) {
            Log::info('SMS skipped: missing number or SMS config', ['phone' => $phone]);

            return false;
        }

        try {
            $response = Http::timeout(10)->get($config['url'], [
                'user' => $config['user'],
                'password' => $config['password'],
                'senderid' => $config['sender'],
                'channel' => 'Trans',
                'DCS' => 0,
                'flashsms' => 0,
                'number' => $number,
                'text' => $text,
                'DLTTemplateId' => $config['dlt_template_id'],
                'TelemarketerId' => $config['telemarketer_id'],
                'Peid' => $config['peid'],
                'route' => $config['route'],
            ]);

            if (! $response->successful()) {
                Log::error('SMS API failed', ['status' => $response->status(), 'body' => $response->body()]);

                return false;
            }

            $body = $response->body();
            $json = $response->json();
            $errorCode = is_array($json) ? ($json['ErrorCode'] ?? null) : null;
            $isSuccess = in_array((string) $errorCode, ['000', '0'], true)
                || (isset($json['ErrorMessage']) && strtolower((string) $json['ErrorMessage']) === 'done')
                || str_contains($body, '"ErrorCode":"000"');

            Log::info('SMS API response', [
                'number' => $number,
                'status' => $response->status(),
                'success' => $isSuccess,
                'body' => $body,
            ]);

            return $isSuccess;
        } catch (\Throwable $e) {
            Log::error('SMS send exception', ['number' => $number, 'error' => $e->getMessage()]);

            return false;
        }
    }

    public function normalizeNumber(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);

        if (strlen($digits) === 10) {
            return '91'.$digits;
        }

        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            return $digits;
        }

        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            return '91'.substr($digits, 1);
        }

        return null;
    }
}

