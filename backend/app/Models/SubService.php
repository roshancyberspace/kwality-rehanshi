<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubService extends Model
{
    protected $fillable = [
        'service_id',
        'name',
        'slug',
        'icon',
        'description',
        'sort_order',
        'status',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    protected $appends = [
        'service_name',
    ];

    protected $hidden = [
        'service',
    ];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function getServiceNameAttribute(): ?string
    {
        return $this->relationLoaded('service') ? $this->service?->name : null;
    }
}
