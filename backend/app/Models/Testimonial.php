<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Testimonial extends Model
{
    protected $fillable = [
        'customer_name',
        'service_type',
        'location',
        'rating',
        'review_text',
        'image',
        'is_video',
        'video_url',
        'sort_order',
        'status',
        'metadata',
    ];

    protected $casts = [
        'is_video' => 'boolean',
        'rating' => 'float',
        'sort_order' => 'integer',
        'metadata' => 'array',
    ];
}
