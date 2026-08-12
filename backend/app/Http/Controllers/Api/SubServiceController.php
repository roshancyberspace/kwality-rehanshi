<?php

namespace App\Http\Controllers\Api;

use App\Models\SubService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SubServiceController extends CrudController
{
    protected bool $cacheable = true;
    protected string $model = SubService::class;
    protected array $with = ['service'];

    protected array $rules = [
        'service_id' => ['required', 'exists:services,id'],
        'name' => ['required', 'string', 'max:255'],
        'slug' => ['nullable', 'string', 'max:255'],
        'icon' => ['nullable', 'string'],
        'description' => ['nullable', 'string'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name']);
        $record = SubService::create($data);
        $record->load('service');
        $this->clearModelCache();

        return response()->json($record, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $record = SubService::findOrFail($id);
        $data = $this->validatedData($request);

        if (isset($data['name']) || isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name'], $record->id);
        }

        $record->update($data);
        $record->load('service');
        $this->clearModelCache();

        return response()->json($record->fresh(['service']));
    }

    private function uniqueSlug(string $value, int|string|null $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'sub-service';
        $slug = $base;
        $count = 2;

        while (
            SubService::query()
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
