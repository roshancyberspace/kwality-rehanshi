<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\BookingLedger;
use App\Models\Category;
use App\Models\CustomerProfile;
use App\Models\CustomerWallet;
use App\Models\Payment;
use App\Models\Partner;
use App\Models\Service;
use App\Models\Setting;
use App\Models\VendorWallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class WalletManager
{
    public function syncBooking(Booking $booking): void
    {
        DB::transaction(function () use ($booking) {
            $booking->refresh();

            $method = $this->paymentMethod($booking);
            if ($method === 'Wallet' && in_array($booking->payment_status, ['Paid', 'Cash'], true)) {
                $this->syncCustomerWalletPayment($booking);
            }
            $this->syncPaymentRecord($booking, $method);

            if (! $this->isWalletableBooking($booking)) {
                return;
            }

            $partner = $booking->partner_id ? Partner::find($booking->partner_id) : Partner::where('name', $booking->professional_name)->first();
            if (! $partner) {
                return;
            }

            $gross = round((float) $booking->amount, 2);
            $commissionPercentage = $this->commissionPercentage($booking, $partner);
            $commission = round($gross * ($commissionPercentage / 100), 2);
            $taxAmount = 0;
            $vendorAmount = round($gross - $commission, 2);
            $companyDue = $method === 'Cash' ? $commission : 0;
            $ledgerStatus = $method === 'Cash' ? 'Unsettled' : 'Ready';

            $ledger = BookingLedger::updateOrCreate(
                ['booking_id' => $booking->id],
                [
                    'ledger_no' => $this->ledgerNo($booking),
                    'booking_no' => $booking->booking_no,
                    'partner_name' => $partner->name,
                    'method' => $method,
                    'gross' => $gross,
                    'commission' => $commission,
                    'vendor_amount' => $vendorAmount,
                    'company_due' => $companyDue,
                    'status' => $ledgerStatus,
                    'metadata' => [
                        'commission_percentage' => $commissionPercentage,
                        'commission_source' => $this->commissionSource($booking, $partner),
                        'gross_revenue' => $gross,
                        'tax_amount' => $taxAmount,
                        'vendor_payable' => $vendorAmount,
                    ],
                ]
            );

            WalletTransaction::where('booking_id', $booking->id)
                ->where('wallet_type', 'Vendor')
                ->whereIn('type', ['Online Earning', 'Cash Collected', 'Company Commission'])
                ->delete();

            if ($method === 'Cash') {
                $this->postVendorTransaction($partner, $booking, 'Credit', 'Cash Collected', $gross, 'Cash collected from customer.');
                $this->postVendorTransaction($partner, $booking, 'Debit', 'Company Commission', $commission, 'Platform fee deducted from COD booking.');
            } else {
                $this->postVendorTransaction($partner, $booking, 'Credit', 'Online Earning', $vendorAmount, 'Vendor share for online booking.');
            }

            $this->rebuildVendorWallet($partner);
            $ledger->refresh();
        });
    }

    public function postCustomerTransaction(CustomerProfile $customer, ?Booking $booking, string $direction, string $type, float $amount, ?string $description = null, array $metadata = []): WalletTransaction
    {
        return DB::transaction(function () use ($customer, $booking, $direction, $type, $amount, $description, $metadata) {
            $wallet = CustomerWallet::where('customer_profile_id', $customer->id)->lockForUpdate()->first()
                ?: CustomerWallet::create([
                    'customer_profile_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'balance' => 0,
                    'total_credit' => 0,
                    'total_debit' => 0,
                    'status' => 'Active',
                ]);

            $signedAmount = $direction === 'Credit' ? $amount : -$amount;
            $balance = round((float) $wallet->balance + $signedAmount, 2);

            $wallet->update([
                'customer_name' => $customer->name,
                'balance' => $balance,
                'total_credit' => $direction === 'Credit' ? round((float) $wallet->total_credit + $amount, 2) : round((float) $wallet->total_credit, 2),
                'total_debit' => $direction === 'Debit' ? round((float) $wallet->total_debit + $amount, 2) : round((float) $wallet->total_debit, 2),
            ]);

            return WalletTransaction::create([
                'transaction_no' => $this->transactionNo(),
                'wallet_type' => 'Customer',
                'customer_profile_id' => $customer->id,
                'booking_id' => $booking?->id,
                'booking_no' => $booking?->booking_no,
                'direction' => $direction,
                'type' => $type,
                'amount' => $amount,
                'balance_after' => $balance,
                'status' => 'Posted',
                'description' => $description,
                'metadata' => $metadata,
            ]);
        });
    }

    public function rebuildVendorWallet(Partner $partner): VendorWallet
    {
        return DB::transaction(function () use ($partner) {
            $transactions = WalletTransaction::where('wallet_type', 'Vendor')->where('partner_id', $partner->id)->orderBy('id')->get();
            $runningBalance = 0;

            foreach ($transactions as $transaction) {
                $amount = (float) $transaction->amount;
                $runningBalance += $transaction->direction === 'Credit' ? $amount : -$amount;
                $transaction->update(['balance_after' => round($runningBalance, 2)]);
            }

            $online = (float) $transactions->where('type', 'Online Earning')->sum('amount');
            $cash = (float) $transactions->where('type', 'Cash Collected')->sum('amount');
            $commission = (float) $transactions->where('type', 'Company Commission')->sum('amount');
            $credit = (float) $transactions->where('direction', 'Credit')->sum('amount');
            $debit = (float) $transactions->where('direction', 'Debit')->sum('amount');
            $withdrawals = (float) $transactions
                ->whereIn('type', ['Withdrawal Request', 'Settlement'])
                ->where('direction', 'Debit')
                ->sum('amount');
            $balance = round($credit - $debit, 2);

            return VendorWallet::updateOrCreate(
                ['partner_id' => $partner->id],
                [
                    'partner_name' => $partner->name,
                    'online_earning' => round($online, 2),
                    'cash_collected' => round($cash, 2),
                    'company_commission' => round($commission, 2),
                    'vendor_payable' => max(0, $balance),
                    'company_due' => 0,
                    'settlement' => $balance > 0 ? 'Ready' : ($withdrawals > 0 ? 'Review' : 'Pending'),
                    'metadata' => [
                        'available_balance' => max(0, $balance),
                        'lifetime_earning' => round($online + $cash - $commission, 2),
                        'withdrawn_or_reserved' => round($withdrawals, 2),
                        'total_credit' => round($credit, 2),
                        'total_debit' => round($debit, 2),
                    ],
                ]
            );
        });
    }

    public function rebuildCustomerWallet(CustomerProfile $customer): CustomerWallet
    {
        return DB::transaction(function () use ($customer) {
            $transactions = WalletTransaction::where('wallet_type', 'Customer')
                ->where('customer_profile_id', $customer->id)
                ->orderBy('id')
                ->get();
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

            return CustomerWallet::updateOrCreate(
                ['customer_profile_id' => $customer->id],
                [
                    'customer_name' => $customer->name,
                    'balance' => round($balance, 2),
                    'total_credit' => round($credit, 2),
                    'total_debit' => round($debit, 2),
                    'status' => 'Active',
                ]
            );
        });
    }

    public function postVendorAdjustment(Partner $partner, string $direction, string $type, float $amount, ?string $description = null, array $metadata = []): WalletTransaction
    {
        $currentBalance = (float) WalletTransaction::where('wallet_type', 'Vendor')->where('partner_id', $partner->id)->latest('id')->value('balance_after');
        $balance = round($currentBalance + ($direction === 'Credit' ? $amount : -$amount), 2);

        $transaction = WalletTransaction::create([
            'transaction_no' => $this->transactionNo(),
            'wallet_type' => 'Vendor',
            'partner_id' => $partner->id,
            'direction' => $direction,
            'type' => $type,
            'amount' => $amount,
            'balance_after' => $balance,
            'status' => 'Posted',
            'description' => $description,
            'metadata' => $metadata,
        ]);

        $this->rebuildVendorWallet($partner);

        return $transaction;
    }

    private function postVendorTransaction(Partner $partner, Booking $booking, string $direction, string $type, float $amount, string $description): WalletTransaction
    {
        $currentBalance = (float) WalletTransaction::where('wallet_type', 'Vendor')->where('partner_id', $partner->id)->latest('id')->value('balance_after');
        $balance = round($currentBalance + ($direction === 'Credit' ? $amount : -$amount), 2);

        return WalletTransaction::create([
            'transaction_no' => $this->transactionNo(),
            'wallet_type' => 'Vendor',
            'partner_id' => $partner->id,
            'booking_id' => $booking->id,
            'booking_no' => $booking->booking_no,
            'direction' => $direction,
            'type' => $type,
            'amount' => $amount,
            'balance_after' => $balance,
            'status' => 'Posted',
            'description' => $description,
        ]);
    }

    private function isWalletableBooking(Booking $booking): bool
    {
        return in_array($booking->status, ['Completed', 'Refunded'], true);
    }

    private function syncCustomerWalletPayment(Booking $booking): void
    {
        $customer = $this->customerForBooking($booking);
        if (! $customer) {
            return;
        }

        WalletTransaction::where('booking_id', $booking->id)
            ->where('wallet_type', 'Customer')
            ->where('type', 'Booking Payment')
            ->delete();
        $this->rebuildCustomerWallet($customer);
        $this->postCustomerTransaction($customer, $booking, 'Debit', 'Booking Payment', round((float) $booking->amount, 2), 'Wallet payment for booking.');
    }

    private function syncPaymentRecord(Booking $booking, string $method): void
    {
        $isCollected = in_array($booking->payment_status, ['Paid', 'Cash'], true)
            && ($method !== 'Cash' || $booking->status === 'Completed');

        if (! $isCollected) {
            return;
        }

        Payment::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'payment_no' => 'PAY-'.($booking->booking_no ?: str_pad((string) $booking->id, 5, '0', STR_PAD_LEFT)),
                'customer_name' => $booking->customer_name,
                'amount' => round((float) $booking->amount, 2),
                'method' => $method,
                'status' => 'Paid',
                'refund_status' => $booking->status === 'Refunded' ? 'Refunded' : 'None',
                'paid_at' => now(),
                'metadata' => [
                    'booking_no' => $booking->booking_no,
                    'payment_status' => $booking->payment_status,
                    'source' => 'booking_wallet_sync',
                ],
            ]
        );
    }

    private function paymentMethod(Booking $booking): string
    {
        $method = $booking->payment_method ?: $booking->payment_status;
        return strcasecmp((string) $method, 'cash') === 0 ? 'Cash' : (strcasecmp((string) $method, 'wallet') === 0 ? 'Wallet' : 'Online');
    }

    private function commissionPercentage(Booking $booking, Partner $partner): float
    {
        $category = $this->categoryForBooking($booking);
        if ($category?->commission_percentage !== null) {
            return (float) $category->commission_percentage;
        }

        if ($partner->commission_percentage !== null) {
            return (float) $partner->commission_percentage;
        }

        $setting = Setting::where('group', 'admin')->where('key', 'commission_percentage')->value('value');
        return is_numeric($setting) ? (float) $setting : 18.0;
    }

    private function commissionSource(Booking $booking, Partner $partner): string
    {
        if ($this->categoryForBooking($booking)?->commission_percentage !== null) {
            return 'category';
        }

        return $partner->commission_percentage !== null ? 'vendor' : 'default';
    }

    private function categoryForBooking(Booking $booking): ?Category
    {
        $service = Service::where('name', $booking->service_name)->first();
        if ($service?->category_id) {
            return Category::find($service->category_id);
        }

        return Category::where('name', $booking->service_name)->first();
    }

    private function customerForBooking(Booking $booking): ?CustomerProfile
    {
        return CustomerProfile::where('phone', $booking->customer_phone)->first()
            ?: CustomerProfile::where('name', $booking->customer_name)->first();
    }

    private function ledgerNo(Booking $booking): string
    {
        return 'LED-'.($booking->booking_no ?: str_pad((string) $booking->id, 5, '0', STR_PAD_LEFT));
    }

    private function transactionNo(): string
    {
        return 'WTX-'.now()->format('ymdHis').'-'.random_int(1000, 9999);
    }
}
