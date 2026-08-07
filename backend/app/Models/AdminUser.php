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

    public function setPasswordAttribute($value): void
    {
        if (! $value) {
            return;
        }

        $this->attributes['password'] = str_starts_with($value, '$2y$') ? $value : Hash::make($value);
    }
}
