<?php

namespace App\Http\Controllers\Api;

use App\Models\AdminNotification;
use App\Support\CampaignNotificationDispatcher;
use Illuminate\Http\Request;

class AdminNotificationController extends CrudController
{
    protected string $model = AdminNotification::class;

    protected string $searchColumn = 'title';

    protected array $rules = [
        'channel' => ['required', 'string', 'max:50'],
        'audience' => ['required', 'string', 'max:100'],
        'title' => ['required', 'string', 'max:255'],
        'message' => ['required', 'string'],
        'image' => ['nullable', 'string'],
        'status' => ['nullable', 'string', 'max:50'],
        'sent_at' => ['nullable', 'date'],
        'read_at' => ['nullable', 'date'],
        'city' => ['nullable', 'string', 'max:120'],
        'customer_ids' => ['nullable', 'array'],
        'customer_ids.*' => ['integer'],
        'partner_ids' => ['nullable', 'array'],
        'partner_ids.*' => ['integer'],
        'screen' => ['nullable', 'string', 'max:100'],
        'action_type' => ['nullable', 'string', 'max:100'],
        'booking_id' => ['nullable'],
        'package_id' => ['nullable'],
        'coupon_code' => ['nullable', 'string', 'max:100'],
        'tab' => ['nullable', 'string', 'max:100'],
        'url' => ['nullable', 'string', 'max:500'],
        'deep_link_data' => ['nullable'],
        'metadata' => ['nullable', 'array'],
    ];

    public function __construct(private CampaignNotificationDispatcher $dispatcher)
    {
    }

    protected function validatedData(Request $request): array
    {
        $data = parent::validatedData($request);
        $city = trim((string) ($data['city'] ?? $request->input('city') ?? ''));
        $customerIds = $this->idList($data['customer_ids'] ?? $request->input('customer_ids'));
        $partnerIds = $this->idList($data['partner_ids'] ?? $request->input('partner_ids'));
        unset($data['city'], $data['customer_ids'], $data['partner_ids']);

        $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];
        if ($city !== '') {
            $metadata['city'] = $city;
        }
        $metadata['customer_ids'] = $customerIds;
        $metadata['partner_ids'] = $partnerIds;

        $navKeys = ['screen', 'action_type', 'booking_id', 'package_id', 'coupon_code', 'tab', 'url'];
        foreach ($navKeys as $k) {
            $val = trim((string) ($data[$k] ?? $request->input($k) ?? ''));
            if ($val !== '') {
                $metadata[$k] = $val;
            }
            unset($data[$k]);
        }

        $deepLinkData = $request->input('deep_link_data');
        if (is_string($deepLinkData) && trim($deepLinkData) !== '') {
            $decoded = json_decode($deepLinkData, true);
            if (is_array($decoded)) {
                $metadata['deep_link_data'] = $decoded;
            }
        } elseif (is_array($deepLinkData) && ! empty($deepLinkData)) {
            $metadata['deep_link_data'] = $deepLinkData;
        }

        $metadata['screen'] = $metadata['screen'] ?? 'Home';
        $metadata['action_type'] = $metadata['action_type'] ?? 'general';
        $metadata['click_action'] = 'FLUTTER_NOTIFICATION_CLICK';

        $data['metadata'] = $metadata;

        if (empty($data['status'])) {
            $data['status'] = 'Sent';
        }

        return $data;
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $item = AdminNotification::create($data);
        $this->clearModelCache();

        if (strtolower((string) $item->status) !== 'draft') {
            $this->dispatcher->send($item);
            $item = $item->fresh();
        }

        return response()->json($this->present($item), 201);
    }

    public function update(Request $request, int|string $id)
    {
        $item = AdminNotification::findOrFail($id);
        $wasDraft = strtolower((string) $item->status) === 'draft';
        $data = $this->validatedData($request);
        $item->update($data);
        $this->clearModelCache();

        $item = $item->fresh();
        if ($wasDraft && strtolower((string) $item->status) !== 'draft') {
            $this->dispatcher->send($item);
            $item = $item->fresh();
        }

        return response()->json($this->present($item));
    }

    public function show(int|string $id)
    {
        return response()->json($this->present(AdminNotification::findOrFail($id)));
    }

    public function report(AdminNotification $notification)
    {
        return response()->json($this->dispatcher->report($notification));
    }

    public function resend(AdminNotification $notification)
    {
        $report = $this->dispatcher->send($notification, true);
        $this->clearModelCache();

        return response()->json($report);
    }

    public function summary(Request $request)
    {
        $notifications = AdminNotification::query()
            ->latest('id')
            ->limit((int) $request->integer('limit', 8))
            ->get();

        return response()->json([
            'unread_count' => AdminNotification::whereNull('read_at')->count(),
            'notifications' => $notifications,
        ]);
    }

    public function markAllRead()
    {
        AdminNotification::whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([
            'unread_count' => 0,
            'message' => 'Notifications marked as read',
        ]);
    }

    private function present(AdminNotification $item): array
    {
        $report = data_get($item->metadata, 'delivery_report', []);
        $metadata = is_array($item->metadata) ? $item->metadata : [];

        return [
            ...$item->toArray(),
            'city' => $metadata['city'] ?? null,
            'screen' => $metadata['screen'] ?? 'Home',
            'action_type' => $metadata['action_type'] ?? 'general',
            'booking_id' => $metadata['booking_id'] ?? null,
            'package_id' => $metadata['package_id'] ?? null,
            'coupon_code' => $metadata['coupon_code'] ?? null,
            'tab' => $metadata['tab'] ?? null,
            'url' => $metadata['url'] ?? null,
            'deep_link_data' => ! empty($metadata['deep_link_data']) ? json_encode($metadata['deep_link_data'], JSON_PRETTY_PRINT) : null,
            'targeted_count' => (int) ($report['targeted'] ?? 0),
            'sent_count' => (int) ($report['sent'] ?? 0),
            'failed_count' => (int) ($report['failed'] ?? 0),
        ];
    }

    protected function imageFields(): array
    {
        return ['image'];
    }

    private function idList(mixed $value): array
    {
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : preg_split('/[\s,]+/', $value);
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map('intval', $value))));
    }
}
