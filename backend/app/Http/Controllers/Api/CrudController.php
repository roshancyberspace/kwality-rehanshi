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

    /** Optional override, e.g. paid_at. Defaults to created_at when timestamps are enabled. */
    protected ?string $dateFilterColumn = null;

    public function index(Request $request)
    {
        $cacheKey = $this->model . '_index_' . md5(json_encode($request->all()));
        
        $callback = function () use ($request) {
            if ($request->boolean('distinct') && $request->filled('column')) {
                return $this->distinctColumnResponse($request);
            }

            $query = $this->model::query()->latest('id');
            $lite = $request->boolean('lite') || $request->boolean('options');

            if (! $lite && ! empty($this->with)) {
                $query->with($this->with);
            }

            if ($lite) {
                $columns = $this->liteColumns();
                if (! empty($columns)) {
                    $query->select($columns);
                }
            }

            if ($request->filled('status') && $this->hasColumn('status')) {
                $query->where('status', $request->string('status'));
            }

            if ($request->filled('service_id') && $this->hasColumn('service_id')) {
                $query->where('service_id', $request->integer('service_id'));
            }

            if ($request->filled('sub_service_id') && $this->hasColumn('sub_service_id')) {
                $query->where('sub_service_id', $request->integer('sub_service_id'));
            }

            if ($request->filled('category_key') && $this->hasColumn('category_key')) {
                $query->where('category_key', $request->string('category_key'));
            }

            if ($request->filled('partner_id') && $this->hasColumn('partner_id')) {
                $query->where('partner_id', $request->integer('partner_id'));
            }

            foreach (['wallet_type', 'direction', 'type', 'method', 'settlement', 'refund_status', 'customer_name'] as $column) {
                if ($request->filled($column) && $this->hasColumn($column)) {
                    $query->where($column, $request->string($column));
                }
            }

            if ($request->filled('rating') && $this->hasColumn('rating')) {
                $query->whereRaw('ROUND(rating) = ?', [(int) $request->input('rating')]);
            }

            $this->applyDateRangeFilter($query, $request);

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

            $perPageParam = strtolower(trim((string) $request->input('per_page', '')));
            if (in_array($perPageParam, ['all', '-1'], true) || $request->boolean('all')) {
                $limit = max(1, min(20000, (int) $request->input('limit', $lite ? 5000 : 10000)));
                $items = $query->limit($limit)->get();
                if ($lite) {
                    $items = $items->map(fn ($item) => $this->presentLite($item));
                }

                return response()->json([
                    'data' => $items,
                    'total' => $items->count(),
                    'per_page' => $items->count(),
                    'current_page' => 1,
                    'last_page' => 1,
                ]);
            }

            $perPage = (int) $request->integer('per_page', 25);
            $paginator = $query->paginate(max(1, min(200, $perPage)));
            if ($lite) {
                $paginator->setCollection(
                    $paginator->getCollection()->map(fn ($item) => $this->presentLite($item))
                );
            }

            return response()->json($paginator);
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

    protected function applyDateRangeFilter($query, Request $request): void
    {
        if (! $request->filled('from_date') && ! $request->filled('to_date')) {
            return;
        }

        $column = $this->resolveDateFilterColumn();
        if (! $column) {
            return;
        }

        if ($request->filled('from_date')) {
            $query->whereDate($column, '>=', $request->date('from_date')->toDateString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate($column, '<=', $request->date('to_date')->toDateString());
        }
    }

    protected function resolveDateFilterColumn(): ?string
    {
        if ($this->dateFilterColumn) {
            return $this->dateFilterColumn;
        }

        $model = new $this->model;
        if ($model->usesTimestamps()) {
            return $model->getCreatedAtColumn();
        }

        return null;
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
        try {
            \Illuminate\Support\Facades\Cache::forget('frontend_content_v1');
            \Illuminate\Support\Facades\Cache::forget('frontend_content_json_v1');
            if ($this->cacheable) {
                \Illuminate\Support\Facades\Cache::flush();
            }
        } catch (\Throwable $e) {
            // Ignore cache flush errors if driver fails
        }
    }

    private function hasColumn(string $column): bool
    {
        return in_array($column, (new $this->model)->getFillable(), true);
    }

    protected function liteColumns(): array
    {
        $model = new $this->model;
        $candidates = [
            'id',
            'name',
            'title',
            'booking_no',
            'job_no',
            'customer_name',
            'service_name',
            'partner_name',
            'status',
            'service_id',
            'sub_service_id',
            'category_id',
            'category_key',
            'partner_id',
            'professional_name',
            'customer_phone',
            'payment_status',
            'payment_method',
            'amount',
            'role_id',
            'availability',
            'phone',
            'email',
            'price',
            'image',
            'banner_media',
            'kyc_status',
            'business_name',
        ];

        $available = array_values(array_intersect(
            array_unique(array_merge(['id'], $model->getFillable())),
            $candidates,
        ));

        return $available ?: ['id'];
    }

    protected function distinctColumnResponse(Request $request)
    {
        $column = (string) $request->input('column');
        if ($column === '' || ! $this->hasColumn($column)) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $limit = max(1, min(1000, (int) $request->input('limit', 500)));
        $values = $this->model::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column)
            ->limit($limit)
            ->pluck($column);

        $data = $values->map(fn ($value) => [
            'id' => $value,
            $column => $value,
            'name' => $value,
        ])->values();

        return response()->json([
            'data' => $data,
            'total' => $data->count(),
            'per_page' => $data->count(),
            'current_page' => 1,
            'last_page' => 1,
        ]);
    }

    protected function presentLite(mixed $item): array
    {
        if (is_array($item)) {
            return $item;
        }

        if ($item instanceof Model) {
            // Avoid $appends (service_name etc.) which lazy-load relations per row.
            $item->setAppends([]);

            return $item->attributesToArray();
        }

        return (array) $item;
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
                $rules[$field] = ['nullable', 'image', 'max:5120'];
            }
        }

        foreach ($this->mediaFields() as $field) {
            if (array_key_exists($field, $rules) && $request->hasFile($field)) {
                $rules[$field] = ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,gif,svg,mp4,webm,mov,ogg,m4v,avi', 'max:51200'];
            }
        }

        $data = $request->validate($rules);

        foreach (array_unique(array_merge($this->imageFields(), $this->mediaFields())) as $field) {
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

    protected function mediaFields(): array
    {
        return ['banner_media', 'video', 'video_url'];
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
