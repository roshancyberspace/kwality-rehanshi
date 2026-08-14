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
        'booking_no' => ['nullable', 'string', 'max:100'],
        'customer_name' => ['nullable', 'string', 'max:255'],
        'amount' => ['required', 'numeric'],
        'method' => ['nullable', 'string', 'max:100'],
        'status' => ['nullable', 'string', 'max:100'],
        'refund_status' => ['nullable', 'string', 'max:100'],
        'paid_at' => ['nullable', 'date'],
        'metadata' => ['nullable', 'array'],
    ];

    public function store(Request $request)
    {
        $this->sanitizeBookingId($request);

        $record = DB::transaction(function () use ($request) {
            $payment = Payment::create($this->preparePaymentData($this->validatedData($request), true));
            $this->syncBookingPayment($payment->fresh());

            return $payment->fresh();
        });

        app(BookingCustomerMailer::class)->sendPaymentReceiptForPayment($record->fresh());

        return response()->json($record, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $this->sanitizeBookingId($request);

        $record = DB::transaction(function () use ($request, $id, &$previousStatus) {
            $payment = Payment::findOrFail($id);
            $previousStatus = $payment->status;
            $payment->update($this->preparePaymentData($this->validatedData($request), false));
            $payment = $payment->fresh();
            $this->syncBookingPayment($payment);

            return $payment;
        });

        if ($previousStatus !== $record->status) {
            app(BookingCustomerMailer::class)->sendPaymentReceiptForPayment($record);
        }

        return response()->json($record);
    }

    private function sanitizeBookingId(Request $request): void
    {
        $bookingId = $request->input('booking_id');
        if ($bookingId === null || $bookingId === '') {
            return;
        }

        if (! is_numeric($bookingId)) {
            $request->merge(['booking_id' => null]);
        }
    }

    private function preparePaymentData(array $data, bool $isCreate): array
    {
        if (isset($data['booking_id']) && ! is_numeric($data['booking_id'])) {
            $data['booking_id'] = null;
        }

        $bookingNo = $data['booking_no'] ?? data_get($data, 'metadata.booking_no');
        unset($data['booking_no']);
        if ($bookingNo) {
            $data['metadata'] = array_merge(
                is_array($data['metadata'] ?? null) ? $data['metadata'] : [],
                ['booking_no' => $bookingNo]
            );
        }

        $booking = ! empty($data['booking_id']) ? Booking::find($data['booking_id']) : null;

        if ($booking) {
            $data['customer_name'] = $data['customer_name'] ?: $booking->customer_name;
            $data['amount'] = $data['amount'] ?? $booking->amount;
            $data['method'] = $data['method'] ?: $booking->payment_method;
        }

        if ($isCreate && empty($data['payment_no'])) {
            $suffix = $booking?->booking_no ?: ($bookingNo ?: now()->format('ymdHis'));
            $preferred = 'PAY-'.$suffix;
            $data['payment_no'] = Payment::where('payment_no', $preferred)->exists()
                ? 'PAY-'.$suffix.'-'.random_int(100, 999)
                : $preferred;
        }

        if (empty($data['customer_name'])) {
            $data['customer_name'] = 'Customer';
        }

        return $data;
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
