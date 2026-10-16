<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServicePackage extends Model
{
    protected $fillable = ['service_id', 'sub_service_id', 'category_key', 'name', 'banner_media', 'image', 'price', 'original_price', 'duration', 'rating', 'jobs', 'badge', 'offer', 'option_count', 'description', 'highlights', 'included', 'not_included', 'process', 'warranty', 'sort_order', 'is_new_arrival', 'status', 'metadata'];

    protected $casts = ['is_new_arrival' => 'boolean', 'highlights' => 'array', 'included' => 'array', 'not_included' => 'array', 'process' => 'array', 'metadata' => 'array'];

    protected $appends = ['service_name', 'sub_service_name', 'category_id'];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function subService()
    {
        return $this->belongsTo(SubService::class);
    }

    public function getServiceNameAttribute(): ?string
    {
        return $this->relationLoaded('service') ? $this->service?->name : null;
    }

    public function getSubServiceNameAttribute(): ?string
    {
        return $this->relationLoaded('subService') ? $this->subService?->name : null;
    }

    public function getCategoryIdAttribute(): ?int
    {
        if ($this->relationLoaded('service') && $this->service) {
            $categoryId = $this->service->category_id;
            return $categoryId !== null ? (int) $categoryId : null;
        }

        return null;
    }

    public function detailSections()
    {
        return $this->hasMany(ServicePackageSection::class)->orderBy('sort_order')->orderBy('id');
    }
}
