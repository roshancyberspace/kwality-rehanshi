<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\CustomerProfile;
use App\Models\Partner;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MobileNotificationController extends Controller
{
    public function registerCustomerDevice(Request $request)
    {
        [$customer, $data] = $this->validatedCustomerDeviceRequest($request);
        $this->upsertDevice($customer, $data);

        return response()->json([
            'message' => 'Customer device token saved.',
            'customer' => $customer->fresh(),
        ]);
    }

    public function unregisterCustomerDevice(Request $request)
    {
        [$customer, $data] = $this->validatedCustomerDeviceRequest($request, false);
        $this->removeDevice($customer, $data);

        return response()->json(['message' => 'Customer device token removed.']);
    }

    public function registerVendorDevice(Request $request)
    {
        [$partner, $data] = $this->validatedPartnerDeviceRequest($request);
        $this->upsertDevice($partner, $data);

        return response()->json([
            'message' => 'Vendor device token saved.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function unregisterVendorDevice(Request $request)
    {
        [$partner, $data] = $this->validatedPartnerDeviceRequest($request, false);
        $this->removeDevice($partner, $data);

        return response()->json(['message' => 'Vendor device token removed.']);
    }

    public function customerNotifications(Request $request)
    {
        $customer = $this->authorizedCustomer($request);

        return response()->json([
            'unread_count' => $this->notificationQuery('Customers', 'customer_id', $customer->id)->whereNull('read_at')->count(),
            'notifications' => $this->notificationQuery('Customers', 'customer_id', $customer->id)
                ->paginate((int) $request->integer('per_page', 25)),
        ]);
    }

    public function vendorNotifications(Request $request)
    {
        $partner = $this->authorizedPartner($request);

        return response()->json([
            'unread_count' => $this->notificationQuery('Partners', 'partner_id', $partner->id)->whereNull('read_at')->count(),
            'notifications' => $this->notificationQuery('Partners', 'partner_id', $partner->id)
                ->paginate((int) $request->integer('per_page', 25)),
        ]);
    }

    public function markCustomerNotificationRead(Request $request, AdminNotification $notification)
    {
        $customer = $this->authorizedCustomer($request);
        $this->ensureNotificationBelongsTo($notification, 'Customers', 'customer_id', $customer->id);
        $notification->update(['read_at' => now()]);

        return response()->json(['message' => 'Notification marked as read.', 'notification' => $notification->fresh()]);
    }

    public function markVendorNotificationRead(Request $request, AdminNotification $notification)
    {
        $partner = $this->authorizedPartner($request);
        $this->ensureNotificationBelongsTo($notification, 'Partners', 'partner_id', $partner->id);
        $notification->update(['read_at' => now()]);

        return response()->json(['message' => 'Notification marked as read.', 'notification' => $notification->fresh()]);
    }

    private function validatedCustomerDeviceRequest(Request $request, bool $requirePushToken = true): array
    {
        $data = $this->deviceRules($request, [
            'customer_id' => ['required', 'integer'],
            'token' => ['required', 'string', 'size:64'],
        ], $requirePushToken);

        $customer = $this->authorizedCustomer($request, $data);

        return [$customer, $data];
    }

    private function validatedPartnerDeviceRequest(Request $request, bool $requirePushToken = true): array
    {
        $data = $this->deviceRules($request, [
            'partner_id' => ['required', 'integer'],
            'token' => ['required', 'string', 'size:64'],
        ], $requirePushToken);

        $partner = $this->authorizedPartner($request, $data);

        return [$partner, $data];
    }

    private function deviceRules(Request $request, array $identityRules, bool $requirePushToken): array
    {
        return $request->validate([
            ...$identityRules,
            'apns_token' => ['nullable', 'string', 'max:1000'],
            'device_id' => ['nullable', 'string', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:255'],
            'device_token' => [$requirePushToken ? 'required_without_all:fcm_token,apns_token' : 'nullable', 'string', 'max:1000'],
            'fcm_token' => ['nullable', 'string', 'max:1000'],
            'platform' => ['required', 'string', Rule::in(['android', 'ios', 'web'])],
        ]);
    }

    private function authorizedCustomer(Request $request, ?array $data = null): CustomerProfile
    {
        $data ??= $request->validate([
            'customer_id' => ['required', 'integer'],
            'token' => ['required', 'string', 'size:64'],
        ]);

        $customer = CustomerProfile::query()
            ->whereKey($data['customer_id'])
            ->where('status', '!=', 'Blocked')
            ->firstOrFail();

        abort_unless($this->validSession($customer, $data['token']), 401, 'Invalid customer session.');

        return $customer;
    }

    private function authorizedPartner(Request $request, ?array $data = null): Partner
    {
        $data ??= $request->validate([
            'partner_id' => ['required', 'integer'],
            'token' => ['required', 'string', 'size:64'],
        ]);

        $partner = Partner::query()
            ->whereKey($data['partner_id'])
            ->where('kyc_status', 'Approved')
            ->where('status', 'Active')
            ->firstOrFail();

        abort_unless($this->validSession($partner, $data['token']), 401, 'Invalid vendor session.');

        return $partner;
    }

    private function validSession(Model $model, string $token): bool
    {
        return hash_equals((string) (($model->metadata ?? [])['session_token'] ?? ''), hash('sha256', $token));
    }

    private function upsertDevice(Model $model, array $data): void
    {
        $pushToken = $data['fcm_token'] ?? $data['device_token'] ?? $data['apns_token'];
        $metadata = $model->metadata ?? [];
        $devices = collect($metadata['devices'] ?? [])
            ->reject(fn ($item) => ($item['push_token'] ?? null) === $pushToken)
            ->values()
            ->all();

        array_unshift($devices, [
            'apns_token' => $data['apns_token'] ?? null,
            'device_id' => $data['device_id'] ?? null,
            'device_name' => $data['device_name'] ?? null,
            'fcm_token' => $data['fcm_token'] ?? $data['device_token'] ?? null,
            'platform' => $data['platform'],
            'push_token' => $pushToken,
            'updated_at' => now()->toISOString(),
        ]);

        $metadata['devices'] = array_slice($devices, 0, 10);
        $metadata['last_device'] = $metadata['devices'][0];
        $model->forceFill(['metadata' => $metadata])->save();
    }

    private function removeDevice(Model $model, array $data): void
    {
        $pushToken = $data['fcm_token'] ?? $data['device_token'] ?? $data['apns_token'] ?? null;
        $deviceId = $data['device_id'] ?? null;
        $metadata = $model->metadata ?? [];

        $metadata['devices'] = collect($metadata['devices'] ?? [])
            ->reject(fn ($item) => ($pushToken && ($item['push_token'] ?? null) === $pushToken) || ($deviceId && ($item['device_id'] ?? null) === $deviceId))
            ->values()
            ->all();
        $metadata['last_device'] = $metadata['devices'][0] ?? null;

        $model->forceFill(['metadata' => $metadata])->save();
    }

    private function notificationQuery(string $audience, string $metadataKey, int $id)
    {
        return AdminNotification::query()
            ->where(function ($query) use ($audience, $metadataKey, $id) {
                $query->where('audience', $audience)
                    ->orWhere('audience', 'All')
                    ->orWhere("metadata->{$metadataKey}", $id);
            })
            ->latest('id');
    }

    private function ensureNotificationBelongsTo(AdminNotification $notification, string $audience, string $metadataKey, int $id): void
    {
        $belongs = $notification->audience === 'All'
            || $notification->audience === $audience
            || (int) (($notification->metadata ?? [])[$metadataKey] ?? 0) === $id;

        abort_unless($belongs, 404, 'Notification not found.');
    }
}
