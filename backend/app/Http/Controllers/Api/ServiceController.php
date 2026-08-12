<?php

namespace App\Http\Controllers\Api;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceController extends CrudController
{
        protected bool $cacheable = true;
    protected string $model = Service::class;

    protected array $rules = [
        'category_id' => ['nullable', 'exists:categories,id'],
        'name' => ['required', 'string', 'max:255'],
        'slug' => ['nullable', 'string', 'max:255'],
        'image' => ['nullable', 'string'],
        'duration' => ['nullable', 'string', 'max:100'],
        'rating' => ['nullable', 'numeric'],
        'description' => ['nullable', 'string'],
        'includes' => ['nullable', 'array'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name']);
        $record = Service::create($data);
        $this->clearModelCache();

        return response()->json($record, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $record = Service::findOrFail($id);
        $data = $this->validatedData($request);

        if (isset($data['name']) || isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name'], $record->id);
        }

        $record->update($data);
        $this->clearModelCache();

        return response()->json($record->fresh());
    }

    protected function imageDirectory(): string
    {
        return 'service-images';
    }

    private function uniqueSlug(string $value, int|string|null $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'service';
        $slug = $base;
        $count = 2;

        while (
            Service::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$count;
            $count++;
        }

        return $slug;
    }
}
