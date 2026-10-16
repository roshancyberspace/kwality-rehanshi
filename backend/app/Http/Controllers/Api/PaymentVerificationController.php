<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Setting;
use App\Support\BookingCustomerMailer;
use App\Support\WalletManager;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class PaymentVerificationController extends Controller
{
    /**
     * POST /api/v1/payments/razorpay/verify
     *
     * Customer app calls this right after Razorpay checkout succeeds. The payment is
     * re-fetched from Razorpay with the server-side secret (never trusting the client),
     * matched against the booking amount, and then the booking is marked Paid.
     */
    public function verifyRazorpay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => ['required_without:booking_no', 'nullable', 'integer'],
            'booking_no' => ['required_without:booking_id', 'nullable', 'string', 'max:100'],
            'razorpay_payment_id' => ['required', 'string', 'max:100'],
            'razorpay_order_id' => ['nullable', 'string', 'max:100'],
            'razorpay_signature' => ['nullable', 'string', 'max:255'],
        ]);

        $config = Setting::where('group', 'payment_methods')->where('key', 'razorpay')->first()?->metadata ?? [];
        $keyId = $config['public_key'] ?? null;
        $secret = $config['secret_key'] ?? null;
        if (! $keyId || ! $secret) {
            return response()->json(['verified' => false, 'message' => 'Razorpay is not configured on the server.'], 503);
        }

        $booking = ! empty($data['booking_id'])
            ? Booking::find($data['booking_id'])
            : Booking::where('booking_no', $data['booking_no'])->first();
        if (! $booking) {
            return response()->json(['verified' => false, 'message' => 'Booking not found.'], 404);
        }

        $paymentId = $data['razorpay_payment_id'];

        // Idempotent: same payment already recorded.
        $existing = Payment::where('payment_no', $paymentId)->first();
        if ($existing) {
            if ((int) $existing->booking_id !== (int) $booking->id) {
                return response()->json(['verified' => false, 'message' => 'This payment is already used for another booking.'], 409);
            }

            return response()->json($this->response($booking->fresh(), $existing, true, 'Payment already verified.'));
        }

        // If the app used a Razorpay order, the signature must match.
        if (! empty($data['razorpay_order_id']) || ! empty($data['razorpay_signature'])) {
            $expected = hash_hmac('sha256', ($data['razorpay_order_id'] ?? '').'|'.$paymentId, $secret);
            if (! hash_equals($expected, (string) ($data['razorpay_signature'] ?? ''))) {
                return response()->json(['verified' => false, 'message' => 'Invalid payment signature.'], 422);
            }
        }

        try {
            $gateway = Http::withBasicAuth($keyId, $secret)->timeout(15)
                ->get("https://api.razorpay.com/v1/payments/{$paymentId}");
        } catch (ConnectionException $e) {
            return response()->json(['verified' => false, 'message' => 'Could not reach Razorpay. Please retry.'], 502);
        }

        if ($gateway->status() === 400 || $gateway->status() === 404) {
            return response()->json(['verified' => false, 'message' => 'Payment not found at Razorpay.'], 422);
        }
        if (! $gateway->successful()) {
            return response()->json(['verified' => false, 'message' => 'Razorpay verification failed. Please retry.'], 502);
        }

        $rzp = $gateway->json();

        if (! empty($data['razorpay_order_id']) && ($rzp['order_id'] ?? null) !== $data['razorpay_order_id']) {
            return response()->json(['verified' => false, 'message' => 'Payment does not belong to this order.'], 422);
        }

        // Amount (in paise) must cover the booking total.
        $expectedPaise = (int) round(((float) $booking->amount) * 100);
        if (($rzp['currency'] ?? 'INR') !== 'INR' || (int) ($rzp['amount'] ?? 0) !== $expectedPaise) {
            return response()->json(['verified' => false, 'message' => 'Paid amount does not match the booking amount.'], 422);
        }

        // Authorized-only payments are captured here so the money is actually settled.
        if (($rzp['status'] ?? '') === 'authorized') {
            $capture = Http::withBasicAuth($keyId, $secret)->timeout(15)->asForm()
                ->post("https://api.razorpay.com/v1/payments/{$paymentId}/capture", [
                    'amount' => $rzp['amount'],
                    'currency' => 'INR',
                ]);
            if (! $capture->successful()) {
                return response()->json(['verified' => false, 'message' => 'Payment authorized but capture failed.'], 502);
            }
            $rzp = $capture->json();
        }

        if (($rzp['status'] ?? '') !== 'captured') {
            $status = $rzp['status'] ?? 'unknown';

            return response()->json([
                'verified' => false,
                'status' => $status,
                'message' => $status === 'failed'
                    ? 'Payment failed at Razorpay.'
                    : 'Payment is not completed yet.',
            ], 422);
        }

        $payment = DB::transaction(function () use ($booking, $paymentId, $rzp, $data) {
            $booking = Booking::whereKey($booking->id)->lockForUpdate()->first();

            $payment = Payment::create([
                'payment_no' => $paymentId,
                'booking_id' => $booking->id,
                'customer_name' => $booking->customer_name ?: 'Customer',
                'amount' => $booking->amount,
                'method' => 'razorpay',
                'status' => 'Paid',
                'paid_at' => now(),
                'metadata' => [
                    'booking_no' => $booking->booking_no,
                    'razorpay_payment_id' => $paymentId,
                    'razorpay_order_id' => $data['razorpay_order_id'] ?? ($rzp['order_id'] ?? null),
                    'gateway_method' => $rzp['method'] ?? null,
                    'verified_at' => now()->toISOString(),
                ],
            ]);

            $metadata = $booking->metadata ?? [];
            $metadata['payment'] = array_merge(is_array($metadata['payment'] ?? null) ? $metadata['payment'] : [], [
                'method' => 'razorpay',
                'status' => 'paid_before_booking',
                'receipt' => ['id' => $paymentId, 'method' => 'razorpay', 'status' => 'paid'],
                'verified_at' => now()->toISOString(),
            ]);

            $booking->update([
                'payment_method' => 'razorpay',
                'payment_status' => 'Paid',
                'metadata' => $metadata,
                'timeline' => array_values(array_unique([...($booking->timeline ?? []), 'Payment successful'])),
            ]);

            app(WalletManager::class)->syncBooking($booking->fresh());

            return $payment;
        });

        $booking = $booking->fresh();
        app(BookingCustomerMailer::class)->sendPaymentReceiptForPayment($payment->fresh());

        return response()->json($this->response($booking, $payment, true, 'Payment verified successfully.'));
    }

    private function response(Booking $booking, Payment $payment, bool $verified, string $message): array
    {
        return [
            'verified' => $verified,
            'message' => $message,
            'payment' => [
                'payment_id' => $payment->payment_no,
                'amount' => $payment->amount,
                'status' => $payment->status,
                'paid_at' => $payment->paid_at,
            ],
            'booking' => [
                'id' => $booking->id,
                'booking_no' => $booking->booking_no,
                'status' => $booking->status,
                'payment_status' => $booking->payment_status,
                'payment_method' => $booking->payment_method,
            ],
        ];
    }
}
