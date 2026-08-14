<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;

class CategoryController extends CrudController
{
        protected bool $cacheable = true;
    protected string $model = Category::class;

    protected array $rules = [
        'name' => ['required', 'string', 'max:255'],
        'slug' => ['nullable', 'string', 'max:255'],
        'image' => ['nullable', 'string'],
        'badge' => ['nullable', 'string', 'max:100'],
        'description' => ['nullable', 'string'],
        'sort_order' => ['nullable', 'integer'],
        'commission_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
        'status' => ['nullable', 'string', 'in:Active,Inactive'],
        'metadata' => ['nullable', 'array'],
    ];
}
