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

        return [
            ...$item->toArray(),
            'city' => data_get($item->metadata, 'city'),
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
