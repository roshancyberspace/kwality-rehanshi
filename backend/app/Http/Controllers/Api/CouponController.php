<?php

namespace App\Http\Controllers\Api;

use App\Models\Coupon;
use App\Support\CouponDiscountResolver;
use Illuminate\Http\Request;

class CouponController extends CrudController
{
    protected string $model = Coupon::class;

    protected string $searchColumn = 'code';

    protected array $rules = [
        'code' => ['required', 'string', 'max:100'],
        'type' => ['required', 'string', 'max:50'],
        'value' => ['required', 'string', 'max:100'],
        'minimum_order' => ['nullable', 'numeric'],
        'expires_at' => ['nullable', 'date'],
        'usage_limit' => ['nullable', 'integer'],
        'applies_to' => ['nullable', 'string', 'in:all,category,service,package'],
        'category_ids' => ['nullable', 'array'],
        'category_ids.*' => ['integer', 'exists:categories,id'],
        'service_ids' => ['nullable', 'array'],
        'service_ids.*' => ['integer', 'exists:services,id'],
        'service_package_ids' => ['nullable', 'array'],
        'service_package_ids.*' => ['integer', 'exists:service_packages,id'],
        'status' => ['nullable', 'string', 'in:Active,Inactive'],
        'metadata' => ['nullable', 'array'],
    ];

    public function store(Request $request)
    {
        $data = $this->normalizeScopeFields($this->validatedData($request));
        $item = Coupon::create($data);

        $this->clearModelCache();

        return response()->json($item->fresh(), 201);
    }

    public function update(Request $request, int|string $id)
    {
        $item = Coupon::findOrFail($id);
        $data = $this->normalizeScopeFields($this->validatedData($request));
        $item->update($data);

        $this->clearModelCache();

        return response()->json($item->fresh());
    }

    public function validateCode(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'items' => ['nullable', 'array'],
            'items.*.id' => ['required_with:items', 'integer'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
        ]);

        $result = app(CouponDiscountResolver::class)->resolve(
            $data['code'],
            (float) $data['subtotal'],
            $data['items'] ?? []
        );

        return response()->json($result['coupon']);
    }

    private function normalizeScopeFields(array $data): array
    {
        $appliesTo = strtolower((string) ($data['applies_to'] ?? 'all')) ?: 'all';
        $data['applies_to'] = $appliesTo;

        $normalizeIds = static function ($value): array {
            if (! is_array($value)) {
                return [];
            }

            return array_values(array_unique(array_map('intval', array_filter($value, fn ($id) => $id !== null && $id !== ''))));
        };

        $data['category_ids'] = $normalizeIds($data['category_ids'] ?? []);
        $data['service_ids'] = $normalizeIds($data['service_ids'] ?? []);
        $data['service_package_ids'] = $normalizeIds($data['service_package_ids'] ?? []);

        if ($appliesTo === 'all') {
            $data['category_ids'] = [];
            $data['service_ids'] = [];
            $data['service_package_ids'] = [];
        } elseif ($appliesTo === 'category') {
            $data['service_ids'] = [];
            $data['service_package_ids'] = [];
            if ($data['category_ids'] === []) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'category_ids' => 'Select at least one category for this coupon.',
                ]);
            }
        } elseif ($appliesTo === 'service') {
            $data['category_ids'] = [];
            $data['service_package_ids'] = [];
            if ($data['service_ids'] === []) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'service_ids' => 'Select at least one service for this coupon.',
                ]);
            }
        } elseif ($appliesTo === 'package') {
            $data['category_ids'] = [];
            $data['service_ids'] = [];
            if ($data['service_package_ids'] === []) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'service_package_ids' => 'Select at least one package for this coupon.',
                ]);
            }
        }

        return $data;
    }
}
