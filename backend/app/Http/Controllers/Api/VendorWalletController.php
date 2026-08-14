<?php

namespace App\Http\Controllers\Api;

use App\Models\Partner;
use App\Models\VendorWallet;
use App\Support\WalletManager;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VendorWalletController extends CrudController
{
    protected string $model = VendorWallet::class;

    protected string $searchColumn = 'partner_name';

    protected array $rules = [
        'partner_id' => ['required', 'exists:partners,id'],
        'partner_name' => ['nullable', 'string', 'max:255'],
        'online_earning' => ['nullable', 'numeric'],
        'cash_collected' => ['nullable', 'numeric'],
        'company_commission' => ['nullable', 'numeric'],
        'vendor_payable' => ['nullable', 'numeric'],
        'company_due' => ['nullable', 'numeric'],
        'settlement' => ['nullable', 'string', 'max:100'],
        'metadata' => ['nullable', 'array'],
    ];

    public function index(Request $request)
    {
        $query = VendorWallet::query()->latest('id');

        if ($request->filled('partner_id')) {
            $query->where('partner_id', $request->integer('partner_id'));
        }

        if ($request->filled('q')) {
            $query->where('partner_name', 'like', '%'.$request->string('q').'%');
        }

        if ($request->filled('settlement')) {
            $query->where('settlement', $request->string('settlement'));
        }

        $this->applyDateRangeFilter($query, $request);

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
        $data = $request->validate([
            'partner_id' => ['required', 'exists:partners,id'],
            'settlement' => ['nullable', 'string', 'max:100'],
        ]);

        $partner = Partner::findOrFail($data['partner_id']);

        if (VendorWallet::where('partner_id', $partner->id)->exists()) {
            throw ValidationException::withMessages([
                'partner_id' => 'A wallet already exists for this partner.',
            ]);
        }

        $wallet = app(WalletManager::class)->rebuildVendorWallet($partner);

        if (! empty($data['settlement'])) {
            $wallet->update(['settlement' => $data['settlement']]);
        }

        return response()->json($wallet->fresh(), 201);
    }

    public function update(Request $request, int|string $id)
    {
        $wallet = VendorWallet::findOrFail($id);
        $data = $request->validate([
            'partner_id' => ['nullable', 'exists:partners,id'],
            'settlement' => ['nullable', 'string', 'max:100'],
        ]);

        $partner = Partner::findOrFail($data['partner_id'] ?? $wallet->partner_id);
        $wallet = app(WalletManager::class)->rebuildVendorWallet($partner);

        if (array_key_exists('settlement', $data) && $data['settlement'] !== null && $data['settlement'] !== '') {
            $wallet->update(['settlement' => $data['settlement']]);
        }

        return response()->json($wallet->fresh());
    }
}
