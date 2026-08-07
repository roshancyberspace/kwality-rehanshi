<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Setting;
use Illuminate\Support\Str;

class InvoiceService
{
    public function generateForBooking(Booking $booking, bool $force = false)
    {
        if (!$force) {
            $existing = Invoice::where('booking_id', $booking->id)->first();
            if ($existing) {
                return $existing;
            }
        }

        $appSettings = $this->getNormalizedSettings();
        $invoiceNumber = Str::upper(Str::random(10));
        
        $existingInvoice = Invoice::where('booking_id', $booking->id)->first();
        if ($existingInvoice) {
            $invoiceNumber = $existingInvoice->invoice_number;
        }

        $bookingForInvoice = clone $booking;
        $bookingForInvoice->load('extraItems');

        $invoice = Invoice::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'invoice_number' => $invoiceNumber,
                'data' => [
                    'appSettings' => $appSettings,
                    'order' => $bookingForInvoice,
                ],
            ]
        );

        return $invoice;
    }

    private function getNormalizedSettings()
    {
        $settings = Setting::all()->groupBy('group');
        $normalized = [];
        
        foreach ($settings as $group => $rows) {
            $normalized[$group] = [];
            foreach ($rows as $item) {
                $metadata = $item->metadata ?? [];
                $enabled = $item->type === 'boolean' 
                    ? ($item->value === '1' || $item->value === true || $item->value === 1) 
                    : ($metadata['enabled'] ?? false);
                
                $normalized[$group][$item->key] = array_merge($metadata, [
                    'enabled' => $enabled,
                    'type' => $item->type,
                    'value' => $item->value,
                ]);
            }
        }
        
        return $normalized;
    }
}
