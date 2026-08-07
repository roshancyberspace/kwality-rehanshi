<?php

namespace App\Http\Controllers\Api;

use App\Models\RateItem;

class RateItemController extends CrudController
{
    protected bool $cacheable = false;
    protected string $model = RateItem::class;
    protected array $with = ['service'];

    protected array $rules = [
        'service_id' => ['required', 'exists:services,id'],
        'name' => ['required', 'string', 'max:255'],
        'image' => ['nullable', 'string'],
        'price' => ['required', 'numeric', 'min:0'],
        'status' => ['nullable', 'string', 'max:50'],
    ];
}
