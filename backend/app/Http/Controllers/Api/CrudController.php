<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

abstract class CrudController extends Controller
{
    protected string $model;

    protected bool $cacheable = false;

    protected array $rules = [];

    protected array $with = [];

    protected string $searchColumn = 'name';

    public function index(Request $request)
    {
        $cacheKey = $this->model . '_index_' . md5(json_encode($request->all()));
        
        $callback = function () use ($request) {
            $query = $this->model::query()->latest('id');
            
            if (!empty($this->with)) {
                $query->with($this->with);
            }

            if ($request->filled('status') && $this->hasColumn('status')) {
                $query->where('status', $request->string('status'));
            }

            if ($request->filled('q') || $request->filled('search')) {
                $term = '%'.($request->string('q') ?: $request->string('search')).'%';
                $columns = $this->getSearchableColumns();
                if (! empty($columns)) {
                    $query->where(function ($q) use ($columns, $term) {
                        foreach ($columns as $index => $col) {
                            if ($index === 0) {
                                $q->where($col, 'like', $term);
                            } else {
                                $q->orWhere($col, 'like', $term);
                            }
                        }
                    });
                }
            }

            $perPageParam = $request->input('per_page');
            if ($perPageParam === 'all' || (int) $perPageParam === -1 || $request->boolean('all')) {
                $items = $query->get();
                return response()->json([
                    'data' => $items,
                    'total' => $items->count(),
                    'per_page' => $items->count(),
                    'current_page' => 1,
                    'last_page' => 1,
                ]);
            }

            $perPage = (int) $request->integer('per_page', 25);
            return response()->json($query->paginate(max(1, $perPage)));
        };

        if ($this->cacheable) {
            try {
                return \Illuminate\Support\Facades\Cache::remember($cacheKey, 900, $callback);
            } catch (\Throwable $e) {
                return $callback();
            }
        }

        return $callback();
    }

    protected function getSearchableColumns(): array
    {
        $fillables = (new $this->model)->getFillable();
        $candidates = ['name', 'title', 'business_name', 'owner_name', 'first_name', 'last_name', 'category_key', 'description', 'phone', 'mobile', 'email', 'code', 'booking_no', 'job_no', 'address', 'city', 'area', 'pincode', 'badge', 'offer', 'warranty', 'subject', 'service_name', 'customer_name', 'professional_name', 'label', 'contact_name', 'street', 'flat', 'type', 'channel', 'audience', 'price', 'original_price', 'amount'];
        
        $searchable = array_values(array_intersect($fillables, $candidates));
        if (empty($searchable) && ! empty($this->searchColumn) && $this->hasColumn($this->searchColumn)) {
            $searchable = [$this->searchColumn];
        }
        return $searchable ?: ($this->hasColumn('name') ? ['name'] : []);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $item = $this->model::create($data);

        $this->clearModelCache();

        return response()->json($item, 201);
    }

    public function show(int|string $id)
    {
        return response()->json($this->model::findOrFail($id));
    }

    public function update(Request $request, int|string $id)
    {
        $item = $this->model::findOrFail($id);
        $data = $this->validatedData($request);
        $item->update($data);

        $this->clearModelCache();

        return response()->json($item);
    }

    public function destroy(int|string $id)
    {
        $item = $this->model::findOrFail($id);
        $item->delete();

        $this->clearModelCache();

        return response()->json(['message' => 'Deleted successfully']);
    }

    protected function clearModelCache(): void
    {
        if ($this->cacheable) {
            try {
                \Illuminate\Support\Facades\Cache::flush();
            } catch (\Throwable $e) {
                // Ignore cache flush errors if driver fails
            }
        }
    }

    private function hasColumn(string $column): bool
    {
        return in_array($column, (new $this->model)->getFillable(), true);
    }

    protected function validatedData(Request $request): array
    {
        $rules = $this->rules;

        foreach ($rules as $field => $fieldRules) {
            if ($request->isMethod('patch') || $request->isMethod('put')) {
                $rules[$field] = collect($fieldRules)
                    ->reject(fn ($rule) => $rule === 'required')
                    ->prepend('sometimes')
                    ->all();
            }

            if ($request->has($field) && $this->expectsArray($fieldRules) && is_string($request->input($field))) {
                $decoded = json_decode($request->input($field), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$field => $decoded]);
                }
            }
        }

        foreach ($this->imageFields() as $field) {
            if (array_key_exists($field, $rules) && $request->hasFile($field)) {
                $rules[$field] = ['nullable', 'image', 'max:3072'];
            }
        }

        $data = $request->validate($rules);

        foreach ($this->imageFields() as $field) {
            if (! array_key_exists($field, $rules) || ! $request->hasFile($field)) {
                continue;
            }

            $file = $request->file($field);
            $directory = $this->imageDirectory();
            $filename = $file->hashName();
            $destination = public_path($directory);

            if (! is_dir($destination)) {
                mkdir($destination, 0755, true);
            }

            $file->move($destination, $filename);
            $data[$field] = url('/'.$directory.'/'.$filename);
        }

        return $data;
    }

    protected function imageFields(): array
    {
        return ['image'];
    }

    protected function imageDirectory(): string
    {
        return Str::plural(Str::kebab(class_basename($this->model))).'-images';
    }

    private function expectsArray(array $rules): bool
    {
        return collect($rules)->contains(fn ($rule) => is_string($rule) && str_starts_with($rule, 'array'));
    }
}
