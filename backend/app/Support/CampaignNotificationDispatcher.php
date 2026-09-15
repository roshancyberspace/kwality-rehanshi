<?php

namespace App\Support;

use App\Models\AdminNotification;
use App\Models\CustomerProfile;
use App\Models\NotificationDelivery;
use App\Models\Partner;
use App\Models\SavedAddress;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CampaignNotificationDispatcher
{
    public function __construct(
        private CustomerPasswordMailer $mailer,
        private FcmV1Client $fcmClient
    ) {
    }

    public function send(AdminNotification $notification, bool $retryFailedOnly = false): array
    {
        $channel = strtolower(trim((string) $notification->channel));
        if ($retryFailedOnly) {
            $pending = NotificationDelivery::query()
                ->where('admin_notification_id', $notification->id)
                ->whereIn('status', ['failed', 'skipped', 'pending'])
                ->get();
        } else {
            NotificationDelivery::query()->where('admin_notification_id', $notification->id)->delete();
            $pending = $this->createDeliveries($notification, $channel);
        }

        foreach ($pending as $delivery) {
            $this->deliverOne($notification, $delivery);
        }

        return $this->refreshReport($notification);
    }

    public function report(AdminNotification $notification): array
    {
        $rows = NotificationDelivery::query()
            ->where('admin_notification_id', $notification->id)
            ->orderByDesc('id')
            ->get();

        $counts = [
            'targeted' => $rows->count(),
            'sent' => $rows->where('status', 'sent')->count(),
            'failed' => $rows->where('status', 'failed')->count(),
            'skipped' => $rows->where('status', 'skipped')->count(),
            'pending' => $rows->where('status', 'pending')->count(),
        ];

        return [
            'notification' => $notification,
            'counts' => $counts,
            'remaining' => $counts['failed'] + $counts['skipped'] + $counts['pending'],
            'deliveries' => $rows,
        ];
    }

    private function createDeliveries(AdminNotification $notification, string $channel): \Illuminate\Support\Collection
    {
        $recipients = $this->resolveRecipients($notification);
        $created = collect();

        foreach ($recipients as $recipient) {
            $contact = $this->contactFor($recipient, $channel);
            $created->push(NotificationDelivery::create([
                'admin_notification_id' => $notification->id,
                'recipient_type' => $recipient['type'],
                'recipient_id' => $recipient['id'],
                'recipient_name' => $recipient['name'],
                'channel' => $notification->channel,
                'contact' => $contact,
                'status' => $contact ? 'pending' : 'skipped',
                'error' => $contact ? null : 'No '.$channel.' contact on file',
            ]));
        }

        return $created;
    }

    private function resolveRecipients(AdminNotification $notification): array
    {
        $audience = strtolower(trim((string) $notification->audience));
        $city = trim((string) data_get($notification->metadata, 'city', ''));
        $customerIds = array_values(array_filter(array_map('intval', data_get($notification->metadata, 'customer_ids', []) ?: [])));
        $partnerIds = array_values(array_filter(array_map('intval', data_get($notification->metadata, 'partner_ids', []) ?: [])));

        if (str_contains($audience, 'specific partner')) {
            $query = Partner::query()->where('status', 'Active')->whereIn('id', $partnerIds ?: [0]);

            return $this->mapPartners($query->get(['id', 'name', 'email', 'phone', 'metadata']));
        }

        if ($audience === 'partners' || str_contains($audience, 'all partner')) {
            return $this->mapPartners(
                Partner::query()->where('status', 'Active')->get(['id', 'name', 'email', 'phone', 'metadata'])
            );
        }

        if (str_contains($audience, 'specific customer')) {
            $query = CustomerProfile::query()
                ->where('status', '!=', 'Blocked')
                ->whereIn('id', $customerIds ?: [0]);

            return $this->mapCustomers($query->get(['id', 'name', 'email', 'phone', 'metadata']));
        }

        $query = CustomerProfile::query()->where('status', '!=', 'Blocked');
        if (str_contains($audience, 'city') && $city !== '') {
            $ids = SavedAddress::query()
                ->whereRaw('LOWER(city) = ?', [strtolower($city)])
                ->pluck('customer_profile_id');
            $query->where(function ($inner) use ($ids, $city) {
                $inner->whereIn('id', $ids)
                    ->orWhere('address', 'like', '%'.$city.'%');
            });
        }

        return $this->mapCustomers($query->get(['id', 'name', 'email', 'phone', 'metadata']));
    }

    private function mapPartners($partners): array
    {
        return $partners->map(fn (Partner $partner) => [
            'type' => 'partner',
            'id' => $partner->id,
            'name' => $partner->name,
            'email' => $partner->email,
            'phone' => $partner->phone,
            'devices' => $partner->metadata['devices'] ?? [],
            'last_device' => $partner->metadata['last_device'] ?? null,
            'push_token' => $partner->metadata['push_token'] ?? $partner->metadata['fcm_token'] ?? null,
        ])->all();
    }

    private function mapCustomers($customers): array
    {
        return $customers->map(fn (CustomerProfile $customer) => [
            'type' => 'customer',
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'devices' => $customer->metadata['devices'] ?? [],
            'last_device' => $customer->metadata['last_device'] ?? null,
            'push_token' => $customer->metadata['push_token'] ?? $customer->metadata['fcm_token'] ?? null,
        ])->all();
    }

    private function contactFor(array $recipient, string $channel): ?string
    {
        if ($channel === 'email') {
            $email = trim((string) ($recipient['email'] ?? ''));

            return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
        }

        if ($channel === 'sms') {
            $phone = preg_replace('/\D+/', '', (string) ($recipient['phone'] ?? '')) ?: '';

            return strlen($phone) >= 10 ? $phone : null;
        }

        $devices = $recipient['devices'] ?? [];
        if (empty($devices) && !empty($recipient['last_device'])) {
            $devices = [$recipient['last_device']];
        }

        $token = collect($devices)
            ->map(fn ($device) => is_array($device)
                ? ($device['fcm_token'] ?? $device['push_token'] ?? $device['device_token'] ?? $device['apns_token'] ?? null)
                : (is_string($device) ? $device : null)
            )
            ->filter()
            ->first();

        if (!$token && !empty($recipient['push_token'])) {
            $token = (string) $recipient['push_token'];
        }
        if (!$token && !empty($recipient['fcm_token'])) {
            $token = (string) $recipient['fcm_token'];
        }

        return $token ? (string) $token : null;
    }

    private function deliverOne(AdminNotification $notification, NotificationDelivery $delivery): void
    {
        $channel = strtolower(trim((string) $notification->channel));
        $contact = trim((string) ($delivery->contact ?? ''));

        if ($contact === '') {
            $delivery->update([
                'status' => 'skipped',
                'error' => $delivery->error ?: 'No contact on file',
            ]);

            return;
        }

        try {
            if ($channel === 'email') {
                $this->mailer->sendCampaign(
                    $contact,
                    $delivery->recipient_name ?: 'Customer',
                    $notification->title,
                    $notification->message,
                    $this->publicImageUrl($notification)
                );
            } elseif ($channel === 'sms') {
                $this->sendSms($contact, $notification->title, $notification->message);
            } else {
                $this->sendPush($contact, $notification);
            }

            $delivery->update([
                'status' => 'sent',
                'error' => null,
                'sent_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Campaign delivery failed', [
                'notification_id' => $notification->id,
                'delivery_id' => $delivery->id,
                'error' => $exception->getMessage(),
            ]);
            $delivery->update([
                'status' => 'failed',
                'error' => mb_substr($exception->getMessage(), 0, 500),
            ]);
        }
    }

    private function sendSms(string $phone, string $title, string $message): void
    {
        $text = trim($title.': '.$message);
        $url = (string) config('services.sms.url');
        $key = (string) config('services.sms.key');

        if ($url === '') {
            if (config('app.debug')) {
                Log::info('Campaign SMS (debug, no SMS_API_URL)', ['phone' => $phone, 'text' => $text]);

                return;
            }

            throw new \RuntimeException('SMS gateway is not configured (SMS_API_URL).');
        }

        $response = Http::timeout(20)->asForm()->post($url, array_filter([
            'apikey' => $key ?: null,
            'key' => $key ?: null,
            'sender' => config('services.sms.sender'),
            'numbers' => $phone,
            'mobile' => $phone,
            'message' => $text,
        ]));

        if (! $response->successful()) {
            throw new \RuntimeException('SMS provider returned HTTP '.$response->status());
        }
    }

    private function sendPush(string $token, AdminNotification $notification): void
    {
        if (! $this->fcmClient->isConfigured()) {
            throw new \RuntimeException('Firebase push gateway is not configured. Please ensure Firebase Service Account JSON is uploaded or FCM_SERVER_KEY is set.');
        }

        $imageUrl = $this->publicImageUrl($notification);
        $metadata = is_array($notification->metadata) ? $notification->metadata : [];

        $data = [
            'notification_id' => (string) $notification->id,
            'audience' => (string) $notification->audience,
            'channel' => (string) $notification->channel,
            'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            'screen' => (string) ($metadata['screen'] ?? 'Home'),
            'action_type' => (string) ($metadata['action_type'] ?? 'general'),
            'priority' => 'high',
            'timestamp' => (string) now()->timestamp,
        ];

        foreach (['booking_id', 'booking_no', 'package_id', 'service_id', 'coupon_id', 'coupon_code', 'discount_value', 'tab', 'url', 'target_id'] as $key) {
            if (! empty($metadata[$key])) {
                $data[$key] = (string) $metadata[$key];
            }
        }

        if (! empty($metadata['deep_link_data']) && is_array($metadata['deep_link_data'])) {
            foreach ($metadata['deep_link_data'] as $k => $v) {
                if ($v !== null && $v !== '') {
                    $data[(string) $k] = is_scalar($v) ? (string) $v : json_encode($v);
                }
            }
        }

        $this->fcmClient->send(
            $token,
            $notification->title,
            $notification->message,
            $imageUrl,
            $data
        );
    }

    private function refreshReport(AdminNotification $notification): array
    {
        $report = $this->report($notification->fresh());
        $metadata = $notification->metadata ?? [];
        $metadata['delivery_report'] = $report['counts'];
        $notification->update([
            'status' => ($report['counts']['sent'] > 0 || $report['counts']['targeted'] === 0) ? 'Sent' : 'Failed',
            'sent_at' => now(),
            'metadata' => $metadata,
        ]);

        return $this->report($notification->fresh());
    }

    private function publicImageUrl(AdminNotification $notification): ?string
    {
        $path = trim((string) ($notification->image ?? ''));
        if ($path === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        return rtrim((string) config('app.url'), '/').'/'.ltrim($path, '/');
    }
}
