<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\Payment;
use App\Support\BookingCustomerMailer;
use App\Support\WalletManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends CrudController
{
    protected string $model = Payment::class;

    protected string $searchColumn = 'payment_no';

    protected array $rules = [
        'payment_no' => ['nullable', 'string', 'max:100'],
        'booking_id' => ['nullable', 'exists:bookings,id'],
        'customer_name' => ['required', 'string', 'max:255'],
        'amount' => ['required', 'numeric'],
        'method' => ['nullable', 'string', 'max:100'],
        'status' => ['nullable', 'string', 'max:100'],
        'refund_status' => ['nullable', 'string', 'max:100'],
        'paid_at' => ['nullable', 'date'],
        'metadata' => ['nullable', 'array'],
    ];

    public function store(Request $request)
    {
        $record = DB::transaction(function () use ($request) {
            $payment = Payment::create($this->validatedData($request));
            $this->syncBookingPayment($payment->fresh());

            return $payment->fresh();
        });

        app(BookingCustomerMailer::class)->sendPaymentReceiptForPayment($record->fresh());

        return response()->json($record, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $record = DB::transaction(function () use ($request, $id, &$previousStatus) {
            $payment = Payment::findOrFail($id);
            $previousStatus = $payment->status;
            $payment->update($this->validatedData($request));
            $payment = $payment->fresh();
            $this->syncBookingPayment($payment);

            return $payment;
        });

        if ($previousStatus !== $record->status) {
            app(BookingCustomerMailer::class)->sendPaymentReceiptForPayment($record);
        }

        return response()->json($record);
    }

    private function syncBookingPayment(Payment $payment): void
    {
        if (! $payment->booking_id) {
            return;
        }

        $booking = Booking::find($payment->booking_id);
        if (! $booking) {
            return;
        }

        $status = strtolower((string) $payment->status);
        $method = $payment->method ?: $booking->payment_method;
        $paymentStatus = in_array($status, ['paid', 'success', 'successful', 'completed'], true)
            ? 'Paid'
            : (strcasecmp((string) $method, 'cash') === 0 ? 'Cash' : $booking->payment_status);

        $booking->update([
            'payment_method' => $method,
            'payment_status' => $paymentStatus,
        ]);

        app(WalletManager::class)->syncBooking($booking->fresh());
    }
}
