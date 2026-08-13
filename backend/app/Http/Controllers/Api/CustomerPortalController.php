<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\CustomerWallet;
use App\Models\Review;
use App\Models\SavedAddress;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;

/**
 * Authenticated customer-scoped data. Uses Bearer customer token only.
 * Does not change public /bookings or /reviews index contracts.
 */
class CustomerPortalController extends Controller
{
    public function bookings(Request $request)
    {
        $customer = $request->user();
        $customerId = (string) $customer->id;
        $phoneDigits = preg_replace('/\D+/', '', (string) $customer->phone) ?: '';
        $phoneLast10 = strlen($phoneDigits) >= 10 ? substr($phoneDigits, -10) : $phoneDigits;

        $bookings = Booking::query()
            ->with(['extraItems'])
            ->where(function ($query) use ($customerId, $phoneLast10) {
                $query->where('metadata->customer_id', $customerId)
                    ->orWhere('metadata->customer_id', (int) $customerId);

                if ($phoneLast10 !== '') {
                    $query->orWhereRaw(
                        "RIGHT(REPLACE(REPLACE(REPLACE(COALESCE(customer_phone, ''), ' ', ''), '-', ''), '+', ''), 10) = ?",
                        [$phoneLast10]
                    );
                }
            })
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            // Extra safety: never return rows that belong to another customer_id
            ->filter(function (Booking $booking) use ($customerId, $phoneLast10) {
                $metaId = data_get($booking->metadata, 'customer_id');
                if ($metaId !== null && $metaId !== '' && (string) $metaId !== $customerId) {
                    return false;
                }
                if ((string) $metaId === $customerId) {
                    return true;
                }
                if ($phoneLast10 === '') {
                    return false;
                }
                $bookingDigits = preg_replace('/\D+/', '', (string) $booking->customer_phone) ?: '';
                $bookingLast10 = strlen($bookingDigits) >= 10 ? substr($bookingDigits, -10) : $bookingDigits;

                return $bookingLast10 !== '' && $bookingLast10 === $phoneLast10 && ($metaId === null || $metaId === '');
            })
            ->values();

        return response()->json(['data' => $bookings]);
    }

    public function reviews(Request $request)
    {
        $customer = $request->user();
        $customerId = (string) $customer->id;

        $reviews = Review::query()
            ->where(function ($query) use ($customerId) {
                $query->where('metadata->customer_id', $customerId)
                    ->orWhere('metadata->customer_id', (int) $customerId);
            })
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json(['data' => $reviews]);
    }

    public function wallet(Request $request)
    {
        $customer = $request->user();

        $wallet = CustomerWallet::query()
            ->where('customer_profile_id', $customer->id)
            ->first();

        if (! $wallet) {
            return response()->json([
                'balance' => 0,
                'customer_name' => $customer->name,
                'customer_profile_id' => $customer->id,
                'status' => 'Active',
            ]);
        }

        return response()->json($wallet);
    }

    public function walletTransactions(Request $request)
    {
        $customer = $request->user();

        $transactions = WalletTransaction::query()
            ->where('wallet_type', 'Customer')
            ->where('customer_profile_id', $customer->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json(['data' => $transactions]);
    }

    public function savedAddresses(Request $request)
    {
        $customer = $request->user();

        $addresses = SavedAddress::query()
            ->where('customer_profile_id', $customer->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json(['data' => $addresses]);
    }
}
