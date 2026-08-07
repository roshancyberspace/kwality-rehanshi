<?php

namespace App\Http\Controllers\Api;

use App\Models\Page;

class PageController extends CrudController
{
    protected bool $cacheable = true;
    protected string $model = Page::class;
    protected string $searchColumn = 'title';

    protected array $rules = [
        'title' => ['required', 'string', 'max:255'],
        'slug' => ['required', 'string', 'max:255'],
        'content' => ['required', 'string'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    public function bySlug(string $slug)
    {
        $page = Page::query()
            ->where('slug', $slug)
            ->where('status', 'Active')
            ->firstOrFail();

        return response()->json($page);
    }
}
