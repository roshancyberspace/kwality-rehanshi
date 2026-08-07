<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavedAddress extends Model
{
    protected $fillable = ['customer_profile_id', 'label', 'contact_name', 'mobile', 'flat', 'street', 'city', 'state', 'pincode', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
