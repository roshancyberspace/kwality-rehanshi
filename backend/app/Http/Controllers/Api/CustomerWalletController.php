<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomerProfile;
use App\Models\CustomerWallet;
use Illuminate\Http\Request;

class CustomerWalletController extends CrudController
{
    protected string $model = CustomerWallet::class;

    protected string $searchColumn = 'customer_name';

    protected array $rules = [
        'customer_profile_id' => ['nullable', 'exists:customer_profiles,id'],
        'customer_name' => ['nullable', 'string', 'max:255'],
        'balance' => ['nullable', 'numeric'],
        'total_credit' => ['nullable', 'numeric'],
        'total_debit' => ['nullable', 'numeric'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    public function store(Request $request)
    {
        if (!$request->filled('customer_name') && $request->filled('customer_profile_id')) {
            $customer = CustomerProfile::find($request->integer('customer_profile_id'));
            if ($customer) {
                $request->merge(['customer_name' => $customer->name]);
            }
        }
        return parent::store($request);
    }

    public function update(Request $request, int|string $id)
    {
        if (!$request->filled('customer_name') && $request->filled('customer_profile_id')) {
            $customer = CustomerProfile::find($request->integer('customer_profile_id'));
            if ($customer) {
                $request->merge(['customer_name' => $customer->name]);
            }
        }
        return parent::update($request, $id);
    }
}
