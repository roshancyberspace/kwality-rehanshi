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
                $array['metadata']['signup_otp'],
                $array['metadata']['deletion_otp'],
                $array['metadata']['otp'],
                $array['metadata']['otp_hash'],
                $array['metadata']['reset_token_hash'],
                $array['metadata']['device_token'],
                $array['metadata']['fcm_token'],
                $array['metadata']['apns_token'],
                $array['metadata']['push_token'],
                $array['metadata']['auth_token'],
                $array['metadata']['auth_tokens'],
                $array['metadata']['devices'],
                $array['metadata']['last_device']
            );
        }

        return $array;
    }
}
