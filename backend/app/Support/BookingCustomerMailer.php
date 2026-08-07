<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\CustomerProfile;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

class BookingCustomerMailer
{
    public function sendBookingConfirmation(Booking $booking): void
    {
        $this->sendForBooking(
            $booking,
            'booking_confirmation',
            "Booking confirmed: {$booking->booking_no}",
            $this->bookingConfirmationHtml($booking),
            "Your KwalityCarebooking {$booking->booking_no} for {$booking->service_name} has been received. Service OTP: {$this->serviceOtp($booking)}. Amount: Rs. {$this->money($booking->amount)}.",
        );
    }

    public function sendPaymentReceipt(Booking $booking): void
    {
        if (! $this->isPaid($booking->payment_status)) {
            return;
        }

        $this->sendForBooking(
            $booking,
            'payment_receipt',
            "Payment received: {$booking->booking_no}",
            $this->paymentReceiptHtml($booking),
            "Payment received for booking {$booking->booking_no}. Amount paid: Rs. {$this->money($booking->amount)}.",
        );
    }

    public function sendPaymentReceiptForPayment(Payment $payment): void
    {
        if (! $this->isPaid($payment->status)) {
            return;
        }

        $booking = $payment->booking_id ? Booking::find($payment->booking_id) : null;
        $customer = $booking ? $this->customerForBooking($booking) : $this->customerForPayment($payment);
        $email = $customer?->email ?: data_get($payment->metadata, 'customer_email');

        if (! $email) {
            Log::info('Payment receipt mail skipped: customer email not found', [
                'payment_id' => $payment->id,
                'booking_id' => $payment->booking_id,
            ]);

            return;
        }

        $customerName = $customer?->name ?: $payment->customer_name;
        $subject = 'Payment receipt: '.($payment->payment_no ?: 'KwalityCarepayment');
        $this->deliver(
            $email,
            $customerName,
            $subject,
            $this->paymentModelReceiptHtml($payment, $booking, $customerName),
            "Payment received. Receipt: {$payment->payment_no}. Amount paid: Rs. {$this->money($payment->amount)}.",
            'payment_receipt',
            ['payment_id' => $payment->id, 'booking_id' => $payment->booking_id],
        );
    }

    public function sendStatusUpdate(Booking $booking, ?string $previousStatus = null): void
    {
        if ($previousStatus && $previousStatus === $booking->status) {
            return;
        }

        $mailDetails = $this->statusMailDetails($booking);
        if (! $mailDetails) {
            return;
        }

        $this->sendForBooking(
            $booking,
            $mailDetails['type'],
            $mailDetails['subject'],
            $this->statusUpdateHtml($booking, $previousStatus),
            $mailDetails['text'],
        );
    }

    private function sendForBooking(Booking $booking, string $type, string $subject, string $html, string $text): void
    {
        $customer = $this->customerForBooking($booking);
        $email = $customer?->email ?: data_get($booking->metadata, 'customer_email');

        if (! $email) {
            Log::info('Booking customer mail skipped: customer email not found', [
                'booking_id' => $booking->id,
                'booking_no' => $booking->booking_no,
                'type' => $type,
            ]);

            return;
        }

        $this->deliver(
            $email,
            $customer?->name ?: $booking->customer_name,
            $subject,
            $html,
            $text,
            $type,
            ['booking_id' => $booking->id, 'booking_no' => $booking->booking_no],
        );
    }

    private function deliver(string $toEmail, string $customerName, string $subject, string $html, string $text, string $type, array $context): void
    {
        \App\Jobs\SendCustomerEmailJob::dispatch(
            $toEmail,
            $customerName,
            $subject,
            $html,
            $text,
            $type,
            $context
        );
    }

    private function customerForBooking(Booking $booking): ?CustomerProfile
    {
        $customerId = data_get($booking->metadata, 'customer_id');

        if ($customerId) {
            return CustomerProfile::find($customerId);
        }

        return CustomerProfile::query()
            ->when($booking->customer_phone, fn ($query) => $query->where('phone', $booking->customer_phone))
            ->when(!$booking->customer_phone, fn ($query) => $query->where('name', $booking->customer_name))
            ->latest('id')
            ->first();
    }

    private function customerForPayment(Payment $payment): ?CustomerProfile
    {
        return CustomerProfile::query()
            ->where('name', $payment->customer_name)
            ->latest('id')
            ->first();
    }

    private function bookingConfirmationHtml(Booking $booking): string
    {
        return $this->layout($booking, 'Booking confirmation', [
            ['Booking ID', $booking->booking_no],
            ['Service', $booking->service_name],
            ['Schedule', optional($booking->scheduled_at)->format('d M Y, h:i A') ?: 'Schedule pending'],
            ['Address', $booking->address ?: 'Address not added'],
            ['Service OTP', $this->serviceOtp($booking)],
            ['Payment', trim(($booking->payment_method ?: 'Payment') . ' / ' . ($booking->payment_status ?: 'Pending'))],
            ['Amount', 'Rs. '.$this->money($booking->amount)],
            ['Status', $booking->status],
        ], 'We have received your booking request. Share the service OTP only after the professional reaches your service address.');
    }

    private function paymentReceiptHtml(Booking $booking): string
    {
        return $this->layout($booking, 'Payment successful', [
            ['Booking ID', $booking->booking_no],
            ['Service', $booking->service_name],
            ['Payment method', $booking->payment_method ?: 'Online'],
            ['Paid amount', 'Rs. '.$this->money($booking->amount)],
            ['Payment status', $booking->payment_status],
        ], 'This email is your payment slip for the booking.');
    }

    private function paymentModelReceiptHtml(Payment $payment, ?Booking $booking, string $customerName): string
    {
        $bookingNumber = $booking?->booking_no ?: data_get($payment->metadata, 'booking_no', 'Not linked');

        return $this->baseHtml($customerName, 'Payment successful', [
            ['Receipt no', $payment->payment_no ?: 'Not available'],
            ['Booking ID', $bookingNumber],
            ['Payment method', $payment->method ?: 'Payment'],
            ['Paid amount', 'Rs. '.$this->money($payment->amount)],
            ['Payment status', $payment->status],
            ['Paid at', optional($payment->paid_at)->format('d M Y, h:i A') ?: now()->format('d M Y, h:i A')],
        ], 'This email is your payment slip.');
    }

    private function statusUpdateHtml(Booking $booking, ?string $previousStatus): string
    {
        $statusLine = $previousStatus
            ? "{$previousStatus} to {$booking->status}"
            : $booking->status;

        return $this->layout($booking, 'Order status updated', [
            ['Booking ID', $booking->booking_no],
            ['Service', $booking->service_name],
            ['Status', $statusLine],
            ['Professional', $booking->professional_name ?: 'Assigning soon'],
            ['Schedule', optional($booking->scheduled_at)->format('d M Y, h:i A') ?: 'Schedule pending'],
        ], 'We will keep sending important updates until your service is completed.');
    }

    private function statusMailDetails(Booking $booking): ?array
    {
        $status = strtolower(trim((string) $booking->status));
        $reason = data_get($booking->metadata, 'approval.reason');

        if (in_array($status, ['professional assigned', 'vendor assigned'], true)) {
            return [
                'type' => 'vendor_assigned',
                'subject' => "Vendor assigned: {$booking->booking_no}",
                'text' => "A service professional has been assigned for booking {$booking->booking_no}.",
            ];
        }

        if (in_array($status, ['completed', 'service completed'], true)) {
            return [
                'type' => 'service_completed',
                'subject' => "Service completed: {$booking->booking_no}",
                'text' => "Your KwalityCarebooking {$booking->booking_no} has been completed.",
            ];
        }

        if ($status === 'rejected') {
            $reasonText = $reason ? " Reason: {$reason}." : '';

            return [
                'type' => 'booking_rejected',
                'subject' => "Booking rejected: {$booking->booking_no}",
                'text' => "Your KwalityCarebooking {$booking->booking_no} has been rejected.{$reasonText}",
            ];
        }

        return null;
    }

    private function layout(Booking $booking, string $title, array $rows, string $footer): string
    {
        return $this->baseHtml($booking->customer_name, $title, $rows, $footer);
    }

    private function baseHtml(string $customerName, string $title, array $rows, string $footer): string
    {
        $safeName = e($customerName ?: 'Customer');
        $safeTitle = e($title);
        $safeFooter = e($footer);
        $rowHtml = collect($rows)->map(function (array $row) {
            [$label, $value] = $row;

            return '<tr><td style="padding:10px 0;color:#666;font-weight:700;">'.e($label).'</td><td style="padding:10px 0;text-align:right;color:#111;font-weight:700;">'.e((string) $value).'</td></tr>';
        })->implode('');

        return <<<HTML
            <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6; max-width: 620px;">
                <p>Hi {$safeName},</p>
                <h2 style="margin: 0 0 16px; font-size: 24px;">{$safeTitle}</h2>
                <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
                    {$rowHtml}
                </table>
                <p style="margin-top: 18px;">{$safeFooter}</p>
                <p style="color:#666;font-size:13px;">Team Rehanshi</p>
            </div>
        HTML;
    }

    private function isPaid(?string $status): bool
    {
        return in_array(strtolower((string) $status), ['paid', 'success', 'successful', 'completed'], true);
    }

    private function money(mixed $amount): string
    {
        return number_format((float) $amount, 2);
    }

    private function serviceOtp(Booking $booking): string
    {
        return (string) (data_get($booking->metadata, 'service_otp') ?: 'Will be shared soon');
    }
}
