<?php

namespace App\Support;

use App\Models\Coupon;
use App\Models\ServicePackage;
use Illuminate\Validation\ValidationException;

class CouponDiscountResolver
{
    /**
     * @param  array<int, array{id?: int|string, quantity?: int|string}>  $items
     */
    public function resolve(string $code, float $subtotal, array $items = []): array
    {
        $coupon = Coupon::query()
            ->whereRaw('LOWER(code) = ?', [strtolower(trim($code))])
            ->where('status', 'Active')
            ->first();

        if (! $coupon) {
            throw ValidationException::withMessages([
                'code' => 'Coupon not found or inactive.',
            ]);
        }

        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => 'Coupon has expired.',
            ]);
        }

        $eligibleSubtotal = $this->eligibleSubtotal($coupon, $subtotal, $items);

        if ((float) $coupon->minimum_order > $eligibleSubtotal) {
            throw ValidationException::withMessages([
                'code' => "Minimum order for this coupon is Rs. {$coupon->minimum_order}.",
            ]);
        }

        $rawValue = (float) preg_replace('/[^\d.]/', '', (string) $coupon->value);
        $discount = strcasecmp((string) $coupon->type, 'Percentage') === 0
            ? round($eligibleSubtotal * $rawValue / 100, 2)
            : $rawValue;
        $discount = min($eligibleSubtotal, max(0, round($discount, 2)));

        return [
            'discount' => $discount,
            'coupon' => [
                'code' => $coupon->code,
                'discount' => $discount,
                'type' => $coupon->type,
                'value' => $coupon->value,
                'minimum_order' => $coupon->minimum_order,
                'expires_at' => $coupon->expires_at,
                'status' => $coupon->status,
                'applies_to' => $coupon->applies_to ?: 'all',
                'category_ids' => $coupon->normalizedIdList('category_ids'),
                'service_ids' => $coupon->normalizedIdList('service_ids'),
                'service_package_ids' => $coupon->normalizedIdList('service_package_ids'),
                'scope_summary' => $coupon->scope_summary,
                'eligible_subtotal' => $eligibleSubtotal,
            ],
        ];
    }

    /**
     * @param  array<int, array{id?: int|string, quantity?: int|string}>  $items
     */
    private function eligibleSubtotal(Coupon $coupon, float $subtotal, array $items): float
    {
        $appliesTo = strtolower((string) ($coupon->applies_to ?: 'all'));

        if ($appliesTo === 'all') {
            return round(max(0, $subtotal), 2);
        }

        if ($items === []) {
            throw ValidationException::withMessages([
                'code' => 'Add cart items to apply this coupon.',
            ]);
        }

        $targetIds = match ($appliesTo) {
            'category' => $coupon->normalizedIdList('category_ids'),
            'service' => $coupon->normalizedIdList('service_ids'),
            'package' => $coupon->normalizedIdList('service_package_ids'),
            default => [],
        };

        if ($targetIds === []) {
            throw ValidationException::withMessages([
                'code' => 'This coupon has no valid targets configured.',
            ]);
        }

        $packageIds = collect($items)
            ->map(fn ($item) => (int) ($item['id'] ?? 0))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $packages = ServicePackage::query()
            ->with('service:id,category_id')
            ->whereIn('id', $packageIds)
            ->get()
            ->keyBy('id');

        $eligible = 0.0;
        foreach ($items as $item) {
            $packageId = (int) ($item['id'] ?? 0);
            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            $package = $packages->get($packageId);

            if (! $package) {
                continue;
            }

            $matches = match ($appliesTo) {
                'category' => in_array((int) ($package->service?->category_id ?? 0), $targetIds, true),
                'service' => in_array((int) $package->service_id, $targetIds, true),
                'package' => in_array((int) $package->id, $targetIds, true),
                default => false,
            };

            if ($matches) {
                $eligible += ((float) $package->price) * $quantity;
            }
        }

        $eligible = round($eligible, 2);

        if ($eligible <= 0) {
            $label = match ($appliesTo) {
                'category' => 'selected categories',
                'service' => 'selected services',
                'package' => 'selected packages',
                default => 'eligible items',
            };

            throw ValidationException::withMessages([
                'code' => "This coupon is only valid for {$label}.",
            ]);
        }

        return $eligible;
    }
}
