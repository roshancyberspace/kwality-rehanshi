<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\CustomerProfile;
use App\Models\Partner;
use App\Models\WalletTransaction;
use App\Support\WalletManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WalletTransactionController extends CrudController
{
    protected string $model = WalletTransaction::class;

    protected string $searchColumn = 'transaction_no';

    protected array $rules = [
        'entry_for' => ['nullable', 'string', 'in:vendor,customer,booking_customer,booking_vendor,booking_both'],
        'transaction_no' => ['nullable', 'string', 'max:100'],
        'wallet_type' => ['nullable', 'string', 'in:Vendor,Customer'],
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

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('direction')) {
            $query->where('direction', $request->string('direction'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('q')) {
            $query->where(function ($inner) use ($request) {
                $term = '%'.$request->string('q').'%';
                $inner->where('transaction_no', 'like', $term)
                    ->orWhere('booking_no', 'like', $term)
                    ->orWhere('type', 'like', $term);
            });
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
        $record = DB::transaction(function () use ($request) {
            $data = $this->validatedData($request);
            $data = $this->hydrateFromBooking($data);
            $entryFor = (string) ($data['entry_for'] ?? '');
            unset($data['entry_for'], $data['balance_after'], $data['transaction_no']);

            $walletTypes = $this->walletTypesFor($entryFor, $data['wallet_type'] ?? null);
            $this->assertTargets($data, $walletTypes, $entryFor);

            $first = null;
            foreach ($walletTypes as $walletType) {
                $created = $this->postTransaction($data, $walletType);
                $first ??= $created;
            }

            return $first?->fresh();
        });

        return response()->json($record, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $record = DB::transaction(function () use ($request, $id) {
            $transaction = WalletTransaction::findOrFail($id);
            $oldPartnerId = $transaction->partner_id;
            $oldCustomerId = $transaction->customer_profile_id;
            $data = $this->hydrateFromBooking($this->validatedData($request));
            unset($data['entry_for']);
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

    private function postTransaction(array $data, string $walletType): WalletTransaction
    {
        $manager = app(WalletManager::class);
        $booking = ! empty($data['booking_id']) ? Booking::find($data['booking_id']) : null;
        $amount = round((float) $data['amount'], 2);
        $direction = $data['direction'];
        $type = $data['type'];
        $description = $data['description'] ?? ($booking ? "Manual {$direction} against {$booking->booking_no}" : "Manual {$direction}");
        $status = $data['status'] ?? 'Posted';

        if ($walletType === 'Customer') {
            $customer = CustomerProfile::findOrFail($data['customer_profile_id']);
            $transaction = $manager->postCustomerTransaction($customer, $booking, $direction, $type, $amount, $description);
        } else {
            $partner = Partner::findOrFail($data['partner_id']);
            $transaction = $manager->postVendorTransaction($partner, $booking, $direction, $type, $amount, $description);
            $manager->rebuildVendorWallet($partner);
        }

        if ($status && $status !== $transaction->status) {
            $transaction->update(['status' => $status]);
        }

        return $transaction->fresh();
    }

    private function hydrateFromBooking(array $data): array
    {
        $booking = ! empty($data['booking_id']) ? Booking::find($data['booking_id']) : null;
        if (! $booking) {
            return $data;
        }

        $data['booking_no'] = $booking->booking_no ?: ($data['booking_no'] ?? null);

        if (empty($data['partner_id'])) {
            $data['partner_id'] = $booking->partner_id
                ?: Partner::where('name', $booking->professional_name)->value('id');
        }

        if (empty($data['customer_profile_id'])) {
            $data['customer_profile_id'] = app(WalletManager::class)->customerForBooking($booking)?->id;
        }

        return $data;
    }

    private function walletTypesFor(string $entryFor, ?string $walletType): array
    {
        return match ($entryFor) {
            'vendor', 'booking_vendor' => ['Vendor'],
            'customer', 'booking_customer' => ['Customer'],
            'booking_both' => ['Customer', 'Vendor'],
            default => [in_array($walletType, ['Vendor', 'Customer'], true) ? $walletType : 'Customer'],
        };
    }

    private function assertTargets(array $data, array $walletTypes, string $entryFor): void
    {
        if (str_starts_with($entryFor, 'booking') && empty($data['booking_id'])) {
            throw ValidationException::withMessages([
                'booking_id' => 'Select a booking for this transaction.',
            ]);
        }

        if (in_array('Vendor', $walletTypes, true) && empty($data['partner_id'])) {
            throw ValidationException::withMessages([
                'partner_id' => str_starts_with($entryFor, 'booking')
                    ? 'This booking has no vendor assigned.'
                    : 'Select a vendor for this transaction.',
            ]);
        }

        if (in_array('Customer', $walletTypes, true) && empty($data['customer_profile_id'])) {
            throw ValidationException::withMessages([
                'customer_profile_id' => str_starts_with($entryFor, 'booking')
                    ? 'No customer wallet found for this booking.'
                    : 'Select a customer for this transaction.',
            ]);
        }
    }

    private function rebuildAffectedWallets(?int $partnerId, ?int $customerId, ?WalletTransaction $transaction = null): void
    {
        $manager = app(WalletManager::class);

        foreach (array_filter([$partnerId, $transaction?->partner_id]) as $id) {
            $partner = Partner::find($id);
            if ($partner) {
                $manager->rebuildVendorWallet($partner);
            }
        }

        foreach (array_filter([$customerId, $transaction?->customer_profile_id]) as $id) {
            $customer = CustomerProfile::find($id);
            if ($customer) {
                $manager->rebuildCustomerWallet($customer);
            }
        }
    }
}
