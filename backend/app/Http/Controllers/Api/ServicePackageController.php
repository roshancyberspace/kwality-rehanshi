<?php

namespace App\Http\Controllers\Api;

use App\Models\ServicePackage;

class ServicePackageController extends CrudController
{
    protected bool $cacheable = true;
    protected string $model = ServicePackage::class;
    protected array $with = ['service', 'subService'];

    protected array $rules = [
        'service_id' => ['nullable', 'exists:services,id'],
        'sub_service_id' => ['nullable', 'exists:sub_services,id'],
        'category_key' => ['nullable', 'string', 'max:100'],
        'name' => ['required', 'string', 'max:255'],
        'image' => ['nullable', 'string'],
        'price' => ['required', 'numeric'],
        'original_price' => ['nullable', 'numeric'],
        'duration' => ['nullable', 'string', 'max:100'],
        'rating' => ['nullable', 'numeric'],
        'jobs' => ['nullable', 'string', 'max:100'],
        'badge' => ['nullable', 'string', 'max:100'],
        'offer' => ['nullable', 'string', 'max:255'],
        'option_count' => ['nullable', 'string', 'max:100'],
        'description' => ['nullable', 'string'],
        'highlights' => ['nullable', 'array'],
        'included' => ['nullable', 'array'],
        'not_included' => ['nullable', 'array'],
        'process' => ['nullable', 'array'],
        'warranty' => ['nullable', 'string'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];
}
