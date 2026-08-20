<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KycDocument;
use App\Models\Partner;
use App\Models\Service;
use App\Models\SubService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PartnerKycController extends Controller
{

    private function publicPartner(Partner $partner, ?string $token = null): array
    {
        return [
            ...$partner->toArray(),
            'auth_token' => $token,
            'token_type' => $token ? 'Bearer' : null,
        ];
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

    private function syncDevice(Partner $partner, array $device): void
    {
        $pushToken = $device['fcm_token'] ?? $device['device_token'] ?? $device['apns_token'] ?? null;
        if (! $pushToken) {
            return;
        }

        $metadata = $partner->metadata ?? [];
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
        $partner->forceFill(['metadata' => $metadata])->save();
    }

    public function requirements()
    {
        $catalogServices = Service::query()
            ->with(['category:id,name', 'subServices' => fn ($query) => $query
                ->where('status', 'Active')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->select(['id', 'service_id', 'name', 'slug', 'status'])])
            ->where('status', 'Active')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'category_id', 'name', 'slug', 'status']);

        $services = $catalogServices->map(fn (Service $service) => [
            'id' => $service->id,
            'name' => $service->name,
            'slug' => $service->slug,
            'category_id' => $service->category_id,
            'category_name' => $service->category?->name,
            'sub_services' => $service->subServices
                ->map(fn (SubService $subService) => [
                    'id' => $subService->id,
                    'name' => $subService->name,
                    'slug' => $subService->slug,
                    'service_id' => $subService->service_id,
                ])
                ->values()
                ->all(),
        ])->values()->all();

        $serviceNames = collect($services)->pluck('name')->filter()->values()->all();

        return response()->json([
            'services' => $services,
            'service_names' => $serviceNames,
            'documents' => (object) [],
            'common_documents' => $this->activeKycDocuments(),
        ]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'alternate_phone' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
            'services' => ['nullable', 'array'],
            'services.*' => ['string', 'max:255'],
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'exists:services,id'],
            'sub_service_ids' => ['nullable', 'array'],
            'sub_service_ids.*' => ['integer', 'exists:sub_services,id'],
            'area' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'pincode' => ['required', 'string', 'max:20'],
            'address_line' => ['required', 'string', 'max:1000'],
            'experience' => ['nullable', 'string', 'max:255'],
            'service_experience_years' => ['nullable', 'integer', 'min:0', 'max:60'],
            'bank_account_holder' => ['required', 'string', 'max:255'],
            'bank_account_number' => ['required', 'string', 'max:50'],
            'bank_account_type' => ['required', 'string', 'max:50'],
            'bank_branch_name' => ['required', 'string', 'max:255'],
            'bank_ifsc' => ['required', 'string', 'max:20'],
            'bank_name' => ['required', 'string', 'max:255'],
            'onboarding_step' => ['nullable', 'string', 'max:50'],
            'documents' => ['nullable', 'array'],
        ]);

        $serviceIds = array_values(array_unique(array_map('intval', $data['service_ids'])));
        $subServiceIds = array_values(array_unique(array_map('intval', $data['sub_service_ids'] ?? [])));

        $selectedServices = Service::query()
            ->with(['subServices' => fn ($query) => $query->where('status', 'Active')->select(['id', 'service_id', 'name'])])
            ->whereIn('id', $serviceIds)
            ->where('status', 'Active')
            ->get(['id', 'name']);

        if ($selectedServices->count() !== count($serviceIds)) {
            throw ValidationException::withMessages([
                'service_ids' => 'One or more selected services are invalid.',
            ]);
        }

        $validSubServiceIds = SubService::query()
            ->whereIn('id', $subServiceIds)
            ->whereIn('service_id', $serviceIds)
            ->where('status', 'Active')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($validSubServiceIds) !== count($subServiceIds)) {
            throw ValidationException::withMessages([
                'sub_service_ids' => 'Sub-services must belong to the selected services.',
            ]);
        }

        foreach ($selectedServices as $service) {
            $availableSubIds = $service->subServices->pluck('id')->map(fn ($id) => (int) $id)->all();
            if ($availableSubIds === []) {
                continue;
            }

            $picked = array_values(array_intersect($availableSubIds, $validSubServiceIds));
            if ($picked === []) {
                throw ValidationException::withMessages([
                    'sub_service_ids' => "Select at least one sub-service for {$service->name}.",
                ]);
            }
        }

        $serviceNames = $selectedServices->pluck('name')->filter()->values()->all();
        if (! empty($data['services'])) {
            $serviceNames = array_values(array_unique([...$serviceNames, ...$data['services']]));
        }

        $requiredDocuments = $this->requiredDocuments();
        $this->validateRequiredUploads($request, $requiredDocuments);
        $documents = $this->collectUploadedDocuments($request, $requiredDocuments);
        $identityPaths = $this->identityDocumentPaths($documents);

        $availabilityErrors = $this->availabilityErrors($data['email'], $data['phone']);
        if ($availabilityErrors !== []) {
            throw ValidationException::withMessages($availabilityErrors);
        }

        $partner = Partner::create([
            'phone' => $data['phone'],
            'name' => $data['name'],
            'address_line' => $data['address_line'],
            'alternate_phone' => $data['alternate_phone'] ?? null,
            'bank_account_holder' => $data['bank_account_holder'],
            'bank_account_number' => $data['bank_account_number'],
            'bank_account_type' => $data['bank_account_type'],
            'bank_branch_name' => $data['bank_branch_name'],
            'bank_ifsc' => strtoupper($data['bank_ifsc']),
            'bank_name' => $data['bank_name'],
            'business_name' => $data['business_name'] ?? null,
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'skill' => implode(', ', $serviceNames),
            'services' => $serviceNames,
            'service_ids' => $serviceIds,
            'sub_service_ids' => $validSubServiceIds,
            'documents' => $documents,
            'aadhaar_document' => $identityPaths['aadhaar_document'],
            'pan_document' => $identityPaths['pan_document'],
            'area' => $data['area'],
            'city' => $data['city'],
            'pincode' => $data['pincode'],
            'kyc_status' => 'Pending',
            'kyc_submitted_at' => now(),
            'kyc_verified_at' => null,
            'kyc_rejected_reason' => null,
            'onboarding_step' => 'submitted',
            'availability' => 'Unavailable',
            'service_experience_years' => $data['service_experience_years'] ?? null,
            'status' => 'Pending',
            'metadata' => [
                'experience' => $data['experience'] ?? null,
                'required_documents' => array_map(fn (array $document) => $document['label'], $requiredDocuments),
                'registration_source' => 'become_service_provider',
                'submitted_from_step' => $data['onboarding_step'] ?? 'documents',
                'service_ids' => $serviceIds,
                'sub_service_ids' => $validSubServiceIds,
                'profile_picture' => $identityPaths['profile_picture'],
            ],
        ]);

        $this->syncDevice($partner, $this->devicePayload($request));

        return response()->json([
            'message' => 'KYC submitted successfully. Vendor login will open after super admin approval.',
            'partner' => $partner->fresh(),
        ], 201);
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

    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $login = trim($data['login']);
        $isEmailLogin = str_contains($login, '@');

        if (! $isEmailLogin && ! preg_match('/^\d{10}$/', $login)) {
            throw ValidationException::withMessages([
                'login' => 'Mobile number must be exactly 10 digits without country code.',
            ]);
        }

        $partner = $isEmailLogin
            ? Partner::query()->whereRaw('LOWER(email) = ?', [strtolower($login)])->first()
            : Partner::query()
                ->where('phone', $login)
                ->orWhere('phone', 'like', '%'.$login)
                ->get()
                ->first(fn (Partner $partner) => $this->normalizePhoneForLogin($partner->phone) === $login);

        if (! $partner || ! $partner->password || ! Hash::check($data['password'], $partner->password)) {
            throw ValidationException::withMessages(['login' => 'Invalid vendor login details.']);
        }

        if ($partner->kyc_status !== 'Approved' || $partner->status !== 'Active') {
            return response()->json([
                'message' => 'Your vendor panel will unlock after super admin KYC approval.',
                'kyc_status' => $partner->kyc_status,
                'can_login' => false,
                'partner' => $this->publicPartner($partner),
            ], 403);
        }

        $token = $partner->createToken('partner_token')->plainTextToken;
        $metadata = $partner->metadata ?? [];
        unset($metadata['session_token']);
        $partner->forceFill(['metadata' => $metadata])->save();
        $this->syncDevice($partner, $this->devicePayload($request));

        $lastDevice = ($partner->metadata ?? [])['last_device'] ?? [];
        \App\Models\LoginLog::create([
            'user_type' => 'Partner',
            'user_id' => $partner->id,
            'user_name' => $partner->name,
            'email' => $partner->email,
            'phone' => $partner->phone,
            'role' => 'Partner / Vendor',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_name' => $request->input('device_name') ?: ($lastDevice['device_name'] ?? ($request->input('platform') ? ucfirst($request->input('platform')) : 'Vendor Device')),
            'device_id' => $request->input('device_id') ?: ($lastDevice['device_id'] ?? null),
            'platform' => $request->input('platform') ?: ($lastDevice['platform'] ?? 'android'),
            'fcm_token' => $request->input('fcm_token') ?: $request->input('device_token') ?: ($lastDevice['fcm_token'] ?? $lastDevice['push_token'] ?? null),
            'apns_token' => $request->input('apns_token') ?: ($lastDevice['apns_token'] ?? null),
            'latitude' => $request->input('latitude') ?: $request->input('lat'),
            'longitude' => $request->input('longitude') ?: $request->input('lng'),
            'location_name' => $partner->city ?: $partner->area,
            'status' => 'Success',
            'is_blocked' => false,
        ]);

        return response()->json([
            'message' => 'Vendor login successful.',
            'can_login' => true,
            'partner' => $this->publicPartner($partner->fresh(), $token),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'message' => 'Vendor session active.',
            'can_login' => true,
            'partner' => $this->publicPartner($request->user(), null),
        ]);
    }

    public function session(Request $request)
    {
        // Legacy fallback
        $partner = $request->user('partner');
        if (!$partner) {
            return response()->json(['message' => 'Invalid vendor session.'], 422);
        }
        return response()->json([
            'message' => 'Vendor session active.',
            'can_login' => true,
            'partner' => $this->publicPartner($partner, null),
        ]);
    }

    public function logout(Request $request)
    {
        $partner = $request->user();
        if ($partner) {
            $partner->currentAccessToken()->delete();
        }

        return response()->json(['message' => 'Vendor logged out.']);
    }

    private function normalizePhoneForLogin(?string $phone): string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);

        return strlen($digits) > 10 ? substr($digits, -10) : (string) $digits;
    }

    private function availabilityErrors(?string $email, ?string $phone): array
    {
        $errors = [];

        if ($phone !== null && trim($phone) !== '') {
            if ($this->findPartnerByPhone($phone)) {
                $errors['phone'] = ['This mobile number already exists.'];
            }
        }

        if ($email !== null && trim($email) !== '') {
            if ($this->findPartnerByEmail($email)) {
                $errors['email'] = ['This email already exists.'];
            }
        }

        return $errors;
    }

    private function findPartnerByPhone(string $phone): ?Partner
    {
        $normalized = $this->normalizePhoneForLogin($phone);
        if ($normalized === '') {
            return null;
        }

        return Partner::query()
            ->where(function ($query) use ($normalized) {
                $query->where('phone', $normalized)
                    ->orWhere('phone', 'like', '%'.$normalized);
            })
            ->get()
            ->first(fn (Partner $partner) => $this->normalizePhoneForLogin($partner->phone) === $normalized);
    }

    private function findPartnerByEmail(string $email): ?Partner
    {
        return Partner::query()
            ->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])
            ->first();
    }

    public function approve(Partner $partner)
    {
        $partner->update([
            'kyc_status' => 'Approved',
            'kyc_verified_at' => now(),
            'kyc_rejected_reason' => null,
            'availability' => $partner->availability === 'Unavailable' ? 'Available' : $partner->availability,
            'status' => 'Active',
        ]);

        return response()->json(['message' => 'Partner KYC approved. Vendor panel login is now enabled.', 'partner' => $partner->fresh()]);
    }

    public function reject(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $partner->update([
            'kyc_status' => 'Rejected',
            'kyc_verified_at' => null,
            'kyc_rejected_reason' => $data['reason'] ?? 'Documents need correction.',
            'availability' => 'Unavailable',
            'status' => 'Pending',
        ]);

        return response()->json(['message' => 'Partner KYC rejected. Vendor login remains locked.', 'partner' => $partner->fresh()]);
    }

    private function activeKycDocuments(): array
    {
        return KycDocument::query()
            ->where('status', 'Active')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name', 'is_required'])
            ->map(fn (KycDocument $document) => [
                'id' => $document->id,
                'label' => $document->name,
                'required' => (bool) $document->is_required,
            ])
            ->values()
            ->all();
    }

    private function requiredDocuments(): array
    {
        return $this->activeKycDocuments();
    }

    private function identityDocumentPaths(array $documents): array
    {
        $aadhaar = null;
        $pan = null;
        $profilePicture = null;

        foreach ($documents as $document) {
            $label = strtolower(trim((string) ($document['label'] ?? '')));
            $path = $document['path'] ?? null;
            if (! $path) {
                continue;
            }

            if (in_array($label, ['aadhaar', 'aadhar'], true)) {
                $aadhaar = $path;
            }
            if ($label === 'pan') {
                $pan = $path;
            }
            if ($label === 'profile photo' || str_contains($label, 'profile photo') || $label === 'profile') {
                $profilePicture = $path;
            }
        }

        return [
            'aadhaar_document' => $aadhaar,
            'pan_document' => $pan,
            'profile_picture' => $profilePicture,
        ];
    }

    private function storePublicUpload($file, string $folder = 'documents/vendor-kyc'): string
    {
        $destination = public_path($folder);

        if (! is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $filename = $file->hashName();
        $file->move($destination, $filename);

        return $folder.'/'.$filename;
    }

    private function collectUploadedDocuments(Request $request, array $requiredDocuments): array
    {
        $uploaded = [];

        foreach ($requiredDocuments as $index => $document) {
            $label = $document['label'];
            $required = (bool) ($document['required'] ?? true);
            $documentId = $document['id'] ?? null;
            $field = 'document_'.$index;

            if ($request->hasFile($field)) {
                $path = $this->storePublicUpload($request->file($field));
                $uploaded[] = [
                    'document_id' => $documentId,
                    'label' => $label,
                    'path' => $path,
                    'required' => $required,
                    'status' => 'Submitted',
                    'uploaded_at' => now()->toISOString(),
                ];
                continue;
            }

            $uploaded[] = [
                'document_id' => $documentId,
                'label' => $label,
                'path' => null,
                'required' => $required,
                'status' => 'Pending upload',
            ];
        }

        return $uploaded;
    }

    private function validateRequiredUploads(Request $request, array $requiredDocuments): void
    {
        $rules = [];

        foreach ($requiredDocuments as $index => $document) {
            if (! ($document['required'] ?? true)) {
                continue;
            }
            $rules['document_'.$index] = ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'];
        }

        if ($rules === []) {
            return;
        }

        try {
            $request->validate($rules);
        } catch (ValidationException $exception) {
            $messages = [];
            foreach ($requiredDocuments as $index => $document) {
                if ($exception->errors()['document_'.$index] ?? null) {
                    $messages['document_'.$index] = ["Please upload {$document['label']}."];
                }
            }

            throw ValidationException::withMessages($messages ?: $exception->errors());
        }
    }
}
