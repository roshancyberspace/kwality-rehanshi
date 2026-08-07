<?php

namespace App\Http\Controllers\Api;

use App\Models\Payout;
use App\Models\Partner;
use App\Models\WalletTransaction;
use App\Support\WalletManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayoutController extends CrudController
{
    protected string $model = Payout::class;
    protected array $rules = ['partner_id'=>['nullable','exists:partners,id'],'partner_name'=>['nullable','string','max:255'],'jobs'=>['nullable','integer'],'earnings'=>['nullable','numeric'],'commission'=>['nullable','numeric'],'pending'=>['nullable','numeric'],'paid'=>['nullable','numeric'],'status'=>['nullable','string','max:50'],'metadata'=>['nullable','array']];

    public function store(Request $request)
    {
        $record = DB::transaction(function () use ($request) {
            $data = $this->validatedData($request);
            $data['status'] = $data['status'] ?? 'Pending';
            $amount = round((float) ($data['pending'] ?? $data['earnings'] ?? 0), 2);
            if ($amount <= 0) {
                throw ValidationException::withMessages(['pending' => 'Withdrawal amount must be greater than zero.']);
            }

            $partner = ! empty($data['partner_id']) ? Partner::find($data['partner_id']) : Partner::where('name', $data['partner_name'] ?? '')->first();
            if (! $partner) {
                throw ValidationException::withMessages(['partner_id' => 'Partner is required for withdrawal request.']);
            }

            $wallet = app(WalletManager::class)->rebuildVendorWallet($partner);
            if (round((float) $wallet->vendor_payable, 2) < $amount) {
                throw ValidationException::withMessages(['pending' => 'Withdrawal amount is greater than vendor wallet balance.']);
            }

            $data['partner_id'] = $partner->id;
            $data['partner_name'] = $partner->name;
            $data['earnings'] = $amount;
            $data['pending'] = $amount;
            $data['paid'] = $data['paid'] ?? 0;
            $data['metadata'] = [
                ...($data['metadata'] ?? []),
                'requested_at' => now()->toDateTimeString(),
                'wallet_reserved' => true,
            ];

            $payout = Payout::create($data);
            $transaction = app(WalletManager::class)->postVendorAdjustment(
                $partner,
                'Debit',
                'Withdrawal Request',
                $amount,
                'Vendor withdrawal amount reserved for admin approval.',
                ['payout_id' => $payout->id]
            );

            $payout->update([
                'metadata' => [
                    ...($payout->metadata ?? []),
                    'wallet_reserved_transaction_id' => $transaction->id,
                ],
            ]);

            return $payout->fresh();
        });

        return response()->json($record, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $record = DB::transaction(function () use ($request, $id) {
            $payout = Payout::findOrFail($id);
            $previousStatus = $payout->status;
            $data = $this->validatedData($request);

            if (($data['status'] ?? null) === 'Paid' && $previousStatus !== 'Paid') {
                $partner = $payout->partner_id ? Partner::find($payout->partner_id) : Partner::where('name', $payout->partner_name)->first();
                if (! $partner) {
                    throw ValidationException::withMessages(['partner_id' => 'Partner is required before payout can be paid.']);
                }

                $amount = round((float) ($data['paid'] ?? $payout->paid ?? $payout->pending ?? $payout->earnings ?? 0), 2);
                if ($amount <= 0) {
                    throw ValidationException::withMessages(['paid' => 'Paid amount must be greater than zero.']);
                }

                if (empty($payout->metadata['wallet_reserved_transaction_id'])) {
                    app(WalletManager::class)->postVendorAdjustment(
                        $partner,
                        'Debit',
                        'Settlement',
                        $amount,
                        'Vendor withdrawal payout paid by admin.',
                        ['payout_id' => $payout->id]
                    );
                }

                $data['paid'] = $amount;
                $data['pending'] = 0;
                $data['metadata'] = [
                    ...($payout->metadata ?? []),
                    ...($data['metadata'] ?? []),
                    'paid_at' => now()->toDateTimeString(),
                ];
            }

            if (($data['status'] ?? null) === 'Rejected' && $previousStatus !== 'Rejected' && ! empty($payout->metadata['wallet_reserved_transaction_id'])) {
                $transaction = WalletTransaction::find($payout->metadata['wallet_reserved_transaction_id']);
                $partner = $payout->partner_id ? Partner::find($payout->partner_id) : null;
                if ($transaction && $partner) {
                    app(WalletManager::class)->postVendorAdjustment(
                        $partner,
                        'Credit',
                        'Withdrawal Reversal',
                        round((float) $transaction->amount, 2),
                        'Rejected withdrawal request released back to vendor wallet.',
                        ['payout_id' => $payout->id]
                    );
                }

                $data['pending'] = 0;
                $data['metadata'] = [
                    ...($payout->metadata ?? []),
                    ...($data['metadata'] ?? []),
                    'rejected_at' => now()->toDateTimeString(),
                ];
            }

            $payout->update($data);

            return $payout->fresh();
        });

        return response()->json($record);
    }
}
