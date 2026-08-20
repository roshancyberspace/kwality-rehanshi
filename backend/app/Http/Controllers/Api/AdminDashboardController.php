<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingLedger;
use App\Models\CustomerProfile;
use App\Models\Partner;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\Service;
use App\Models\ServicePackage;
use App\Models\VendorWallet;
use App\Models\WalletTransaction;
use App\Support\BookingAutoAssignmentManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function dashboard(Request $request)
    {
        app(BookingAutoAssignmentManager::class)->tick();

        $recentLimit = max(1, min(20, (int) $request->integer('recent_limit', 8)));

        $bookingAggregates = Booking::query()
            ->selectRaw('COUNT(*) as total_bookings')
            ->selectRaw("SUM(CASE WHEN status IN ('Pending', 'Pending Approval') THEN 1 ELSE 0 END) as pending_bookings")
            ->selectRaw("SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_bookings")
            ->selectRaw("SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_bookings")
            ->selectRaw("SUM(CASE WHEN LOWER(COALESCE(payment_status, '')) IN ('paid', 'cash') OR status = 'Completed' THEN amount ELSE 0 END) as booking_revenue")
            ->first();

        $paymentRevenue = (float) Payment::query()
            ->whereRaw('LOWER(status) in (?, ?, ?, ?, ?)', ['paid', 'cash', 'success', 'successful', 'completed'])
            ->sum('amount');

        $pendingPaymentAmount = (float) Payment::query()
            ->whereRaw('LOWER(status) in (?, ?, ?)', ['pending', 'unpaid', 'due'])
            ->sum('amount');

        $paidPaymentAmount = (float) Payment::query()
            ->whereRaw('LOWER(status) in (?, ?, ?, ?, ?)', ['paid', 'cash', 'success', 'successful', 'completed'])
            ->sum('amount');

        $ledger = BookingLedger::query()
            ->selectRaw('COALESCE(SUM(gross), 0) as gross')
            ->selectRaw('COALESCE(SUM(commission), 0) as commission')
            ->first();

        $wallet = VendorWallet::query()
            ->selectRaw('COALESCE(SUM(vendor_payable), 0) as vendor_payable')
            ->selectRaw('COALESCE(SUM(cash_collected), 0) as cash_collected')
            ->first();

        $commissionFromWallet = (float) WalletTransaction::query()
            ->where('type', 'Company Commission')
            ->sum('amount');

        $totalRevenue = max(
            (float) $paymentRevenue,
            (float) ($bookingAggregates->booking_revenue ?? 0),
            (float) ($ledger->gross ?? 0),
        );

        $platformFees = (float) ($ledger->commission ?? 0) ?: $commissionFromWallet;

        $statusCounts = Booking::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $recentBookings = Booking::query()
            ->latest('id')
            ->limit($recentLimit)
            ->get([
                'id',
                'booking_no',
                'customer_name',
                'customer_phone',
                'service_name',
                'scheduled_at',
                'address',
                'professional_name',
                'status',
                'payment_status',
                'payment_method',
                'amount',
                'created_at',
                'updated_at',
            ]);

        return response()->json([
            'stats' => [
                'total_revenue' => $totalRevenue,
                'total_bookings' => (int) ($bookingAggregates->total_bookings ?? 0),
                'pending_bookings' => (int) ($bookingAggregates->pending_bookings ?? 0),
                'completed_bookings' => (int) ($bookingAggregates->completed_bookings ?? 0),
                'cancelled_bookings' => (int) ($bookingAggregates->cancelled_bookings ?? 0),
                'customers_count' => CustomerProfile::query()->count(),
                'partners_count' => Partner::query()->count(),
                'active_partners_count' => Partner::query()->where('status', '!=', 'Inactive')->count(),
                'services_count' => Service::query()->count(),
                'packages_count' => ServicePackage::query()->count(),
                'payments_count' => Payment::query()->count(),
                'paid_payments' => $paidPaymentAmount,
                'pending_payments' => $pendingPaymentAmount,
                'platform_fees' => $platformFees,
                'vendor_payable' => (float) ($wallet->vendor_payable ?? 0),
                'cash_collected' => (float) ($wallet->cash_collected ?? 0),
                'ledger_revenue' => (float) ($ledger->gross ?? 0),
                'payment_revenue' => (float) $paymentRevenue,
                'booking_revenue' => (float) ($bookingAggregates->booking_revenue ?? 0),
            ],
            'status_counts' => $statusCounts,
            'recent_bookings' => $recentBookings,
        ]);
    }

    public function reports()
    {
        $dashboard = $this->dashboard(request())->getData(true);

        $bookings = Booking::query()
            ->latest('id')
            ->limit(500)
            ->get([
                'id',
                'service_name',
                'status',
                'payment_status',
                'payment_method',
                'amount',
                'scheduled_at',
                'created_at',
                'updated_at',
            ]);

        $ledgers = BookingLedger::query()
            ->latest('id')
            ->limit(500)
            ->get(['id', 'partner_name', 'vendor_amount', 'commission', 'gross']);

        $transactions = WalletTransaction::query()
            ->latest('id')
            ->limit(500)
            ->get(['id', 'type', 'direction', 'amount']);

        $payouts = Payout::query()
            ->latest('id')
            ->limit(300)
            ->get(['id', 'status', 'pending', 'paid']);

        $wallets = VendorWallet::query()
            ->latest('id')
            ->limit(300)
            ->get(['id', 'partner_name', 'vendor_payable']);

        $groupSum = function ($rows, callable $labelGetter, callable $valueGetter = null) {
            $valueGetter ??= fn () => 1;
            $groups = [];
            foreach ($rows as $row) {
                $label = $labelGetter($row) ?: 'Unknown';
                if (! isset($groups[$label])) {
                    $groups[$label] = ['label' => $label, 'value' => 0];
                }
                $groups[$label]['value'] += (float) $valueGetter($row);
            }

            return array_values($groups);
        };

        $topRows = function (array $rows, int $limit = 8) {
            usort($rows, fn ($a, $b) => $b['value'] <=> $a['value']);

            return array_slice($rows, 0, $limit);
        };

        $latestRows = function (array $rows, int $limit = 10) {
            // groupSum is newest-first; take recent days then reverse for charts
            $recent = array_slice($rows, 0, $limit);

            return array_reverse($recent);
        };

        $dateKey = function ($value) {
            if (! $value) {
                return 'Unknown';
            }
            try {
                return \Carbon\Carbon::parse($value)->timezone('Asia/Kolkata')->format('d M');
            } catch (\Throwable) {
                return 'Unknown';
            }
        };

        $paidBookings = $bookings->filter(function ($booking) {
            return in_array($booking->payment_status, ['Paid', 'Cash'], true) || $booking->status === 'Completed';
        });

        $withdrawalPending = (float) $payouts
            ->filter(fn ($payout) => ! in_array($payout->status, ['Paid', 'Rejected'], true))
            ->sum(fn ($payout) => (float) ($payout->pending ?? 0));

        return response()->json([
            'stats' => [
                ...($dashboard['stats'] ?? []),
                'payment_records' => Payment::query()->count(),
                'withdrawal_pending' => $withdrawalPending,
                'paid_out' => (float) $payouts->sum(fn ($payout) => (float) ($payout->paid ?? 0)),
            ],
            'status_counts' => $dashboard['status_counts'] ?? [],
            'charts' => [
                'revenue_trend' => $latestRows($groupSum(
                    $paidBookings,
                    fn ($booking) => $dateKey($booking->updated_at ?: $booking->scheduled_at ?: $booking->created_at),
                    fn ($booking) => $booking->amount,
                ), 10),
                'booking_trend' => $latestRows($groupSum(
                    $bookings,
                    fn ($booking) => $dateKey($booking->created_at ?: $booking->scheduled_at),
                ), 10),
                'payment_methods' => $topRows($groupSum(
                    $bookings,
                    fn ($booking) => $booking->payment_method ?: $booking->payment_status ?: 'Pending',
                    fn ($booking) => $booking->amount,
                ), 6),
                'booking_statuses' => $topRows($groupSum(
                    $bookings,
                    fn ($booking) => $booking->status ?: 'Pending',
                ), 8),
                'service_revenue' => $topRows($groupSum(
                    $bookings,
                    fn ($booking) => $booking->service_name,
                    fn ($booking) => $booking->amount,
                ), 8),
                'vendor_revenue' => $topRows($groupSum(
                    $ledgers,
                    fn ($ledger) => $ledger->partner_name,
                    fn ($ledger) => $ledger->vendor_amount,
                ), 8),
                'commission_by_vendor' => $topRows($groupSum(
                    $ledgers,
                    fn ($ledger) => $ledger->partner_name,
                    fn ($ledger) => $ledger->commission,
                ), 8),
                'wallet_flow' => $topRows($groupSum(
                    $transactions,
                    fn ($row) => $row->type ?: $row->direction,
                    fn ($row) => $row->amount,
                ), 8),
                'payout_status' => $topRows($groupSum(
                    $payouts,
                    fn ($payout) => $payout->status ?: 'Pending',
                    fn ($payout) => (float) ($payout->pending ?? 0) + (float) ($payout->paid ?? 0),
                ), 6),
                'wallet_balances' => $topRows($groupSum(
                    $wallets,
                    fn ($wallet) => $wallet->partner_name,
                    fn ($wallet) => $wallet->vendor_payable,
                ), 8),
            ],
        ]);
    }
}
