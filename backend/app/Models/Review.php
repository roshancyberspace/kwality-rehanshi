<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = ['customer_name', 'partner_name', 'service_name', 'rating', 'text', 'reviewed_at', 'status', 'metadata'];

    protected $casts = ['reviewed_at' => 'date', 'metadata' => 'array'];
}
