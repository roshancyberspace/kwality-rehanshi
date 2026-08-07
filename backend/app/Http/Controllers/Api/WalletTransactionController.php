<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomerProfile;
use App\Models\CustomerWallet;
use App\Models\Partner;
use App\Models\WalletTransaction;
use App\Support\WalletManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletTransactionController extends CrudController
{
    protected string $model = WalletTransaction::class;

    protected string $searchColumn = 'transaction_no';

    protected array $rules = [
        'transaction_no' => ['nullable', 'string', 'max:100'],
        'wallet_type' => ['required', 'string', 'in:Vendor,Customer'],
        'partner_id' => ['nullable', 'exists:partners,id'],
        'customer_profile_id' => ['nullable', 'exists:customer_profiles,id'],
        'booking_id' => ['nullable', 'exists:bookings,id'],
        'booking_no' => ['nullable', 'string', 'max:100'],
        'direction' => ['required', 'string', 'in:Credit,Debit'],
        'type' => ['required', 'string', 'max:100'],
        'amount' => ['required', 'numeric', 'min:0.01'],
        'balance_after' => ['nullable', 'numeric'],
        'status' => ['nullable', 'string', 'max:50'],
        'description' => ['nullable', 'string'],
        'metadata' => ['nullable', 'array'],
    ];

    public function index(Request $request)
    {
        $query = WalletTransaction::query()->latest('id');

        if ($request->filled('wallet_type')) {
            $query->where('wallet_type', $request->string('wallet_type'));
        }

        if ($request->filled('partner_id')) {
            $query->where('partner_id', $request->integer('partner_id'));
        }

        if ($request->filled('customer_profile_id')) {
            $query->where('customer_profile_id', $request->integer('customer_profile_id'));
        }

        if ($request->filled('q')) {
            $query->where(function ($inner) use ($request) {
                $term = '%'.$request->string('q').'%';
                $inner->where('transaction_no', 'like', $term)
                    ->orWhere('booking_no', 'like', $term)
                    ->orWhere('type', 'like', $term);
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
        $record = DB::transaction(function () use ($request) {
            $data = $this->validatedData($request);
            $data['transaction_no'] = $data['transaction_no'] ?? $this->transactionNo();
            $data['status'] = $data['status'] ?? 'Posted';

            if ($data['wallet_type'] === 'Customer') {
                $customer = CustomerProfile::findOrFail($data['customer_profile_id']);
                $record = WalletTransaction::create($data);
                $this->rebuildCustomerWallet($customer->id);
            } else {
                $partner = Partner::findOrFail($data['partner_id']);
                $record = WalletTransaction::create($this->withVendorBalance($data, $partner));
                app(WalletManager::class)->rebuildVendorWallet($partner);
            }

            return $record->fresh();
        });

        return response()->json($record, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $record = DB::transaction(function () use ($request, $id) {
            $transaction = WalletTransaction::findOrFail($id);
            $oldPartnerId = $transaction->partner_id;
            $oldCustomerId = $transaction->customer_profile_id;
            $data = $this->validatedData($request);
            $transaction->update($data);

            $this->rebuildAffectedWallets($oldPartnerId, $oldCustomerId, $transaction->fresh());

            return $transaction->fresh();
        });

        return response()->json($record);
    }

    public function destroy(int|string $id)
    {
        DB::transaction(function () use ($id) {
            $transaction = WalletTransaction::findOrFail($id);
            $partnerId = $transaction->partner_id;
            $customerId = $transaction->customer_profile_id;
            $transaction->delete();
            $this->rebuildAffectedWallets($partnerId, $customerId);
        });

        return response()->json(['message' => 'Deleted successfully']);
    }

    private function withVendorBalance(array $data, Partner $partner): array
    {
        $currentBalance = (float) WalletTransaction::where('wallet_type', 'Vendor')->where('partner_id', $partner->id)->latest('id')->value('balance_after');
        $signedAmount = $data['direction'] === 'Credit' ? (float) $data['amount'] : -((float) $data['amount']);
        $data['balance_after'] = round($currentBalance + $signedAmount, 2);

        return $data;
    }

    private function rebuildAffectedWallets(?int $partnerId, ?int $customerId, ?WalletTransaction $transaction = null): void
    {
        foreach (array_filter([$partnerId, $transaction?->partner_id]) as $id) {
            $partner = Partner::find($id);
            if ($partner) {
                app(WalletManager::class)->rebuildVendorWallet($partner);
            }
        }

        foreach (array_filter([$customerId, $transaction?->customer_profile_id]) as $id) {
            $this->rebuildCustomerWallet((int) $id);
        }
    }

    private function rebuildCustomerWallet(int $customerId): void
    {
        $customer = CustomerProfile::find($customerId);
        if (! $customer) {
            return;
        }

        $transactions = WalletTransaction::where('wallet_type', 'Customer')->where('customer_profile_id', $customerId)->orderBy('id')->get();
        $balance = 0;
        $credit = 0;
        $debit = 0;

        foreach ($transactions as $transaction) {
            $amount = (float) $transaction->amount;
            if ($transaction->direction === 'Credit') {
                $credit += $amount;
                $balance += $amount;
            } else {
                $debit += $amount;
                $balance -= $amount;
            }
            $transaction->update(['balance_after' => round($balance, 2)]);
        }

        CustomerWallet::updateOrCreate(
            ['customer_profile_id' => $customer->id],
            [
                'customer_name' => $customer->name,
                'balance' => round($balance, 2),
                'total_credit' => round($credit, 2),
                'total_debit' => round($debit, 2),
                'status' => 'Active',
            ]
        );
    }

    private function transactionNo(): string
    {
        return 'WTX-'.now()->format('ymdHis').'-'.random_int(1000, 9999);
    }
}
