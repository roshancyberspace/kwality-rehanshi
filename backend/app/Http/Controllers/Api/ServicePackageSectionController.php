<?php

namespace App\Http\Controllers\Api;

use App\Models\ServicePackageSection;

class ServicePackageSectionController extends CrudController
{
    protected string $model = ServicePackageSection::class;

    protected string $searchColumn = 'title';

    protected array $rules = [
        'service_package_id' => ['required', 'exists:service_packages,id'],
        'service_id' => ['nullable', 'exists:services,id'],
        'section_key' => ['required', 'string', 'max:100'],
        'section_type' => ['required', 'string', 'max:100'],
        'title' => ['required', 'string', 'max:255'],
        'subtitle' => ['nullable', 'string', 'max:255'],
        'body' => ['nullable', 'string'],
        'image' => ['nullable', 'string'],
        'items' => ['nullable', 'array'],
        'metadata' => ['nullable', 'array'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
        'is_visible' => ['nullable', 'boolean'],
    ];
}
