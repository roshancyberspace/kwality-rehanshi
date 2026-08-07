<?php

namespace App\Http\Controllers\Api;

use App\Models\SavedAddress;
use Illuminate\Http\Request;

class SavedAddressController extends CrudController
{
    protected string $model = SavedAddress::class;
    protected string $searchColumn = 'contact_name';
    protected array $rules = [
        'customer_profile_id' => ['nullable', 'exists:customer_profiles,id'],
        'label' => ['required', 'string', 'max:100'],
        'contact_name' => ['required', 'string', 'max:255'],
        'mobile' => ['nullable', 'string', 'max:50'],
        'flat' => ['nullable', 'string', 'max:255'],
        'street' => ['nullable', 'string'],
        'city' => ['required', 'string', 'max:255'],
        'state' => ['nullable', 'string', 'max:255'],
        'pincode' => ['nullable', 'string', 'max:20'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    public function index(Request $request)
    {
        $query = SavedAddress::query()->latest('id');

        $customerId = $request->input('customer_profile_id')
            ?: $request->input('customer_id')
            ?: $request->input('user_id');

        if (! $customerId && ($customer = $request->user('customer') ?: $request->user())) {
            if ($customer instanceof \App\Models\CustomerProfile) {
                $customerId = $customer->id;
            }
        }

        if ($customerId) {
            $query->where('customer_profile_id', (int) $customerId);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('q') || $request->filled('search')) {
            $term = '%'.($request->string('q') ?: $request->string('search')).'%';
            $query->where(function ($inner) use ($term) {
                $inner->where('label', 'like', $term)
                    ->orWhere('contact_name', 'like', $term)
                    ->orWhere('mobile', 'like', $term)
                    ->orWhere('flat', 'like', $term)
                    ->orWhere('street', 'like', $term)
                    ->orWhere('city', 'like', $term)
                    ->orWhere('state', 'like', $term)
                    ->orWhere('pincode', 'like', $term);
            });
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

        return response()->json($query->paginate(max(1, (int) $request->integer('per_page', 25))));
    }

    public function store(Request $request)
    {
        if (! $request->filled('customer_profile_id')) {
            $customerId = $request->input('customer_id') ?: $request->input('user_id');
            if (! $customerId && ($customer = $request->user('customer') ?: $request->user())) {
                if ($customer instanceof \App\Models\CustomerProfile) {
                    $customerId = $customer->id;
                }
            }
            if ($customerId) {
                $request->merge(['customer_profile_id' => (int) $customerId]);
            }
        }

        return parent::store($request);
    }
}
