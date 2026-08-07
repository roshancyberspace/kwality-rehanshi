<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    protected $fillable = [
        'name',
        'logo',
        'sort_order',
        'status',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];
}
