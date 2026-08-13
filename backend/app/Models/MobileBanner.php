<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MobileBanner extends Model
{
    protected $fillable = [
        'title',
        'subtitle',
        'body',
        'image',
        'bg_color',
        'button_text',
        'button_url',
        'title_color',
        'subtitle_color',
        'body_color',
        'button_color',
        'text_align',
        'title_size',
        'subtitle_size',
        'title_weight',
        'sort_order',
        'status',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sort_order' => 'integer',
    ];
}
