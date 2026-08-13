<?php

namespace App\Http\Controllers\Api;

use App\Models\MobileBanner;

class MobileBannerController extends CrudController
{
    protected bool $cacheable = true;

    protected string $model = MobileBanner::class;

    protected array $rules = [
        'title' => ['nullable', 'string'],
        'subtitle' => ['nullable', 'string'],
        'body' => ['nullable', 'string'],
        'image' => ['nullable', 'string'],
        'bg_color' => ['nullable', 'string', 'max:40'],
        'button_text' => ['nullable', 'string', 'max:120'],
        'button_url' => ['nullable', 'string', 'max:500'],
        'title_color' => ['nullable', 'string', 'max:40'],
        'subtitle_color' => ['nullable', 'string', 'max:40'],
        'body_color' => ['nullable', 'string', 'max:40'],
        'button_color' => ['nullable', 'string', 'max:40'],
        'text_align' => ['nullable', 'string', 'max:20'],
        'title_size' => ['nullable', 'string', 'max:20'],
        'subtitle_size' => ['nullable', 'string', 'max:20'],
        'title_weight' => ['nullable', 'string', 'max:20'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    protected function imageFields(): array
    {
        return ['image'];
    }
}
