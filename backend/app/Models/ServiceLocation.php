<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceLocation extends Model
{
    protected $fillable = ['city', 'area', 'pincode', 'availability', 'professionals_count', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
