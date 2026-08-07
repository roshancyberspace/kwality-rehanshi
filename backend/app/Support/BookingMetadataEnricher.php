<?php

namespace App\Support;

use App\Models\RateItem;
use App\Models\ServicePackage;

class BookingMetadataEnricher
{
    public function enrich(array $metadata): array
    {
        if (! empty($metadata['items']) && is_array($metadata['items'])) {
            $metadata['items'] = $this->enrichPackageItems($metadata['items']);
        }

        foreach (['vendor_extra_items', 'pending_vendor_extra_items'] as $key) {
            if (! empty($metadata[$key]) && is_array($metadata[$key])) {
                $metadata[$key] = $this->enrichRateItems($metadata[$key]);
            }
        }

        return $metadata;
    }

    private function enrichPackageItems(array $items): array
    {
        $packageIds = collect($items)
            ->flatMap(fn (array $item) => [
                $item['service_package_id'] ?? null,
                $item['id'] ?? null,
            ])
            ->filter()
            ->unique()
            ->values();

        $packages = $packageIds->isEmpty()
            ? collect()
            : ServicePackage::with('service')->whereIn('id', $packageIds)->get()->keyBy('id');

        return array_values(array_map(function (array $item) use ($packages) {
            $packageId = $item['service_package_id'] ?? $item['id'] ?? null;
            $package = $packageId ? $packages->get((int) $packageId) : null;
            $image = $item['image'] ?? $package?->image ?? $package?->service?->image;

            return [
                ...$item,
                'service_package_id' => $packageId ? (int) $packageId : ($item['service_package_id'] ?? null),
                'image' => $image,
            ];
        }, $items));
    }

    private function enrichRateItems(array $items): array
    {
        $rateIds = collect($items)
            ->pluck('rate_item_id')
            ->filter()
            ->unique()
            ->values();

        $rateItems = $rateIds->isEmpty()
            ? collect()
            : RateItem::whereIn('id', $rateIds)->get()->keyBy('id');

        return array_values(array_map(function (array $item) use ($rateItems) {
            $rateId = $item['rate_item_id'] ?? null;
            $rate = $rateId ? $rateItems->get((int) $rateId) : null;
            $image = $item['image'] ?? $rate?->image;

            return [
                ...$item,
                'rate_item_id' => $rateId ? (int) $rateId : ($item['rate_item_id'] ?? null),
                'image' => $image,
            ];
        }, $items));
    }
}
