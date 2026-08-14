<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    protected $invoiceService;

    public function __construct(InvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    public function show($identifier)
    {
        $booking = Booking::where('id', $identifier)
            ->orWhere('booking_no', $identifier)
            ->firstOrFail();

        $status = strtolower((string) $booking->status);
        if (
            str_contains($status, 'cancel')
            || str_contains($status, 'reject')
        ) {
            return response()->json([
                'message' => 'Invoice is not available for cancelled or rejected bookings.',
            ], 422);
        }

        $invoice = $this->invoiceService->generateForBooking($booking);

        return response()->json($invoice);
    }
}
