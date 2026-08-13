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

/**
 * Isolated Mobile/Tablet guest-cart OTP onboarding.
 * Does not alter existing customer login/register OTP contracts.
 */
class GuestCartAuthController extends Controller
{
    private const OTP_TTL_MINUTES = 10;
    private const VERIFY_TOKEN_TTL_MINUTES = 20;
    private const RESEND_COOLDOWN_SECONDS = 45;
    private const MAX_VERIFY_ATTEMPTS = 5;

    public function __construct(private CustomerPasswordMailer $passwordMailer)
    {
    }

    public function checkIdentifier(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
        ]);

        [$identifier, $channel] = $this->normalizeIdentifier($data['login']);
        $customer = $this->findCustomerByIdentifier($identifier);

        return response()->json([
            'exists' => (bool) $customer,
            'channel' => $channel,
            'masked_destination' => $channel === 'email'
                ? $this->maskEmail($identifier)
                : $this->maskPhone($identifier),
        ]);
    }

    public function sendOtp(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
        ]);

        [$identifier, $channel] = $this->normalizeIdentifier($data['login']);
        $cacheKey = $this->otpCacheKey($identifier);
        $existing = Cache::get($cacheKey);

        if (is_array($existing) && ! empty($existing['last_sent_at'])) {
            $elapsed = \Illuminate\Support\Carbon::parse($existing['last_sent_at'])->diffInSeconds(now());
            if ($elapsed < self::RESEND_COOLDOWN_SECONDS) {
                $wait = self::RESEND_COOLDOWN_SECONDS - $elapsed;

                return response()->json([
                    'message' => "Please wait {$wait}s before requesting another OTP.",
                    'errors' => ['login' => ["Please wait {$wait}s before requesting another OTP."]],
                    'retry_after' => $wait,
                ], 429);
            }
        }

        $customer = $this->findCustomerByIdentifier($identifier);
        $otp = (string) random_int(100000, 999999);

        $payload = [
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES)->toIso8601String(),
            'channel' => $channel,
            'identifier' => $identifier,
            'exists' => (bool) $customer,
            'customer_id' => $customer?->id,
            'attempts' => 0,
            'last_sent_at' => now()->toIso8601String(),
        ];

        Cache::put($cacheKey, $payload, now()->addMinutes(self::OTP_TTL_MINUTES));

        $deliveryEmail = $channel === 'email'
            ? $identifier
            : ($customer?->email ?: null);

        $sentViaEmail = false;
        if ($deliveryEmail) {
            try {
                $this->passwordMailer->sendGuestCartOtp(
                    $deliveryEmail,
                    $customer?->name ?: 'Customer',
                    $otp
                );
                $sentViaEmail = true;
            } catch (\Throwable) {
                return response()->json([
                    'message' => 'Unable to send OTP right now. Please try again.',
                    'errors' => ['login' => ['Unable to send OTP right now. Please try again.']],
                ], 422);
            }
        } elseif (config('app.debug')) {
            Log::debug('Guest cart OTP (phone, debug only)', [
                'identifier' => $this->maskPhone($identifier),
            ]);
        }

        $response = [
            'message' => $sentViaEmail
                ? 'OTP sent successfully.'
                : 'OTP generated for your mobile number.',
            'exists' => (bool) $customer,
            'channel' => $channel,
            'masked_destination' => $channel === 'email'
                ? $this->maskEmail($identifier)
                : $this->maskPhone($identifier),
            'resend_after' => self::RESEND_COOLDOWN_SECONDS,
        ];

        if (config('app.debug')) {
            $response['debug_otp'] = $otp;
        }

        return response()->json($response);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'otp' => ['required', 'digits:6'],
        ]);

        [$identifier] = $this->normalizeIdentifier($data['login']);
        $cacheKey = $this->otpCacheKey($identifier);
        $payload = Cache::get($cacheKey);

        if (! is_array($payload)) {
            return response()->json([
                'message' => 'OTP expired or not found. Please request a new OTP.',
                'errors' => ['otp' => ['OTP expired or not found. Please request a new OTP.']],
            ], 422);
        }

        if (now()->greaterThan($payload['expires_at'] ?? now()->subSecond())) {
            Cache::forget($cacheKey);

            return response()->json([
                'message' => 'OTP has expired. Please request a new OTP.',
                'errors' => ['otp' => ['OTP has expired. Please request a new OTP.']],
            ], 422);
        }

        $attempts = (int) ($payload['attempts'] ?? 0);
        if ($attempts >= self::MAX_VERIFY_ATTEMPTS) {
            Cache::forget($cacheKey);

            return response()->json([
                'message' => 'Too many invalid attempts. Please request a new OTP.',
                'errors' => ['otp' => ['Too many invalid attempts. Please request a new OTP.']],
            ], 422);
        }

        if (! Hash::check($data['otp'], (string) ($payload['otp_hash'] ?? ''))) {
            $payload['attempts'] = $attempts + 1;
            Cache::put($cacheKey, $payload, now()->addMinutes(self::OTP_TTL_MINUTES));

            return response()->json([
                'message' => 'Invalid OTP. Please try again.',
                'errors' => ['otp' => ['Invalid OTP. Please try again.']],
            ], 422);
        }

        Cache::forget($cacheKey);

        // Re-check existence at verify time (authoritative)
        $customer = $this->findCustomerByIdentifier($identifier);

        if ($customer) {
            $token = $customer->createToken('auth_token')->plainTextToken;

            return response()->json([
                ...$this->publicCustomer($customer->fresh(), $token),
                'auth_status' => 'authenticated',
                'is_new_user' => false,
            ]);
        }

        $verificationToken = Str::random(64);
        Cache::put($this->verifiedCacheKey($verificationToken), [
            'identifier' => $identifier,
            'channel' => $payload['channel'] ?? ($this->isEmailIdentifier($identifier) ? 'email' : 'phone'),
            'verified_at' => now()->toIso8601String(),
        ], now()->addMinutes(self::VERIFY_TOKEN_TTL_MINUTES));

        return response()->json([
            'auth_status' => 'needs_onboarding',
            'is_new_user' => true,
            'verification_token' => $verificationToken,
            'channel' => $payload['channel'] ?? ($this->isEmailIdentifier($identifier) ? 'email' : 'phone'),
            'identifier' => $identifier,
            'masked_destination' => ($payload['channel'] ?? '') === 'email'
                ? $this->maskEmail($identifier)
                : $this->maskPhone($identifier),
        ]);
    }

    public function completeRegistration(Request $request)
    {
        $data = $request->validate([
            'verification_token' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $verified = Cache::get($this->verifiedCacheKey($data['verification_token']));
        if (! is_array($verified) || empty($verified['identifier'])) {
            return response()->json([
                'message' => 'Verification expired. Please start again.',
                'errors' => ['verification_token' => ['Verification expired. Please start again.']],
            ], 422);
        }

        $channel = $verified['channel'] ?? 'phone';
        $primary = $verified['identifier'];

        if ($channel === 'email') {
            $email = $primary;
            $phone = trim((string) ($data['phone'] ?? ''));
            if ($phone === '') {
                throw ValidationException::withMessages([
                    'phone' => ['Mobile number is required.'],
                ]);
            }
        } else {
            $phone = $primary;
            $email = trim((string) ($data['email'] ?? ''));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw ValidationException::withMessages([
                    'email' => ['A valid email address is required.'],
                ]);
            }
        }

        // OTP-verified identifier must still be free (race / account created elsewhere).
        // Never treat this as an editable-field "already exists" error.
        if ($this->findCustomerByIdentifier($primary)) {
            Cache::forget($this->verifiedCacheKey($data['verification_token']));

            return response()->json([
                'message' => 'This verified contact was registered meanwhile. Please start again.',
                'errors' => [
                    'verification_token' => ['This verified contact was registered meanwhile. Please start again.'],
                ],
            ], 422);
        }

        // Only uniqueness-check the NEW secondary identifier entered with name.
        $secondaryKey = $channel === 'email' ? 'phone' : 'email';
        $secondaryErrors = $this->availabilityErrors(
            $channel === 'phone' ? $email : null,
            $channel === 'email' ? $phone : null
        );

        if ($secondaryErrors !== []) {
            $message = 'This email/mobile number is already registered with another account. Please use a different one.';

            return response()->json([
                'message' => $message,
                'errors' => [
                    $secondaryKey => [$message],
                ],
            ], 422);
        }

        $generatedPassword = Str::password(16);

        $customer = CustomerProfile::create([
            'phone' => $phone,
            'name' => trim($data['name']),
            'email' => $email,
            'status' => 'Active',
            'password' => Hash::make($generatedPassword),
            'metadata' => [
                'registration_source' => 'guest_cart_otp',
                'otp_verified_identifier' => $primary,
                'otp_verified_channel' => $channel,
            ],
        ]);

        Cache::forget($this->verifiedCacheKey($data['verification_token']));

        $token = $customer->createToken('auth_token')->plainTextToken;

        return response()->json([
            ...$this->publicCustomer($customer->fresh(), $token),
            'auth_status' => 'authenticated',
            'is_new_user' => true,
        ]);
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

    private function normalizeIdentifier(string $login): array
    {
        $identifier = trim($login);
        if ($identifier === '') {
            throw ValidationException::withMessages([
                'login' => ['Enter your email or mobile number.'],
            ]);
        }

        if ($this->isEmailIdentifier($identifier)) {
            return [strtolower($identifier), 'email'];
        }

        $digits = preg_replace('/\D+/', '', $identifier) ?: '';
        if (strlen($digits) < 10) {
            throw ValidationException::withMessages([
                'login' => ['Enter a valid email or 10-digit mobile number.'],
            ]);
        }

        $phone = strlen($digits) > 10 ? substr($digits, -10) : $digits;

        return [$phone, 'phone'];
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
            ->where('status', '!=', 'Blocked')
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
            ->where('status', '!=', 'Blocked')
            ->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])
            ->first();
    }

    private function findCustomerByIdentifier(string $identifier): ?CustomerProfile
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            return null;
        }

        if ($this->isEmailIdentifier($identifier)) {
            return $this->findCustomerByEmail($identifier);
        }

        return $this->findCustomerByPhone($identifier);
    }

    private function isEmailIdentifier(string $identifier): bool
    {
        return (bool) filter_var($identifier, FILTER_VALIDATE_EMAIL);
    }

    private function otpCacheKey(string $identifier): string
    {
        return 'guest_cart_otp:'.hash('sha256', strtolower(trim($identifier)));
    }

    private function verifiedCacheKey(string $token): string
    {
        return 'guest_cart_verified:'.$token;
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

        $last4 = substr($digits, -4);
        $prefix = strlen($digits) >= 10 ? '+91 ' : '';

        return $prefix.str_repeat('X', max(0, min(5, strlen($digits) - 4))).' '.$last4;
    }
}
