<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;

class CustomerProfile extends Model
{
    use HasApiTokens, HasFactory;

    protected $fillable = ['name', 'phone', 'email', 'password', 'address', 'bookings_count', 'last_booking_at', 'status', 'metadata'];

    protected $casts = ['last_booking_at' => 'datetime', 'metadata' => 'array'];

    protected $hidden = ['password'];

    public function toArray()
    {
        $array = parent::toArray();
        if (isset($array['metadata']) && is_array($array['metadata'])) {
            unset(
                $array['metadata']['password'],
                $array['metadata']['password_hash'],
                $array['metadata']['session_token'],
                $array['metadata']['password_reset'],
                $array['metadata']['login_otp'],
            );
        }

        return $array;
    }
}
