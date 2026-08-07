<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\VendorJob;

class BookingExtraItemsManager
{
    public function recalculateAmount(Booking $booking, ?array $approvedExtras = null): float
    {
        $metadata = $booking->metadata ?? [];
        $approvedExtras ??= $metadata['vendor_extra_items'] ?? [];

        $subtotal = $this->lineItemsSubtotal($metadata['items'] ?? [])
            + $this->lineItemsSubtotal($approvedExtras);

        $serviceFee = round((float) ($metadata['service_fee'] ?? ($subtotal > 0 ? 49 : 0)), 2);
        $discount = round((float) data_get($metadata, 'coupon.discount', 0), 2);
        $tipAmount = round((float) ($booking->tip_amount ?? $metadata['tip_amount'] ?? 0), 2);

        return max(0, round($subtotal + $serviceFee + $tipAmount - $discount, 2));
    }

    public function lineItemsSubtotal(array $items): float
    {
        $subtotal = 0;

        foreach ($items as $item) {
            $price = (float) ($item['price'] ?? 0);
            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            $subtotal += round($price * $quantity, 2);
        }

        return round($subtotal, 2);
    }

    public function syncApprovedExtraItems(Booking $booking, array $approvedExtras): void
    {
        $booking->extraItems()->delete();

        foreach ($approvedExtras as $item) {
            $booking->extraItems()->create([
                'name' => $item['name'] ?? $item['service_name'] ?? 'Extra item',
                'price' => isset($item['price']) ? (float) $item['price'] : 0,
                'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
            ]);
        }
    }

    public function syncPendingToVendorJob(Booking $booking): void
    {
        $metadata = $booking->metadata ?? [];
        $job = VendorJob::query()->where('job_no', $booking->booking_no)->first();

        if (! $job) {
            return;
        }

        $jobMetadata = $job->metadata ?? [];
        $jobMetadata['pending_vendor_extra_items'] = $metadata['pending_vendor_extra_items'] ?? [];
        $jobMetadata['vendor_extra_items'] = $metadata['vendor_extra_items'] ?? [];

        $job->update(['metadata' => $jobMetadata]);
    }

    public function syncApprovedToVendorJob(Booking $booking, float $amount): void
    {
        $metadata = $booking->metadata ?? [];
        $job = VendorJob::query()->where('job_no', $booking->booking_no)->first();

        if (! $job) {
            return;
        }

        $jobMetadata = $job->metadata ?? [];
        $jobMetadata['vendor_extra_items'] = $metadata['vendor_extra_items'] ?? [];
        $jobMetadata['pending_vendor_extra_items'] = [];

        $job->update([
            'amount' => $amount,
            'metadata' => $jobMetadata,
        ]);
    }
}
