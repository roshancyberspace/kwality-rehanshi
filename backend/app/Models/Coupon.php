<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'type',
        'value',
        'minimum_order',
        'expires_at',
        'usage_limit',
        'applies_to',
        'category_ids',
        'service_ids',
        'service_package_ids',
        'status',
        'metadata',
    ];

    protected $casts = [
        'expires_at' => 'date',
        'metadata' => 'array',
        'category_ids' => 'array',
        'service_ids' => 'array',
        'service_package_ids' => 'array',
    ];

    protected $appends = ['scope_summary'];

    public function scopeAvailable(Builder $query): Builder
    {
        return $query
            ->where('status', 'Active')
            ->where(function (Builder $innerQuery) {
                $innerQuery
                    ->whereNull('expires_at')
                    ->orWhereDate('expires_at', '>=', now()->toDateString());
            });
    }

    public function getScopeSummaryAttribute(): string
    {
        $appliesTo = strtolower((string) ($this->applies_to ?: 'all'));

        if ($appliesTo === 'all') {
            return 'All services';
        }

        $ids = match ($appliesTo) {
            'category' => array_values(array_filter($this->category_ids ?? [])),
            'service' => array_values(array_filter($this->service_ids ?? [])),
            'package' => array_values(array_filter($this->service_package_ids ?? [])),
            default => [],
        };

        if ($ids === []) {
            return 'No targets selected';
        }

        $names = match ($appliesTo) {
            'category' => Category::query()->whereIn('id', $ids)->orderBy('name')->pluck('name')->all(),
            'service' => Service::query()->whereIn('id', $ids)->orderBy('name')->pluck('name')->all(),
            'package' => ServicePackage::query()->whereIn('id', $ids)->orderBy('name')->pluck('name')->all(),
            default => [],
        };

        if ($names === []) {
            return count($ids).' selected';
        }

        if (count($names) <= 2) {
            return implode(', ', $names);
        }

        return $names[0].', '.$names[1].' +'.(count($names) - 2).' more';
    }

    public function normalizedIdList(string $field): array
    {
        return array_values(array_unique(array_map(
            'intval',
            array_filter($this->{$field} ?? [], fn ($id) => $id !== null && $id !== '')
        )));
    }
}
