<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    protected $table = 'login_logs';

    protected $fillable = [
        'user_type',
        'user_id',
        'user_name',
        'email',
        'phone',
        'role',
        'ip_address',
        'user_agent',
        'device_name',
        'device_id',
        'platform',
        'fcm_token',
        'apns_token',
        'latitude',
        'longitude',
        'location_name',
        'status',
        'is_blocked',
        'metadata',
    ];

    protected $casts = [
        'is_blocked' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
        'metadata' => 'array',
    ];

    protected $appends = ['current_user_status'];

    public function resolveUser(): Model|null
    {
        return match ($this->user_type) {
            'Admin' => AdminUser::find($this->user_id),
            'Customer' => CustomerProfile::find($this->user_id),
            'Partner' => Partner::find($this->user_id),
            default => null,
        };
    }

    public function getCurrentUserStatusAttribute(): ?string
    {
        $user = $this->resolveUser();
        return $user?->status ?? null;
    }
}
