<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminNotification extends Model
{
    protected $fillable = ['channel', 'audience', 'title', 'message', 'image', 'status', 'sent_at', 'read_at', 'metadata'];

    protected $casts = ['sent_at' => 'datetime', 'read_at' => 'datetime', 'metadata' => 'array'];

    protected $appends = ['city', 'customer_ids', 'partner_ids', 'targeted_count', 'sent_count', 'failed_count'];

    public function getCityAttribute(): ?string
    {
        return data_get($this->metadata, 'city');
    }

    public function getCustomerIdsAttribute(): array
    {
        return array_values(array_filter(array_map('intval', data_get($this->metadata, 'customer_ids', []) ?: [])));
    }

    public function getPartnerIdsAttribute(): array
    {
        return array_values(array_filter(array_map('intval', data_get($this->metadata, 'partner_ids', []) ?: [])));
    }

    public function getTargetedCountAttribute(): int
    {
        return (int) data_get($this->metadata, 'delivery_report.targeted', 0);
    }

    public function getSentCountAttribute(): int
    {
        return (int) data_get($this->metadata, 'delivery_report.sent', 0);
    }

    public function getFailedCountAttribute(): int
    {
        return (int) data_get($this->metadata, 'delivery_report.failed', 0);
    }
}
