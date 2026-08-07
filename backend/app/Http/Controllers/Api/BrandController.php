<?php

namespace App\Http\Controllers\Api;

use App\Models\Brand;

class BrandController extends CrudController
{
        protected bool $cacheable = true;
    protected string $model = Brand::class;

    protected array $rules = [
        'name' => ['required', 'string', 'max:255'],
        'logo' => ['nullable', 'string'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    protected function imageFields(): array
    {
        return ['logo'];
    }
}
