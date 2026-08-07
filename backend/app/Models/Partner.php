<?php

namespace App\Models;

use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Partner extends Model
{
    use HasApiTokens;

    protected $fillable = [
        'name',
        'address_line',
        'alternate_phone',
        'bank_account_holder',
        'bank_account_number',
        'bank_account_type',
        'bank_branch_name',
        'bank_ifsc',
        'bank_name',
        'business_name',
        'phone',
        'email',
        'password',
        'skill',
        'services',
        'service_ids',
        'sub_service_ids',
        'documents',
        'aadhaar_document',
        'pan_document',
        'area',
        'city',
        'pincode',
        'kyc_status',
        'kyc_submitted_at',
        'kyc_verified_at',
        'kyc_rejected_reason',
        'onboarding_step',
        'availability',
        'rating',
        'earnings',
        'commission_percentage',
        'status',
        'metadata',
        'service_experience_years',
    ];

    protected $hidden = ['password'];

    protected $appends = ['service_names', 'sub_service_names'];

    protected $casts = [
        'documents' => 'array',
        'kyc_submitted_at' => 'datetime',
        'kyc_verified_at' => 'datetime',
        'metadata' => 'array',
        'services' => 'array',
        'service_ids' => 'array',
        'sub_service_ids' => 'array',
    ];

    public function setPasswordAttribute($value): void
    {
        if (! $value) {
            return;
        }

        $this->attributes['password'] = str_starts_with($value, '$2y$') ? $value : Hash::make($value);
    }

    public function getServiceNamesAttribute(): array
    {
        $ids = array_values(array_filter(array_map('intval', $this->service_ids ?? [])));
        if ($ids === []) {
            return array_values(array_filter($this->services ?? []));
        }

        return Service::query()
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    public function getSubServiceNamesAttribute(): array
    {
        $ids = array_values(array_filter(array_map('intval', $this->sub_service_ids ?? [])));
        if ($ids === []) {
            return [];
        }

        return SubService::query()
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }
}
