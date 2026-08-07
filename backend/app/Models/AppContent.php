<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppContent extends Model
{
    protected $fillable = ['type', 'title', 'subtitle', 'body', 'image', 'button_text', 'button_url', 'sort_order', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
