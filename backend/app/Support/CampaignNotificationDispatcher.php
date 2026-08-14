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
    public function __construct(private CustomerPasswordMailer $mailer)
    {
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

        $token = collect($recipient['devices'] ?? [])
            ->map(fn ($device) => $device['push_token'] ?? $device['fcm_token'] ?? null)
            ->filter()
            ->first();

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
        $serverKey = (string) config('services.fcm.server_key');
        if ($serverKey === '') {
            if (config('app.debug')) {
                Log::info('Campaign push stored in-app (no FCM_SERVER_KEY)', [
                    'notification_id' => $notification->id,
                ]);

                return;
            }

            throw new \RuntimeException('Push gateway is not configured (FCM_SERVER_KEY).');
        }

        $imageUrl = $this->publicImageUrl($notification);
        $payload = [
            'to' => $token,
            'notification' => array_filter([
                'title' => $notification->title,
                'body' => $notification->message,
                'image' => $imageUrl,
            ]),
            'data' => array_filter([
                'notification_id' => (string) $notification->id,
                'audience' => $notification->audience,
                'image' => $imageUrl,
            ]),
        ];

        $response = Http::timeout(20)
            ->withToken($serverKey)
            ->withHeaders(['Authorization' => 'key='.$serverKey])
            ->post('https://fcm.googleapis.com/fcm/send', $payload);

        if (! $response->successful()) {
            throw new \RuntimeException('FCM returned HTTP '.$response->status());
        }
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
