<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServicePackageSection extends Model
{
    protected $fillable = [
        'service_package_id',
        'service_id',
        'section_key',
        'section_type',
        'title',
        'subtitle',
        'body',
        'image',
        'items',
        'metadata',
        'sort_order',
        'status',
        'is_visible',
    ];

    protected $casts = [
        'items' => 'array',
        'metadata' => 'array',
        'is_visible' => 'boolean',
    ];

    protected $appends = ['package_name', 'service_name_label', 'sub_service_name'];

    public function servicePackage()
    {
        return $this->belongsTo(ServicePackage::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function getPackageNameAttribute(): ?string
    {
        return $this->relationLoaded('servicePackage') ? $this->servicePackage?->name : null;
    }

    public function getServiceNameLabelAttribute(): ?string
    {
        if ($this->relationLoaded('service') && $this->service) {
            return $this->service->name;
        }

        if ($this->relationLoaded('servicePackage') && $this->servicePackage?->relationLoaded('service')) {
            return $this->servicePackage->service?->name;
        }

        return null;
    }

    public function getSubServiceNameAttribute(): ?string
    {
        if ($this->relationLoaded('servicePackage') && $this->servicePackage?->relationLoaded('subService')) {
            return $this->servicePackage->subService?->name;
        }

        return null;
    }
}
