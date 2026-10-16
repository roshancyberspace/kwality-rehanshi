<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerProfile;
use App\Support\CustomerPasswordMailer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerAuthController extends Controller
{
    public function __construct(private CustomerPasswordMailer $passwordMailer)
    {
    }

    private function publicCustomer(CustomerProfile $customer, ?string $token = null): array
    {
        $metadata = $customer->metadata ?? [];
        unset(
            $metadata['password'],
            $metadata['password_hash'],
            $metadata['session_token'],
            $metadata['password_reset'],
            $metadata['login_otp']
        );

        $response = [
            ...$customer->toArray(),
            'metadata' => $metadata,
        ];

        if ($token) {
            $response['auth_token'] = $token;
            $response['token_type'] = 'Bearer';
        }

        return $response;
    }

    private function devicePayload(Request $request): array
    {
        return $request->validate([
            'device_id' => ['nullable', 'string', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:255'],
            'device_token' => ['nullable', 'string', 'max:1000'],
            'fcm_token' => ['nullable', 'string', 'max:1000'],
            'apns_token' => ['nullable', 'string', 'max:1000'],
            'platform' => ['nullable', 'string', 'in:android,ios,web'],
        ]);
    }

    private function syncDevice(CustomerProfile $customer, array $device): void
    {
        $pushToken = $device['fcm_token'] ?? $device['device_token'] ?? $device['apns_token'] ?? null;
        if (! $pushToken) {
            return;
        }

        $metadata = $customer->metadata ?? [];
        $devices = collect($metadata['devices'] ?? [])
            ->reject(fn ($item) => ($item['push_token'] ?? null) === $pushToken)
            ->values()
            ->all();

        array_unshift($devices, [
            'apns_token' => $device['apns_token'] ?? null,
            'device_id' => $device['device_id'] ?? null,
            'device_name' => $device['device_name'] ?? null,
            'fcm_token' => $device['fcm_token'] ?? $device['device_token'] ?? null,
            'platform' => $device['platform'] ?? null,
            'push_token' => $pushToken,
            'updated_at' => now()->toISOString(),
        ]);

        $metadata['devices'] = array_slice($devices, 0, 10);
        $metadata['last_device'] = $metadata['devices'][0];
        $customer->forceFill(['metadata' => $metadata])->save();
    }

    public function checkAvailability(Request $request)
    {
        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $errors = $this->availabilityErrors($data['email'] ?? null, $data['phone'] ?? null);

        return response()->json([
            'available' => $errors === [],
            'errors' => $errors,
        ]);
    }

    public function sendSignupOtp(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
        ]);

        $email = strtolower(trim($data['email']));
        $phone = trim($data['phone']);
        $name = trim($data['name']);

        $digits = preg_replace('/\D+/', '', $phone);
        if (strlen($digits) < 10) {
            return response()->json([
                'message' => 'Please enter a valid 10-digit mobile number.',
                'errors' => ['phone' => ['Please enter a valid 10-digit mobile number.']],
            ], 422);
        }

        $errors = $this->availabilityErrors($email, $phone);
        if ($errors !== []) {
            return response()->json([
                'message' => reset($errors)[0] ?? 'Account details already registered.',
                'errors' => $errors,
            ], 422);
        }

        $last10Phone = strlen($digits) >= 10 ? substr($digits, -10) : $digits;
        $emailCacheKey = 'customer_signup_otp_' . md5($email);
        $phoneCacheKey = 'customer_signup_otp_phone_' . $last10Phone;
        $existing = Cache::get($emailCacheKey) ?: Cache::get($phoneCacheKey);

        if (is_array($existing) && ! empty($existing['last_sent_at'])) {
            $elapsed = \Illuminate\Support\Carbon::parse($existing['last_sent_at'])->diffInSeconds(now());
            if ($elapsed < 45) {
                $wait = 45 - $elapsed;

                return response()->json([
                    'message' => "Please wait {$wait}s before requesting another OTP.",
                    'errors' => ['otp' => ["Please wait {$wait}s before requesting another OTP."]],
                    'retry_after' => $wait,
                ], 429);
            }
        }

        $otp = (string) random_int(100000, 999999);

        $payload = [
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
            'email' => $email,
            'phone' => $phone,
            'name' => $name,
            'attempts' => 0,
            'last_sent_at' => now()->toIso8601String(),
        ];

        Cache::put($emailCacheKey, $payload, now()->addMinutes(10));
        Cache::put($phoneCacheKey, $payload, now()->addMinutes(10));

        // Send OTP via SMS
        $sentViaSms = app(\App\Support\SmsService::class)->sendOtp($phone, $otp);

        // Attempt sending OTP via Email (optional fallback/secondary)
        $sentViaEmail = false;
        try {
            $this->passwordMailer->sendSignupOtp($email, $name, $otp);
            $sentViaEmail = true;
        } catch (\Throwable $e) {
            Log::warning('Customer signup OTP mail failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }

        Log::info('Customer signup OTP dispatched', [
            'email' => $email,
            'phone' => $phone,
            'sent_via_sms' => $sentViaSms,
            'sent_via_email' => $sentViaEmail,
        ]);

        if (! $sentViaSms && ! $sentViaEmail) {
            return response()->json([
                'message' => 'Unable to send OTP verification code right now. Please check your mobile number and try again.',
                'errors' => ['phone' => ['Unable to send SMS to this mobile number. Please check the number and try again.']],
            ], 422);
        }

        $destinations = [];
        if ($sentViaSms) {
            $destinations[] = 'mobile number (' . $this->maskPhone($phone) . ')';
        }
        if ($sentViaEmail) {
            $destinations[] = 'email (' . $this->maskEmail($email) . ')';
        }

        return response()->json([
            'message' => 'OTP sent successfully to your ' . implode(' and ', $destinations) . '.',
            'channel' => $sentViaSms ? 'phone' : 'email',
            'sent_sms' => $sentViaSms,
            'sent_email' => $sentViaEmail,
            'masked_phone' => $this->maskPhone($phone),
            'masked_email' => $this->maskEmail($email),
            'masked_destination' => $sentViaSms ? $this->maskPhone($phone) : $this->maskEmail($email),
            'resend_after' => 45,
        ]);
    }

    public function verifySignupOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'otp' => ['required', 'digits:6'],
        ]);

        $email = ! empty($data['email']) ? strtolower(trim($data['email'])) : null;
        $phone = ! empty($data['phone']) ? trim($data['phone']) : null;

        if (! $email && ! $phone) {
            return response()->json([
                'message' => 'Email or mobile number is required to verify OTP.',
                'errors' => ['otp' => ['Email or mobile number is required to verify OTP.']],
            ], 422);
        }

        $emailCacheKey = $email ? 'customer_signup_otp_' . md5($email) : null;
        $digits = $phone ? preg_replace('/\D+/', '', $phone) : null;
        $last10 = $digits && strlen($digits) >= 10 ? substr($digits, -10) : $digits;
        $phoneCacheKey = $last10 ? 'customer_signup_otp_phone_' . $last10 : null;

        $payload = ($emailCacheKey ? Cache::get($emailCacheKey) : null)
            ?: ($phoneCacheKey ? Cache::get($phoneCacheKey) : null);

        if (! is_array($payload)) {
            return response()->json([
                'message' => 'OTP expired or not found. Please request a new OTP.',
                'errors' => ['otp' => ['OTP expired or not found. Please request a new OTP.']],
            ], 422);
        }

        if (now()->greaterThan($payload['expires_at'] ?? now()->subSecond())) {
            if ($emailCacheKey) Cache::forget($emailCacheKey);
            if ($phoneCacheKey) Cache::forget($phoneCacheKey);

            return response()->json([
                'message' => 'OTP has expired. Please request a new OTP.',
                'errors' => ['otp' => ['OTP has expired. Please request a new OTP.']],
            ], 422);
        }

        $attempts = (int) ($payload['attempts'] ?? 0);
        if ($attempts >= 5) {
            if ($emailCacheKey) Cache::forget($emailCacheKey);
            if ($phoneCacheKey) Cache::forget($phoneCacheKey);

            return response()->json([
                'message' => 'Too many invalid attempts. Please request a new OTP.',
                'errors' => ['otp' => ['Too many invalid attempts. Please request a new OTP.']],
            ], 422);
        }

        if (! Hash::check($data['otp'], (string) ($payload['otp_hash'] ?? ''))) {
            $payload['attempts'] = $attempts + 1;
            if ($emailCacheKey) Cache::put($emailCacheKey, $payload, now()->addMinutes(10));
            if ($phoneCacheKey) Cache::put($phoneCacheKey, $payload, now()->addMinutes(10));

            return response()->json([
                'message' => 'Invalid OTP. Please try again.',
                'errors' => ['otp' => ['Invalid OTP. Please try again.']],
            ], 422);
        }

        if ($emailCacheKey) Cache::forget($emailCacheKey);
        if ($phoneCacheKey) Cache::forget($phoneCacheKey);

        $signupToken = Str::random(64);
        $verifiedKey = 'customer_signup_verified_' . $signupToken;

        $verifiedEmail = $payload['email'] ?? $email;
        $verifiedPhone = $payload['phone'] ?? $phone;

        Cache::put($verifiedKey, [
            'email' => $verifiedEmail,
            'phone' => $verifiedPhone,
            'name' => $payload['name'] ?? null,
            'is_phone_verified' => true,
            'phone_verified_at' => now()->toIso8601String(),
            'is_email_verified' => ! empty($verifiedEmail),
            'email_verified_at' => ! empty($verifiedEmail) ? now()->toIso8601String() : null,
            'verified_at' => now()->toIso8601String(),
        ], now()->addMinutes(20));

        return response()->json([
            'message' => 'Mobile number and email verified successfully.',
            'signup_token' => $signupToken,
            'email' => $verifiedEmail,
            'phone' => $verifiedPhone,
            'is_phone_verified' => true,
        ]);
    }


    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8', 'max:100'],
            'signup_token' => ['nullable', 'string', 'max:100'],
        ]);

        $email = ! empty($data['email']) ? strtolower(trim($data['email'])) : null;
        $phone = trim($data['phone']);

        if (! empty($data['signup_token'])) {
            $verifiedKey = 'customer_signup_verified_' . $data['signup_token'];
            $verified = Cache::get($verifiedKey);

            $emailMismatch = is_array($verified) && ! empty($email) && ! empty($verified['email']) && strtolower($verified['email']) !== $email;
            $phoneDigits = preg_replace('/\D+/', '', $phone);
            $vPhoneDigits = is_array($verified) && ! empty($verified['phone']) ? preg_replace('/\D+/', '', $verified['phone']) : '';
            $phoneMismatch = is_array($verified) && $vPhoneDigits !== '' && substr($phoneDigits, -10) !== substr($vPhoneDigits, -10);

            if (! is_array($verified) || $emailMismatch || $phoneMismatch) {
                return response()->json([
                    'message' => 'Signup session expired or invalid. Please verify OTP again.',
                    'errors' => ['otp' => ['Signup session expired or invalid. Please verify OTP again.']],
                ], 422);
            }
            Cache::forget($verifiedKey);
        }

        $errors = $this->availabilityErrors($email, $phone);
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $customer = CustomerProfile::create([
            'phone' => $phone,
            'name' => $data['name'],
            'email' => $email,
            'status' => 'Active',
            'password' => Hash::make($data['password']),
            'metadata' => [
                'registration_source' => 'customer_signup',
                'is_phone_verified' => true,
                'phone_verified_at' => ($verified['phone_verified_at'] ?? now()->toIso8601String()),
                'is_email_verified' => ! empty($email),
                'email_verified_at' => ! empty($email) ? ($verified['email_verified_at'] ?? now()->toIso8601String()) : null,
            ],
        ]);


        $this->syncDevice($customer, $this->devicePayload($request));

        $token = $customer->createToken('auth_token')->plainTextToken;

        return response()->json($this->publicCustomer($customer->fresh(), $token));
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:100'],
        ]);

        $identifier = trim((string) ($data['login'] ?? $data['phone'] ?? $data['email'] ?? ''));
        if ($identifier === '') {
            return response()->json([
                'message' => 'Enter your mobile number or email.',
                'errors' => ['login' => ['Enter your mobile number or email.']],
            ], 422);
        }

        $customer = $this->findCustomerByIdentifier($identifier, true);

        if ($customer && in_array(strtolower($customer->status ?? ''), ['deleted', 'inactive_deleted'], true)) {
            return response()->json([
                'message' => 'This account has been deleted. Please contact support or use a different mobile number/email.',
                'errors' => ['login' => ['This account has been deleted. Please contact support or use a different mobile number/email.']],
                'is_deleted' => true,
            ], 422);
        }

        $legacyPasswordHash = $customer?->metadata['password_hash'] ?? null;
        $legacyPassword = $customer?->metadata['password'] ?? null;

        $isValidPassword = false;

        if ($customer && $customer->password && Hash::check($data['password'], $customer->password)) {
            $isValidPassword = true;
        } elseif ($customer && $legacyPasswordHash && Hash::check($data['password'], $legacyPasswordHash)) {
            $isValidPassword = true;
            $customer->password = Hash::make($data['password']);
            $metadata = $customer->metadata ?? [];
            unset($metadata['password_hash']);
            $customer->metadata = $metadata;
            $customer->save();
        } elseif ($customer && $legacyPassword && hash_equals((string) $legacyPassword, $data['password'])) {
            $isValidPassword = true;
            $customer->password = Hash::make($data['password']);
            $metadata = $customer->metadata ?? [];
            unset($metadata['password']);
            $customer->metadata = $metadata;
            $customer->save();
        }

        if (! $customer || ! $isValidPassword) {
            return response()->json(['message' => 'Invalid mobile number/email or password.'], 422);
        }

        $token = $customer->createToken('auth_token')->plainTextToken;
        $this->syncDevice($customer, $this->devicePayload($request));
        $this->recordCustomerLoginLog($customer, $request);

        return response()->json($this->publicCustomer($customer->fresh(), $token));
    }

    public function sendLoginOtp(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
        ]);

        $identifier = trim($data['login']);
        $customer = $this->findCustomerByIdentifier($identifier, true);

        if ($customer && in_array(strtolower($customer->status ?? ''), ['deleted', 'inactive_deleted'], true)) {
            return response()->json([
                'message' => 'This account has been deleted. Please contact support or use a different mobile number/email.',
                'errors' => ['login' => ['This account has been deleted. Please contact support or use a different mobile number/email.']],
                'is_deleted' => true,
            ], 422);
        }

        if (! $customer) {
            return response()->json([
                'message' => 'No active customer account found with this mobile number or email.',
                'errors' => ['login' => ['No account found for this mobile number or email.']],
            ], 422);
        }

        // Resend cooldown check (45 seconds)
        $existingOtp = $customer->metadata['login_otp'] ?? null;
        if (is_array($existingOtp) && ! empty($existingOtp['last_sent_at'])) {
            $elapsed = \Illuminate\Support\Carbon::parse($existingOtp['last_sent_at'])->diffInSeconds(now());
            if ($elapsed < 45) {
                $wait = 45 - $elapsed;

                return response()->json([
                    'message' => "Please wait {$wait}s before requesting another OTP.",
                    'errors' => ['login' => ["Please wait {$wait}s before requesting another OTP."]],
                    'retry_after' => $wait,
                ], 429);
            }
        }

        $otp = (string) random_int(100000, 999999);
        $channel = $this->isEmailIdentifier($identifier) ? 'email' : 'phone';

        $metadata = $customer->metadata ?? [];
        $metadata['login_otp'] = [
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
            'channel' => $channel,
            'identifier' => $identifier,
            'attempts' => 0,
            'last_sent_at' => now()->toIso8601String(),
        ];
        $customer->forceFill(['metadata' => $metadata])->save();

        $smsPhone = $customer->phone ?: ($channel === 'phone' ? $identifier : null);
        $deliveryEmail = $customer->email ?: ($channel === 'email' ? $identifier : null);

        $sentViaSms = false;
        if ($smsPhone) {
            $sentViaSms = app(\App\Support\SmsService::class)->sendOtp($smsPhone, $otp);
        }

        $sentViaEmail = false;
        if ($deliveryEmail) {
            try {
                $this->passwordMailer->sendLoginOtp($deliveryEmail, $customer->name, $otp);
                $sentViaEmail = true;
            } catch (\Throwable $e) {
                Log::warning('Customer login OTP mail failed', [
                    'email' => $deliveryEmail,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Customer login OTP dispatched', [
            'customer_id' => $customer->id,
            'channel' => $channel,
            'phone' => $smsPhone,
            'email' => $deliveryEmail,
            'sent_via_sms' => $sentViaSms,
            'sent_via_email' => $sentViaEmail,
        ]);

        if (! $sentViaSms && ! $sentViaEmail) {
            return response()->json([
                'message' => 'Unable to send OTP verification code right now. Please try password login or check your details.',
                'errors' => ['login' => ['Unable to send OTP. Please try password login or contact support.']],
            ], 422);
        }

        if ($channel === 'phone') {
            $maskedPhone = $this->maskPhone($smsPhone ?: $identifier);
            $message = $sentViaSms
                ? ($sentViaEmail ? "OTP sent to your mobile number ({$maskedPhone}) and registered email." : "OTP sent to your mobile number ({$maskedPhone}).")
                : "OTP sent to your registered email address.";

            return response()->json([
                'message' => $message,
                'channel' => 'phone',
                'sent_sms' => $sentViaSms,
                'sent_email' => $sentViaEmail,
                'masked_destination' => $maskedPhone,
                'masked_phone' => $maskedPhone,
                'resend_after' => 45,
            ]);
        }

        $maskedEmail = $this->maskEmail($deliveryEmail ?: $identifier);
        $message = $sentViaEmail
            ? ($sentViaSms ? "OTP sent to your email ({$maskedEmail}) and registered mobile number." : "OTP sent to your email ({$maskedEmail}).")
            : "OTP sent to your registered mobile number.";

        return response()->json([
            'message' => $message,
            'channel' => 'email',
            'sent_sms' => $sentViaSms,
            'sent_email' => $sentViaEmail,
            'masked_destination' => $maskedEmail,
            'masked_email' => $maskedEmail,
            'resend_after' => 45,
        ]);
    }

    public function verifyLoginOtp(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'otp' => ['required', 'digits:6'],
        ]);

        $identifier = trim($data['login']);
        $customer = $this->findCustomerByIdentifier($identifier);
        $loginOtp = $customer?->metadata['login_otp'] ?? null;

        if (! $customer || ! $this->isValidLoginOtp($loginOtp, $data['otp'])) {
            return response()->json([
                'message' => 'Invalid or expired OTP.',
                'errors' => ['otp' => ['Invalid or expired OTP.']],
            ], 422);
        }

        $metadata = $customer->metadata ?? [];
        unset($metadata['login_otp']);
        if (! empty($customer->phone)) {
            $metadata['is_phone_verified'] = true;
            $metadata['phone_verified_at'] = now()->toIso8601String();
        }
        $customer->forceFill(['metadata' => $metadata])->save();

        $token = $customer->createToken('auth_token')->plainTextToken;
        $this->syncDevice($customer, $this->devicePayload($request));
        $this->recordCustomerLoginLog($customer, $request);

        return response()->json($this->publicCustomer($customer->fresh(), $token));
    }


    private function recordCustomerLoginLog(CustomerProfile $customer, Request $request): void
    {
        $lastDevice = ($customer->metadata ?? [])['last_device'] ?? [];
        \App\Models\LoginLog::create([
            'user_type' => 'Customer',
            'user_id' => $customer->id,
            'user_name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'role' => 'Customer',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_name' => $request->input('device_name') ?: ($lastDevice['device_name'] ?? ($request->input('platform') ? ucfirst($request->input('platform')) : 'Customer Device')),
            'device_id' => $request->input('device_id') ?: ($lastDevice['device_id'] ?? null),
            'platform' => $request->input('platform') ?: ($lastDevice['platform'] ?? 'web'),
            'fcm_token' => $request->input('fcm_token') ?: $request->input('device_token') ?: ($lastDevice['fcm_token'] ?? $lastDevice['push_token'] ?? null),
            'apns_token' => $request->input('apns_token') ?: ($lastDevice['apns_token'] ?? null),
            'latitude' => $request->input('latitude') ?: $request->input('lat'),
            'longitude' => $request->input('longitude') ?: $request->input('lng'),
            'location_name' => ($customer->metadata ?? [])['city'] ?? null,
            'status' => 'Success',
            'is_blocked' => false,
        ]);
    }

    private function availabilityErrors(?string $email, ?string $phone): array
    {
        $errors = [];

        if ($phone !== null && trim($phone) !== '') {
            if ($this->findCustomerByPhone($phone)) {
                $errors['phone'] = ['This mobile number already exists.'];
            }
        }

        if ($email !== null && trim($email) !== '') {
            if ($this->findCustomerByEmail($email)) {
                $errors['email'] = ['This email already exists.'];
            }
        }

        return $errors;
    }

    private function findCustomerByPhone(string $phone): ?CustomerProfile
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        $last10 = strlen($digits) >= 10 ? substr($digits, -10) : $digits;
        $variants = array_values(array_unique(array_filter([
            trim($phone),
            $digits,
            $last10,
            $last10 !== '' ? '91'.$last10 : null,
            $last10 !== '' ? '+91'.$last10 : null,
        ])));

        if ($variants === []) {
            return null;
        }

        return CustomerProfile::query()
            ->where(function ($inner) use ($variants, $last10, $digits) {
                foreach ($variants as $index => $variant) {
                    if ($index === 0) {
                        $inner->where('phone', $variant);
                    } else {
                        $inner->orWhere('phone', $variant);
                    }
                }

                if ($digits !== '') {
                    $inner->orWhereRaw("REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?", ['%'.$digits]);
                }

                if ($last10 !== '' && $last10 !== $digits) {
                    $inner->orWhereRaw("REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?", ['%'.$last10]);
                }
            })
            ->first();
    }

    private function findCustomerByEmail(string $email): ?CustomerProfile
    {
        return CustomerProfile::query()
            ->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])
            ->first();
    }

    private function findCustomerByIdentifier(string $identifier, bool $includeDeleted = false): ?CustomerProfile
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            return null;
        }

        $query = CustomerProfile::query()->where('status', '!=', 'Blocked');
        if (! $includeDeleted) {
            $query->whereNotIn('status', ['Deleted', 'Inactive_deleted']);
        }

        if ($this->isEmailIdentifier($identifier)) {
            return $query->whereRaw('LOWER(email) = ?', [strtolower($identifier)])->first();
        }

        $digits = preg_replace('/\D+/', '', $identifier) ?: '';
        $variants = array_values(array_unique(array_filter([
            $identifier,
            $digits,
            strlen($digits) > 10 ? substr($digits, -10) : null,
            strlen($digits) === 10 ? '91'.$digits : null,
            strlen($digits) === 10 ? '+91'.$digits : null,
        ])));

        return $query
            ->where(function ($inner) use ($variants, $digits) {
                foreach ($variants as $index => $variant) {
                    if ($index === 0) {
                        $inner->where('phone', $variant);
                    } else {
                        $inner->orWhere('phone', $variant);
                    }
                }

                if ($digits !== '') {
                    $inner->orWhereRaw("REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?", ['%'.$digits]);
                    if (strlen($digits) >= 10) {
                        $inner->orWhereRaw("REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?", ['%'.substr($digits, -10)]);
                    }
                }
            })
            ->first();
    }

    private function isEmailIdentifier(string $identifier): bool
    {
        return (bool) filter_var($identifier, FILTER_VALIDATE_EMAIL);
    }

    private function isValidLoginOtp(?array $loginOtp, string $otp): bool
    {
        if (! $loginOtp || now()->greaterThan($loginOtp['expires_at'] ?? now()->subSecond())) {
            return false;
        }

        return Hash::check($otp, (string) ($loginOtp['otp_hash'] ?? ''));
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = substr($local, 0, 1);

        return $visible.'***@'.$domain;
    }

    private function maskPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: $phone;
        if (strlen($digits) < 4) {
            return '****';
        }

        return str_repeat('*', max(0, strlen($digits) - 4)).substr($digits, -4);
    }

    public function me(Request $request)
    {
        return response()->json($this->publicCustomer($request->user()));
    }

    public function session(Request $request)
    {
        // Legacy fallback that redirects to /me but assumes token is passed in body
        // The token needs to be passed via Bearer header now.
        // We will just validate using Sanctum middleware later.
        $customer = $request->user('customer');
        if (!$customer) {
            return response()->json(['message' => 'Invalid mobile number or password.'], 422);
        }
        return response()->json($this->publicCustomer($customer, null));
    }

    public function logout(Request $request)
    {
        $customer = $request->user();
        if ($customer) {
            // Revoke current token
            $request->user()->currentAccessToken()->delete();
        }
        return response()->json(['message' => 'Logged out']);
    }

    public function sendPasswordOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $customer = CustomerProfile::query()
            ->where('email', $data['email'])
            ->where('status', '!=', 'Blocked')
            ->first();

        if (! $customer) {
            return response()->json(['message' => 'No active customer account found with this email.'], 422);
        }

        $otp = (string) random_int(100000, 999999);
        $metadata = $customer->metadata ?? [];
        $metadata['password_reset'] = [
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
            'verified_at' => null,
            'reset_token_hash' => null,
        ];

        $customer->forceFill(['metadata' => $metadata])->save();

        $sentViaEmail = false;
        try {
            $this->passwordMailer->sendOtp($customer->email, $customer->name, $otp);
            $sentViaEmail = true;
        } catch (\Throwable $e) {
            Log::warning('Customer password reset OTP mail failed: ' . $e->getMessage());
        }

        $sentViaSms = app(\App\Support\SmsService::class)->sendOtp($customer->phone, $otp);

        if (! $sentViaSms && ! $sentViaEmail) {
            return response()->json(['message' => 'Unable to send OTP verification code right now. Please check your contact details and try again.'], 422);
        }

        return response()->json([
            'message' => $sentViaSms
                ? ($sentViaEmail ? 'OTP sent to your registered email and mobile number.' : 'OTP sent to your registered mobile number.')
                : 'OTP sent to your registered email.',
        ]);
    }

    public function verifyPasswordOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'otp' => ['required', 'digits:6'],
        ]);

        $customer = $this->customerForPasswordReset($data['email']);
        $reset = $customer?->metadata['password_reset'] ?? null;

        if (! $customer || ! $this->isValidPasswordOtp($reset, $data['otp'])) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 422);
        }

        $resetToken = Str::random(64);
        $metadata = $customer->metadata ?? [];
        $metadata['password_reset'] = [
            ...$reset,
            'verified_at' => now()->toIso8601String(),
            'reset_token_hash' => hash('sha256', $resetToken),
        ];
        $customer->forceFill(['metadata' => $metadata])->save();

        return response()->json([
            'message' => 'OTP verified. You can now set a new password.',
            'reset_token' => $resetToken,
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'reset_token' => ['required', 'string', 'size:64'],
        ]);

        $customer = $this->customerForPasswordReset($data['email']);
        $reset = $customer?->metadata['password_reset'] ?? null;
        $tokenHash = $reset['reset_token_hash'] ?? '';

        if (
            ! $customer
            || ! $reset
            || now()->greaterThan($reset['expires_at'] ?? now()->subSecond())
            || ! hash_equals((string) $tokenHash, hash('sha256', $data['reset_token']))
        ) {
            return response()->json(['message' => 'Password reset session has expired. Please request a new OTP.'], 422);
        }

        $customer->password = Hash::make($data['password']);
        $metadata = $customer->metadata ?? [];
        unset($metadata['password'], $metadata['password_hash'], $metadata['password_reset'], $metadata['session_token']);

        $customer->forceFill(['metadata' => $metadata])->save();

        return response()->json(['message' => 'Password changed successfully. Please login with your new password.']);
    }

    private function customerForPasswordReset(string $email): ?CustomerProfile
    {
        return CustomerProfile::query()
            ->where('email', $email)
            ->where('status', '!=', 'Blocked')
            ->first();
    }

    private function isValidPasswordOtp(?array $reset, string $otp): bool
    {
        if (! $reset || now()->greaterThan($reset['expires_at'] ?? now()->subSecond())) {
            return false;
        }

        return Hash::check($otp, (string) ($reset['otp_hash'] ?? ''));
    }
}
