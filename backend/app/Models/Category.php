<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name', 'slug', 'image', 'badge', 'description', 'sort_order', 'commission_percentage', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
