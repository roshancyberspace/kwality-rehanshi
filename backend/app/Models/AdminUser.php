<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class AdminUser extends Model
{
    use HasApiTokens;

    protected $fillable = ['name', 'email', 'password', 'role_id', 'role_name', 'permissions', 'status', 'metadata'];

    protected $hidden = ['password'];

    protected $casts = ['permissions' => 'array', 'metadata' => 'array'];

    public function toArray()
    {
        $array = parent::toArray();
        if (isset($array['metadata']) && is_array($array['metadata'])) {
            unset(
                $array['metadata']['password'],
                $array['metadata']['password_hash'],
                $array['metadata']['session_token'],
                $array['metadata']['token'],
                $array['metadata']['auth_token'],
                $array['metadata']['fcm_token'],
                $array['metadata']['apns_token'],
                $array['metadata']['devices']
            );
        }

        return $array;
    }

    public function setPasswordAttribute($value): void
    {
        if (! $value) {
            return;
        }

        $this->attributes['password'] = str_starts_with($value, '$2y$') ? $value : Hash::make($value);
    }
}
